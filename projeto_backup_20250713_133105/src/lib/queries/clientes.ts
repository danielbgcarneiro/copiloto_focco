import { supabase } from '../supabase';

export async function getClientesPorVendedor(vendedorId?: string) {
  let query = supabase
    .from('vw_clientes_completo')
    .select(`
      codigo_cliente,
      nome_fantasia,
      status_financeiro,
      dias_sem_comprar,
      oportunidade,
      meta_2025,
      valor_vendas_2025,
      valor_limite_credito,
      bairro,
      acao_recomendada,
      rota,
      cidade,
      percentual_atingimento,
      estrelas
    `)
    .order('nome_fantasia');

  // Se vendedorId fornecido, filtrar por rota do vendedor
  if (vendedorId) {
    // Primeiro buscar as rotas do vendedor
    const { data: rotasVendedor } = await supabase
      .from('vendedor_rotas')
      .select('rota')
      .eq('vendedor_id', vendedorId)
      .eq('ativo', true);
    
    if (rotasVendedor && rotasVendedor.length > 0) {
      const rotas = rotasVendedor.map(r => r.rota);
      query = query.in('rota', rotas);
    }
  }

  const { data, error } = await query;
  
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