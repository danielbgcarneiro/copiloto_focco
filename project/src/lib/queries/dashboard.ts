import { supabase } from '../supabase';

export interface DashboardMetricas {
  vendas_mes: number;
  oticas_positivadas: number;
  meta_mes: number;
  percentual_meta: number; // Mapeado de percentual_atingimento
}

export interface Top10Cidade {
  cidade: string;
  qtd_oticas: number;
  valor_vendas: number;
  posicao: number;
}

export interface RankingRota {
  rota: string;
  nome_rota: string;
  qtd_oticas: number;
  vendido_2025: number;
  meta_2025: number;
  percentual_meta: number;
  ranking: number;
  saldo_restante: number;
}

export interface Top20Cliente {
  nome: string;
  rota: string;
  meta: number;
  vendido: number;
  percentual: number;
  codigo_cliente: string;
}

export interface DashboardData {
  metricas: DashboardMetricas;
  top10Cidades: Top10Cidade[];
  rankingRotas: RankingRota[];
  top20Clientes: Top20Cliente[];
}

export async function getDashboardMetricas(): Promise<DashboardMetricas> {
  try {
    console.log('📊 Iniciando busca de métricas do dashboard...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    console.log('🔍 ANTES da query - user.id:', user.id);

    // Buscar apenas o vendedor específico diretamente
    const { data, error } = await supabase
      .from('vw_dashboard_metricas')
      .select('*')
      .eq('vendedor_id', user.id)
      .single();
    
    console.log('🔍 DEPOIS da query - error:', error);
    console.log('🔍 DEPOIS da query - data recebido:', data);
    console.log('🔍 VALOR ESPECÍFICO vendas_mes:', data?.vendas_mes, typeof data?.vendas_mes);
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      throw new Error('Nenhuma métrica encontrada para o vendedor');
    }
    
    return {
      vendas_mes: Number(data.vendas_mes || 0),
      oticas_positivadas: Number(data.oticas_positivadas || 0),
      meta_mes: Number(data.meta_mes || 0),
      percentual_meta: Number(data.percentual_atingimento || 0)
    };
  } catch (error) {
    console.error('💥 Erro ao buscar métricas:', error);
    throw error;
  }
}

export async function getTop10Cidades(): Promise<Top10Cidade[]> {
  try {
    console.log('🏙️ Iniciando busca de top 10 cidades...');
    
    // Filtrar por vendedor_uuid
    const { data, error } = await supabase
      .from('vw_top10_cidades')
      .select('*')
      .eq('vendedor_uuid', (await supabase.auth.getUser()).data.user?.id)
      .order('valor_vendas', { ascending: false })
      .limit(10);
    
    console.log('🏙️ Resposta da view vw_top10_cidades:', { 
      dadosCount: data?.length || 0, 
      primeirosDados: data?.slice(0, 3),
      error,
      userId: (await supabase.auth.getUser()).data.user?.id
    });
    
    if (error) {
      console.error('❌ Erro ao buscar top 10 cidades:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ Nenhuma cidade encontrada');
      return [];
    }
    
    // Mapear dados e adicionar posição
    const cidadesComPosicao: Top10Cidade[] = data.map((cidade, index) => ({
      cidade: cidade.cidade,
      qtd_oticas: Number(cidade.qtd_oticas || 0),
      valor_vendas: Number(cidade.valor_vendas || 0),
      posicao: index + 1
    }));
    
    console.log('✅ Top 10 cidades processadas:', cidadesComPosicao.length);
    return cidadesComPosicao;
  } catch (error) {
    console.error('💥 Erro ao buscar top 10 cidades:', error);
    throw error;
  }
}

export async function getRankingRotas(): Promise<RankingRota[]> {
  try {
    console.log('🛣️ Iniciando busca de ranking de rotas...');
    
    // Filtrar por vendedor_uuid
    const { data, error } = await supabase
      .from('vw_ranking_rotas')
      .select('*')
      .eq('vendedor_uuid', (await supabase.auth.getUser()).data.user?.id)
      .order('percentual_meta', { ascending: false });
    
    console.log('🛣️ Resposta da view vw_ranking_rotas:', { 
      dadosCount: data?.length || 0, 
      primeirosDados: data?.slice(0, 3),
      error,
      userId: (await supabase.auth.getUser()).data.user?.id
    });
    
    if (error) {
      console.error('❌ Erro ao buscar ranking de rotas:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ Nenhuma rota encontrada no ranking');
      return [];
    }
    
    // Mapear dados da view para formato esperado
    const rotasRanking: RankingRota[] = data.map(rota => ({
      rota: rota.rota,
      nome_rota: rota.nome_rota || rota.rota,
      qtd_oticas: rota.qtd_oticas || 0,
      vendido_2025: rota.vendido_2025 || 0,
      meta_2025: rota.meta_2025 || 0,
      percentual_meta: rota.percentual_meta || 0,
      ranking: rota.ranking || 0,
      saldo_restante: (rota.meta_2025 || 0) - (rota.vendido_2025 || 0)
    }));
    
    console.log('✅ Ranking de rotas processado:', rotasRanking.length);
    return rotasRanking;
  } catch (error) {
    console.error('💥 Erro ao buscar ranking de rotas:', error);
    throw error;
  }
}

