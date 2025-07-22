import { supabase } from '../supabase';

export interface CidadeCompleta {
  cidade: string;
  rota: string;
  total_oticas: number;
  // Campos antigos (manter por compatibilidade)
  oticas_ativas: number;
  oticas_pendentes: number;
  oticas_inadimplentes: number;
  // Novos campos exclusivos
  status_ativo: number;
  status_pendente: number;
  status_inativo: number;
  status_inadimplente: number;
  // Financeiros
  soma_oportunidades: number;
  vendido_2025: number;
  saldo_metas: number;
}

// Interface para dados da vw_metricas_por_cidade
export interface MetricasCidade {
  codigo_ibge_cidade: string;
  cidade: string;
  estado: string;
  total_clientes: number;
  soma_oportunidades: number;
  soma_metas: number;
  vendas_ano_atual: number;
  clientes_sem_venda_90d: number;
  clientes_ativos: number;
  clientes_inativos: number;
  clientes_pendencia: number;
  saldo_meta: number;
  atingimento: number;
}

export interface CidadeMapeada {
  nome: string;
  rota: string;
  clientes: {
    AT: number;
    PEN: number;
    INA: number;
  };
  somaOportunidades: number;
  saldoMetas: number;
  clientesSemVenda90d: number;
  totalClientes: number;
  somaMetas: number;
  vendasAnoAtual: number;
  atingimento: number;
}

export async function getCidadesCompleto(rota?: string | null): Promise<CidadeMapeada[]> {
  try {
    console.log('🏙️ Buscando cidades...', { rota });
    
    // Verificar sessão antes de fazer consulta
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Erro ao obter sessão:', sessionError)
      throw new Error('Erro de autenticação: ' + sessionError.message)
    }
    
    if (!session) {
      console.error('❌ Usuário não autenticado')
      throw new Error('Usuário não autenticado')
    }
    
    console.log('🔐 Sessão ativa:', {
      userId: session.user.id,
      email: session.user.email
    });
    
    // Buscar dados da vw_cidades_completo com filtro por rota
    let queryCidades = supabase
      .from('vw_cidades_completo')
      .select('*')
      .eq('vendedor_uuid', session.user.id);
    
    // Aplicar filtro por rota se especificado
    if (rota === null) {
      // Filtrar cidades sem rota mas com clientes
      queryCidades = queryCidades.is('rota', null).gt('total_oticas', 0);
    } else if (rota) {
      queryCidades = queryCidades.eq('rota', rota);
    }
    
    const { data: cidadesCompleto, error: errorCidades } = await queryCidades.order('cidade', { ascending: true });
    
    if (errorCidades) {
      console.error('❌ Erro ao buscar cidades:', errorCidades);
      throw errorCidades;
    }
    
    if (!cidadesCompleto || cidadesCompleto.length === 0) {
      console.log('⚠️ Nenhuma cidade encontrada para esta rota');
      return [];
    }
    
    // Buscar dados adicionais da vw_metricas_por_cidade
    const cidades = cidadesCompleto.map(c => c.cidade);
    const { data: metricas, error: errorMetricas } = await supabase
      .from('vw_metricas_por_cidade')
      .select('*')
      .in('cidade', cidades);
    
    if (errorMetricas) {
      console.error('❌ Erro ao buscar métricas:', errorMetricas);
      // Não vamos lançar erro aqui, apenas logar
    }
    
    // Criar um mapa de métricas por cidade
    const metricasMap = new Map<string, MetricasCidade>();
    if (metricas) {
      metricas.forEach(m => metricasMap.set(m.cidade, m));
    }
    
    // Mapear dados combinando as duas views
    const cidadesMapeadas: CidadeMapeada[] = cidadesCompleto.map((cidade: CidadeCompleta) => {
      const metricaCidade = metricasMap.get(cidade.cidade);
      
      return {
        nome: cidade.cidade,
        rota: cidade.rota || 'SEM ROTA',
        clientes: {
          AT: cidade.status_ativo || 0,
          PEN: cidade.status_pendente || 0,
          INA: (cidade.status_inativo || 0) + (cidade.status_inadimplente || 0)
        },
        somaOportunidades: cidade.soma_oportunidades || 0,
        saldoMetas: cidade.saldo_metas || 0,
        clientesSemVenda90d: metricaCidade?.clientes_sem_venda_90d || ((cidade.total_oticas || 0) - (cidade.oticas_ativas || 0)),
        totalClientes: cidade.total_oticas || 0,
        somaMetas: metricaCidade?.soma_metas || 0,
        vendasAnoAtual: metricaCidade?.saldo_meta || 0,
        atingimento: metricaCidade?.atingimento || 0
      };
    });
    
    return cidadesMapeadas;
  } catch (error) {
    console.error('Erro ao buscar cidades completo:', error);
    throw error;
  }
}

// Função auxiliar para formatação de moeda
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor);
}

// Função auxiliar para normalizar texto (remoção de acentos)
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/gi, '') // Remove caracteres especiais exceto espaços
    .toLowerCase()
    .trim();
}