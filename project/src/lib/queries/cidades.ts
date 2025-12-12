import { supabase } from '../supabase';

export interface CidadeCompleta {
  cidade: string;
  rota: string;
  vendedor_apelido: string;
  vendedor_uuid: string;
  total_oticas: number;
  // Campos de status
  oticas_ativas: number;
  oticas_pendentes: number;
  oticas_inadimplentes: number;
  status_ativo: number;
  status_pendente: number;
  status_inativo: number;
  status_inadimplente: number;
  // Financeiros
  soma_oportunidades: number;
  vendido_2025: number;
  saldo_metas: number;
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
  clientesSemVenda90d: number;
  totalClientes: number;
  somaMetas: number;
  vendido2025: number;
  saldoMetas: number;
  atingimento: number;
}

export async function getCidadesCompleto(rota?: string | null): Promise<CidadeMapeada[]> {
  try {
    console.log('🏙️ Buscando cidades via vw_cidades_completo...', { rota });

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

    // Buscar dados da vw_cidades_completo (única view necessária)
    let queryCidades = supabase
      .from('vw_cidades_completo')
      .select(`
        cidade,
        rota,
        vendedor_apelido,
        vendedor_uuid,
        total_oticas,
        status_ativo,
        status_pendente,
        status_inativo,
        status_inadimplente,
        soma_oportunidades,
        vendido_2025,
        saldo_metas
      `)
      .eq('vendedor_uuid', session.user.id);

    // Aplicar filtro por rota se especificado
    if (rota === null) {
      // Filtrar cidades sem rota mas com clientes
      queryCidades = queryCidades.eq('rota', 'SEM ROTA').gt('total_oticas', 0);
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

    console.log(`✅ ${cidadesCompleto.length} cidades encontradas`);

    // Mapear dados da view para formato esperado pelo componente
    const cidadesMapeadas: CidadeMapeada[] = cidadesCompleto.map((cidade: CidadeCompleta) => {
      // Calcular métricas direto da view vw_cidades_completo
      const somaMetas = cidade.vendido_2025 + cidade.saldo_metas; // meta = vendido + saldo
      const atingimento = somaMetas > 0
        ? (cidade.vendido_2025 / somaMetas) * 100
        : 0;
      const clientesSemVenda90d = cidade.total_oticas - cidade.status_ativo;

      return {
        nome: cidade.cidade,
        rota: cidade.rota || 'SEM ROTA',
        clientes: {
          AT: cidade.status_ativo || 0,
          PEN: cidade.status_pendente || 0,
          INA: (cidade.status_inativo || 0) + (cidade.status_inadimplente || 0)
        },
        somaOportunidades: cidade.soma_oportunidades || 0,
        clientesSemVenda90d: clientesSemVenda90d,
        totalClientes: cidade.total_oticas || 0,
        somaMetas: somaMetas,
        vendido2025: cidade.vendido_2025 || 0,
        saldoMetas: cidade.saldo_metas || 0,
        atingimento: atingimento
      };
    });

    return cidadesMapeadas;
  } catch (error) {
    console.error('💥 Erro ao buscar cidades completo:', error);
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