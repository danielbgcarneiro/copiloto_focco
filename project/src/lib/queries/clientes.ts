import { supabase } from '../supabase';

export async function getClientesPorVendedor(_vendedorId?: string, cidade?: string) {
  // Buscar dados do usuário atual (padrão das outras queries)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Usuário não autenticado');
  }

  console.log('👥 Buscando clientes para vendedor:', { userId: user.id, cidade });

  // Se há filtro por cidade, buscar TODOS os clientes da cidade
  // Se não há filtro, buscar apenas Top 20
  const viewName = cidade ? 'vw_clientes_completo' : 'vw_top20_clientes';
  
  console.log('🔍 DECISÃO DA VIEW:', { 
    cidade, 
    temCidade: !!cidade, 
    viewEscolhida: viewName 
  });
  
  let query = supabase
    .from(viewName)
    .select(`
      codigo_cliente,
      nome_fantasia,
      cidade,
      bairro,
      rota,
      vendedor_uuid,
      valor_vendas_2025,
      meta_2025,
      percentual_atingimento,
      ${cidade ? 'status_financeiro, dias_sem_comprar, oportunidade, valor_limite_credito, acao_recomendada' : 'ranking'}
    `)
    .eq('vendedor_uuid', user.id);

  // Adicionar filtro por cidade se especificado
  if (cidade) {
    query = query.eq('cidade', cidade);
  }

  console.log('🚀 EXECUTANDO QUERY...', { viewName, temFiltoCidade: !!cidade });

  const { data, error } = await query.order(cidade ? 'nome_fantasia' : 'ranking');
  
  console.log('📊 RESULTADO DA QUERY:', { 
    viewName, 
    error, 
    dataCount: data?.length || 0, 
    primeirosDados: data?.slice(0, 2) 
  });
  
  if (error) {
    console.error('Erro ao buscar clientes:', error);
    throw error;
  }
  
  return data || [];
}

// Função auxiliar para determinar cor de prioridade
export function getCorPrioridade(acaoRecomendada: string): string {
  if (!acaoRecomendada) return 'bg-gray-50';
  
  const acao = acaoRecomendada.toLowerCase();
  
  // Vermelho - Ações urgentes
  if (
    acao.includes('urgente') ||
    acao.includes('bloqueio') ||
    acao.includes('vai perder') ||
    acao.includes('cobrança') ||
    acao.includes('última tentativa') ||
    acao.includes('resolver situação')
  ) {
    return 'bg-red-50 border-red-200';
  }
  
  // Amarelo - Ações de atenção
  if (
    acao.includes('reconquistar') ||
    acao.includes('aumentar frequência') ||
    acao.includes('reativar') ||
    acao.includes('desenvolver') ||
    acao.includes('ação de reativação') ||
    acao.includes('avaliar manutenção')
  ) {
    return 'bg-yellow-50 border-yellow-200';
  }
  
  // Verde - Ações de manutenção
  if (
    acao.includes('manter') ||
    acao.includes('foco total') ||
    acao.includes('foco em') ||
    acao.includes('primeira venda')
  ) {
    return 'bg-green-50 border-green-200';
  }
  
  return 'bg-gray-50';
}