import { supabase } from '../supabase';

export interface RotaCompleta {
  rota: string;
  vendedor_uuid: string;
  vendedor_apelido: string;
  total_cidades: number;
  total_clientes: number;
  soma_oportunidades: number;
  clientes_sem_venda_90d: number;
  vendido_ano_atual: number;
  meta_ano_atual: number;
  saldo_meta: number;
  percentual_meta: number;
  ranking: number;
}

export interface RotaMapeada {
  nome: string;
  totalCidades: number;
  totalOticas: number;
  somaOportunidades: number;
  semVendas90d: number;
  status: 'Ativo' | 'Inativo';
  metaAnoAtual: number;
  saldoMeta: number;
  percentualMeta: number;
}

export async function getRotasCompleto(): Promise<RotaMapeada[]> {
  try {
    console.log('🛣️ Buscando rotas via vw_v2_metricas_por_rota...');
    
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
    
    // Buscar métricas diretamente da view usando vendedor_uuid (campo correto da view)
    const { data, error: metricsError } = await supabase
      .from('vw_v2_metricas_por_rota')
      .select('*')
      .eq('vendedor_uuid', session.user.id)
      .order('percentual_meta', { ascending: false });
    
    console.log('🛣️ Resposta da view vw_v2_metricas_por_rota:', { 
      dadosCount: data?.length || 0, 
      primeirosDados: data?.slice(0, 3),
      error: metricsError 
    });
    
    if (metricsError) {
      console.error('❌ Erro ao buscar métricas das rotas:', metricsError);
      throw metricsError;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ View vw_v2_metricas_por_rota retornou dados vazios - possível problema de RLS');
      return [];
    }
    
    // Verificação de consistência: comparar com dados de clientes para validar RLS
    console.log('🔍 Verificando consistência dos dados retornados...');
    try {
      const { data: clientesData } = await supabase
        .from('vw_clientes_completo')
        .select('rota')
        .limit(1);
      
      if (clientesData && clientesData.length > 0) {
        const rotaDoCliente = clientesData[0].rota;
        const rotasRetornadas = data.map(r => r.rota);
        
        if (rotaDoCliente && !rotasRetornadas.includes(rotaDoCliente)) {
          console.warn('⚠️ Inconsistência detectada: Rota do cliente não encontrada nas rotas retornadas');
          console.warn('Rota do cliente:', rotaDoCliente);
          console.warn('Rotas retornadas:', rotasRetornadas);
        } else {
          console.log('✅ Consistência verificada: Dados parecem estar corretos');
        }
      }
    } catch (consistencyError) {
      console.warn('⚠️ Erro na verificação de consistência:', consistencyError);
    }
    
    // Mapear dados da view para formato esperado pelo componente
    const rotasMapeadas: RotaMapeada[] = data
      .map((rota: RotaCompleta) => ({
        nome: rota.rota,
        totalCidades: rota.total_cidades || 0,
        totalOticas: rota.total_clientes || 0,
        somaOportunidades: rota.soma_oportunidades || 0,
        semVendas90d: rota.clientes_sem_venda_90d || 0,
        status: 'Ativo' as 'Ativo' | 'Inativo',
        metaAnoAtual: rota.meta_ano_atual || 0,
        saldoMeta: rota.saldo_meta || 0,
        percentualMeta: rota.percentual_meta || 0
      }))
      // Filtrar rotas "Sem Rota" que não têm clientes
      .filter(rota => {
        // IMPORTANTE: "Sem Rota" só deve aparecer se houver CLIENTES (não apenas cidades)
        if (rota.nome === 'Sem Rota' || rota.nome === null || rota.nome === '') {
          const temClientes = rota.totalOticas > 0;
          if (!temClientes) {
            console.log('🚫 Filtrando rota "Sem Rota" porque não há clientes (apenas cidades vazias)');
            return false;
          }
          console.log(`✅ Mantendo rota "Sem Rota" porque tem ${rota.totalOticas} clientes`);
        }
        return true;
      });
    
    console.log(`✅ ${rotasMapeadas.length} rotas processadas (após filtrar rotas vazias)`);
    return rotasMapeadas;
  } catch (error) {
    console.error('💥 Erro ao buscar rotas completo:', error);
    throw error;
  }
}

// Função SEPARADA para buscar métricas detalhadas por cidade
export async function getMetricasDetalhadasPorRota(): Promise<RotaMapeada[]> {
  try {
    console.log('📊 Buscando métricas detalhadas via vw_metricas_por_cidade...');
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Usuário não autenticado');
    
    // 1. Buscar rotas do vendedor
    const { data: rotasVendedor } = await supabase
      .from('vendedor_rotas')
      .select('rota')
      .eq('vendedor_id', session.user.id)
      .eq('ativo', true);
    
    if (!rotasVendedor || rotasVendedor.length === 0) return [];
    
    // 2. Buscar métricas POR CIDADE
    const rotasNomes = rotasVendedor.map(r => r.rota);
    const { data: cidadesData, error } = await supabase
      .from('vw_metricas_por_cidade')
      .select('*')
      .in('rota', rotasNomes);
    
    if (error || !cidadesData) return [];
    
    // 3. AGREGAR por rota
    const rotasAgregadas = cidadesData.reduce((acc: Record<string, RotaMapeada>, cidade: any) => {
      const rotaName = cidade.rota;
      
      if (!acc[rotaName]) {
        acc[rotaName] = {
          nome: rotaName,
          totalCidades: 0,
          totalOticas: 0,
          somaOportunidades: 0,
          semVendas90d: 0,
          status: 'Ativo' as 'Ativo' | 'Inativo',
          metaAnoAtual: 0,
          saldoMeta: 0,
          percentualMeta: 0
        };
      }
      
      acc[rotaName].totalCidades += 1;
      acc[rotaName].totalOticas += cidade.total_clientes || 0;
      acc[rotaName].somaOportunidades += cidade.soma_oportunidades || 0;
      acc[rotaName].semVendas90d += cidade.clientes_sem_venda_90d || 0;
      
      return acc;
    }, {});
    
    return Object.values(rotasAgregadas);
  } catch (error) {
    console.error('💥 Erro ao buscar métricas detalhadas:', error);
    return [];
  }
}

// Função auxiliar para formatação de moeda (reutilizada de cidades.ts)
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor);
}

// Função auxiliar para normalizar texto (reutilizada de cidades.ts)
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/gi, '') // Remove caracteres especiais exceto espaços
    .toLowerCase()
    .trim();
}