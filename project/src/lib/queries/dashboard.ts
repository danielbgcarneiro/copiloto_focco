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

export interface ClientePerfil {
  codigo_cliente: number;
  nome_fantasia: string;
  cidade_uf: string;
  objetivo: number;
  vendas: number;
  percentual: number;
}

export interface TabelaPerfil {
  perfil: 'ouro' | 'prata' | 'bronze';
  totalClientes: number;
  somaObjetivo: number;
  somaVendas: number;
  percentualGeral: number;
  clientes: ClientePerfil[];
}

export interface DashboardData {
  metricas: DashboardMetricas;
  top10Cidades: Top10Cidade[];
  rankingRotas: RankingRota[];
  tabelasPerfil: TabelaPerfil[];
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
      // Se a view foi removida ou a coluna não existe, log e retornar lista vazia
      console.warn('❌ Erro ao buscar top 10 cidades (retornando lista vazia):', error);
      return [];
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

// Note: top20 clientes view was removed from the backend; related client-side logic
// was simplified. If in future a replacement data source is provided, reintroduce
// appropriate queries here.

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
  
  // Note: Top20 clientes view was removed from backend; client-specific
  // validations were omitted. If a replacement is added, reintroduce checks
  // here.
  
  return {
    valido: problemas.length === 0,
    problemas
  };
}