export async function getTop20Clientes(): Promise<Top20Cliente[]> {
  try {
    console.log('🏢 Iniciando busca de top 20 clientes...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('vw_top20_clientes')
      .select('*')
      .eq('vendedor_uuid', user.id)
      .order('valor_vendas_2025', { ascending: false })
      .limit(20);
    
    console.log('🏢 Resposta da view vw_top20_clientes:', { 
      dadosCount: data?.length || 0, 
      primeirosDados: data?.slice(0, 3),
      error,
      userId: user.id
    });
    
    if (error) {
      console.error('❌ Erro ao buscar top 20 clientes:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ Nenhum cliente encontrado');
      return [];
    }
    
    const clientesTop20: Top20Cliente[] = data.map(cliente => ({
      nome: cliente.nome_fantasia,
      rota: cliente.rota || 'Sem rota',
      meta: Number(cliente.meta_2025 || 0),
      vendido: Number(cliente.valor_vendas_2025 || 0),
      percentual: Number(cliente.percentual_atingimento || 0),
      codigo_cliente: cliente.codigo_cliente
    }));
    
    console.log('✅ Top 20 clientes processados:', clientesTop20.length);
    return clientesTop20;
  } catch (error) {
    console.error('💥 Erro ao buscar top 20 clientes:', error);
    throw error;
  }
}

// Função para validar consistência dos dados
export function validarConsistenciaDados(dashboardData: DashboardData): {
  valido: boolean;
  problemas: string[];
} {
  const problemas: string[] = [];
  
  // Validar métricas
  if (!dashboardData.metricas.vendas_mes && dashboardData.metricas.vendas_mes !== 0) {
    problemas.push('Métricas: vendas_mes é undefined');
  }
  
  if (!dashboardData.metricas.oticas_positivadas && dashboardData.metricas.oticas_positivadas !== 0) {
    problemas.push('Métricas: oticas_positivadas é undefined');
  }
  
  // Validar cidades
  if (dashboardData.top10Cidades.length === 0) {
    problemas.push('Top 10 cidades: lista vazia');
  } else {
    dashboardData.top10Cidades.forEach((cidade, index) => {
      if (!cidade.cidade) {
        problemas.push(`Cidade ${index + 1}: nome indefinido`);
      }
      if (cidade.valor_vendas < 0) {
        problemas.push(`Cidade ${cidade.cidade}: valor_vendas negativo`);
      }
    });
  }
  
  // Validar rotas
  if (dashboardData.rankingRotas.length === 0) {
    problemas.push('Ranking rotas: lista vazia');
  } else {
    dashboardData.rankingRotas.forEach((rota, index) => {
      if (!rota.rota) {
        problemas.push(`Rota ${index + 1}: nome indefinido`);
      }
      if (rota.meta_2025 < 0) {
        problemas.push(`Rota ${rota.rota}: meta_2025 negativa`);
      }
      if (rota.percentual_meta < 0 || rota.percentual_meta > 999) {
        problemas.push(`Rota ${rota.rota}: percentual_meta inválido (${rota.percentual_meta}%)`);
      }
    });
  }
  
  // Validar clientes
  if (dashboardData.top20Clientes.length === 0) {
    problemas.push('Top 20 clientes: lista vazia');
  } else {
    dashboardData.top20Clientes.forEach((cliente, index) => {
      if (!cliente.nome) {
        problemas.push(`Cliente ${index + 1}: nome indefinido`);
      }
      if (cliente.meta < 0) {
        problemas.push(`Cliente ${cliente.nome}: meta negativa`);
      }
      if (cliente.vendido < 0) {
        problemas.push(`Cliente ${cliente.nome}: vendido negativo`);
      }
    });
  }
  
  return {
    valido: problemas.length === 0,
    problemas
  };
}

export async function getDashboardCompleto(): Promise<DashboardData> {
  try {
    console.log('🔍 Carregando dados completos do dashboard...');
    
    // Executar todas as queries em paralelo
    const [metricas, top10Cidades, rankingRotas, top20Clientes] = await Promise.all([
      getDashboardMetricas(),
      getTop10Cidades(),
      getRankingRotas(),
      getTop20Clientes()
    ]);
    
    const dashboardData: DashboardData = {
      metricas,
      top10Cidades,
      rankingRotas,
      top20Clientes
    };
    
    // Validar consistência
    const validacao = validarConsistenciaDados(dashboardData);
    
    if (!validacao.valido) {
      console.warn('⚠️ Problemas de consistência encontrados:', validacao.problemas);
    }
    
    console.log('✅ Dados do dashboard carregados:', {
      metricas,
      cidadesCount: top10Cidades.length,
      rotasCount: rankingRotas.length,
      clientesCount: top20Clientes.length,
      validacao: validacao.valido ? 'Válido' : 'Com problemas'
    });
    
    return dashboardData;
  } catch (error) {
    console.error('💥 Erro ao carregar dashboard completo:', error);
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

// Função auxiliar para formatação de valores grandes (K, M)
export function formatarValorGrande(valor: number): string {
  if (valor >= 1000000) {
    return `${(valor / 1000000).toFixed(1)}M`;
  } else if (valor >= 1000) {
    return `${(valor / 1000).toFixed(0)}k`;
  }
  return valor.toString();
}