// Função para buscar clientes de um perfil específico (Ouro, Prata, Bronze)
// Máscaras: Ouro = 30, Prata = 10, Bronze = 5
export async function getTabelaPerfil(perfil: 'ouro' | 'prata' | 'bronze'): Promise<TabelaPerfil> {
  try {
    console.log(`📋 Buscando clientes perfil ${perfil.toUpperCase()}...`);
    
    // Mapear perfil para número
    const perfilMap = {
      ouro: 30,
      prata: 10,
      bronze: 5
    };
    const numeroMascara = perfilMap[perfil];

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    console.log(`🔐 User.id (UUID): ${user.id}`);

    // 1) PRIMEIRO: Buscar o cod_vendedor do perfil do usuário
    console.log(`📋 Buscando profiles para usuário ${user.id}...`);
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('cod_vendedor, apelido')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Erro ao buscar profiles:', profileError);
      return {
        perfil,
        totalClientes: 0,
        somaObjetivo: 0,
        somaVendas: 0,
        percentualGeral: 0,
        clientes: []
      };
    }

    if (!profileData) {
      console.warn(`⚠️ Perfil não encontrado para user.id: ${user.id}`);
      return {
        perfil,
        totalClientes: 0,
        somaObjetivo: 0,
        somaVendas: 0,
        percentualGeral: 0,
        clientes: []
      };
    }

    const codigoVendedor = (profileData as any).cod_vendedor;
    const apelidoVendedor = (profileData as any).apelido;
    console.log(`✅ Código vendedor encontrado: ${codigoVendedor} (${apelidoVendedor})`);

    // 2) SEGUNDO: Buscar clientes do vendedor usando o cod_vendedor
    console.log(`📋 Buscando clientes para cod_vendedor ${codigoVendedor}...`);
    const { data: clientesInfo, error: clientesInfoError } = await supabase
      .from('tabela_clientes')
      .select('codigo_cliente, nome_fantasia, cidade')
      .eq('cod_vendedor', codigoVendedor);

    if (clientesInfoError) {
      console.error(`❌ Erro ao buscar tabela_clientes:`, {
        code: (clientesInfoError as any).code,
        message: (clientesInfoError as any).message
      });
      return {
        perfil,
        totalClientes: 0,
        somaObjetivo: 0,
        somaVendas: 0,
        percentualGeral: 0,
        clientes: []
      };
    }

    if (clientesInfoError) {
      console.error(`❌ Erro ao buscar tabela_clientes:`, {
        code: (clientesInfoError as any).code,
        message: (clientesInfoError as any).message
      });
      return {
        perfil,
        totalClientes: 0,
        somaObjetivo: 0,
        somaVendas: 0,
        percentualGeral: 0,
        clientes: []
      };
    }

    if (!clientesInfo || clientesInfo.length === 0) {
      console.log(`ℹ️ Nenhum cliente encontrado para cod_vendedor ${codigoVendedor}`);
      return {
        perfil,
        totalClientes: 0,
        somaObjetivo: 0,
        somaVendas: 0,
        percentualGeral: 0,
        clientes: []
      };
    }

    console.log(`✅ ${clientesInfo.length} clientes encontrados para ${apelidoVendedor}`);

    const codigosClientes = (clientesInfo as any[]).map((c: any) => c.codigo_cliente);

    // 3) TERCEIRO: Buscar registros em analise_rfm apenas para esses clientes e para o perfil
    console.log(`📊 Buscando dados RFM para perfil ${numeroMascara}...`);
    const { data: rfmData, error: rfmError } = await supabase
      .from('analise_rfm')
      .select('codigo_cliente, meta_ano_atual, valor_ano_atual, percentual_atingimento, perfil')
      .in('codigo_cliente', codigosClientes)
      .eq('perfil', String(numeroMascara))
      .order('valor_ano_atual', { ascending: false });

    if (rfmError) {
      console.error(`❌ Erro ao buscar analise_rfm para perfis (perfil=${numeroMascara}):`, 
        { code: (rfmError as any).code, message: (rfmError as any).message }
      );
      return {
        perfil,
        totalClientes: 0,
        somaObjetivo: 0,
        somaVendas: 0,
        percentualGeral: 0,
        clientes: []
      };
    }

    if (!rfmData || rfmData.length === 0) {
      console.log(`ℹ️ Nenhum registro em analise_rfm para os clientes do vendedor ${user.id} com perfil ${perfil}`);
      return {
        perfil,
        totalClientes: 0,
        somaObjetivo: 0,
        somaVendas: 0,
        percentualGeral: 0,
        clientes: []
      };
    }

    // Mapear dados para o formato esperado juntando com info dos clientes
    const clientesMap = new Map<number, any>();
    (clientesInfo as any[]).forEach(c => clientesMap.set(c.codigo_cliente, c));

    const clientesPerfil: ClientePerfil[] = (rfmData as any[]).map(rfm => {
      const info = clientesMap.get(rfm.codigo_cliente);
      const objetivo = Number(rfm.meta_ano_atual || 0);
      const vendas = Number(rfm.valor_ano_atual || 0);
      const percentual = objetivo > 0 ? (vendas / objetivo) * 100 : 0;

      return {
        codigo_cliente: rfm.codigo_cliente,
        nome_fantasia: info?.nome_fantasia || 'N/A',
        // tabela_clientes may not have 'uf' column; show cidade only as fallback
        cidade_uf: info ? `${info.cidade || 'N/A'}` : 'N/A',
        objetivo,
        vendas,
        percentual: Math.round(percentual * 100) / 100 // 2 casas decimais
      };
    });

    // Calcular totalizadores
    const totalClientes = clientesPerfil.length;
    const somaObjetivo = clientesPerfil.reduce((acc, c) => acc + c.objetivo, 0);
    const somaVendas = clientesPerfil.reduce((acc, c) => acc + c.vendas, 0);
    const percentualGeral = somaObjetivo > 0 ? (somaVendas / somaObjetivo) * 100 : 0;

    console.log(`✅ Perfil ${perfil} carregado:`, {
      totalClientes,
      somaObjetivo,
      somaVendas,
      percentualGeral: Math.round(percentualGeral * 100) / 100
    });

    return {
      perfil,
      totalClientes,
      somaObjetivo,
      somaVendas,
      percentualGeral: Math.round(percentualGeral * 100) / 100,
      clientes: clientesPerfil
    };
  } catch (error) {
    console.error(`💥 Erro ao carregar perfil ${perfil}:`, error);
    throw error;
  }
}

export async function getDashboardCompleto(): Promise<DashboardData> {
  try {
    console.log('🔍 Carregando dados completos do dashboard...');
    
    // Executar todas as queries em paralelo
    const [metricas, top10Cidades, rankingRotas, perfilOuro, perfilPrata, perfilBronze] = await Promise.all([
      getDashboardMetricas(),
      getTop10Cidades(),
      getRankingRotas(),
      getTabelaPerfil('ouro'),
      getTabelaPerfil('prata'),
      getTabelaPerfil('bronze')
    ]);
    
    const dashboardData: DashboardData = {
      metricas,
      top10Cidades,
      rankingRotas,
      tabelasPerfil: [perfilOuro, perfilPrata, perfilBronze]
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
      perfilOuro: perfilOuro.totalClientes,
      perfilPrata: perfilPrata.totalClientes,
      perfilBronze: perfilBronze.totalClientes,
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