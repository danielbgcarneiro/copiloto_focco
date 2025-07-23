import { supabase } from '../supabase';

export async function getClientesPorVendedor(_vendedorId?: string, cidade?: string) {
  // Buscar dados do usuário atual (padrão das outras queries)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Usuário não autenticado');
  }

  console.log('👥 Buscando clientes para vendedor:', { 
    userId: user.id, 
    userIdType: typeof user.id,
    cidade, 
    cidadeOriginal: cidade 
  });

  // Sempre usar vw_clientes_completo - RLS cuida do filtro
  let query = supabase
    .from('vw_clientes_completo')
    .select(`
      codigo_cliente,
      nome_fantasia,
      cidade,
      bairro,
      rota,
      vendedor_uuid,
      valor_vendas_ano_atual,
      meta_ano_atual,
      percentual_atingimento,
      status_financeiro,
      dias_sem_comprar,
      oportunidade,
      saldo_meta,
      valor_limite_credito,
      acao_recomendada,
      ultima_visita_data
    `)
    .eq('vendedor_uuid', user.id)
    .not('vendedor_uuid', 'is', null); // Garantir que tem vendedor

  // Adicionar filtro por cidade se especificado (case-insensitive)
  if (cidade) {
    query = query.ilike('cidade', cidade);
  }

  console.log('🚀 EXECUTANDO QUERY...', { temFiltoCidade: !!cidade });

  const { data, error } = await query.order('nome_fantasia');
  
  const vendedoresUnicos = data ? [...new Set(data.map(c => c.vendedor_uuid))] : [];
  const matchUsuario = data ? data.filter(c => c.vendedor_uuid === user.id).length : 0;
  const outrosVendedores = data ? data.filter(c => c.vendedor_uuid !== user.id).length : 0;
  
  console.log('📊 RESULTADO DA QUERY:', { 
    error, 
    dataCount: data?.length || 0, 
    primeirosDados: data?.slice(0, 2),
    vendedoresUnicos,
    usuarioAtual: user.id,
    matchUsuario,
    outrosVendedores,
    rlsStatus: outrosVendedores === 0 ? '✅ RLS OK' : '❌ RLS FALHOU'
  });
  
  if (error) {
    console.error('Erro ao buscar clientes:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Buscar visitas recentes para todos os clientes
  const codigosClientes = data.map(cliente => cliente.codigo_cliente);
  
  // Buscar o cod_vendedor (INTEGER) do usuário atual
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('cod_vendedor')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    console.warn('Erro ao buscar cod_vendedor:', userError);
    // Retornar clientes sem campo visitado se não conseguir buscar vendedor
    return data.map(cliente => ({ ...cliente, visitado: false }));
  }

  const { data: visitas, error: visitasError } = await supabase
    .from('visitas_clientes')
    .select('codigo_cliente')
    .eq('cod_vendedor', userData.cod_vendedor)
    .eq('status', 'ativo')
    .in('codigo_cliente', codigosClientes)
    .gte('data_visita', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString());

  if (visitasError) {
    console.warn('Erro ao buscar visitas:', visitasError);
  }

  // Criar set de clientes visitados para lookup rápido
  const clientesVisitados = new Set(visitas?.map(v => v.codigo_cliente) || []);

  // Adicionar campo visitado aos dados dos clientes
  const clientesComVisitas = data.map(cliente => ({
    ...cliente,
    visitado: clientesVisitados.has(cliente.codigo_cliente)
  }));
  
  return clientesComVisitas;
}

// Função para fazer check-in de visita - SIMPLIFICADA
export async function fazerCheckInVisita(codigoCliente: number) {
  console.log('🚀 INICIANDO fazerCheckInVisita para cliente:', codigoCliente);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.log('❌ Erro de autenticação:', authError);
    throw new Error('Usuário não autenticado');
  }
  
  console.log('✅ Usuário autenticado:', user.id);

  // Buscar o cod_vendedor (INTEGER) do usuário atual
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('cod_vendedor')
    .eq('id', user.id)
    .single();
    
  console.log('📋 Resultado busca profile:', { userData, userError });

  if (userError || !userData) {
    console.error('Erro ao buscar cod_vendedor:', userError);
    throw new Error('Erro ao identificar vendedor');
  }

  // DEBUG conforme solicitado
  console.log('Debug Check-in:', {
    codigo_cliente: codigoCliente,
    cod_vendedor: userData?.cod_vendedor,
    hasUser: !!userData,
    userData: userData
  });

  // Garantir que temos o cod_vendedor
  if (!userData?.cod_vendedor) {
    console.error('Usuário sem cod_vendedor');
    throw new Error('Erro: vendedor não identificado');
  }

  // Se chegou até aqui, cliente já foi validado pelo RLS da consulta inicial
  console.log('✅ Procedendo com INSERT...');

  // INSERT simples - sem RPC, sem UPSERT
  const { data, error } = await supabase
    .from('visitas_clientes')
    .insert({
      codigo_cliente: codigoCliente,
      cod_vendedor: userData.cod_vendedor,
      status: 'ativo'
    })
    .select();

  if (error) {
    console.error('Erro ao registrar visita:', error);
    throw error;
  }

  console.log('✅ Visita registrada com sucesso:', data);
  return data;
}

// Função para cancelar visita (check-out) - SIMPLIFICADA
export async function cancelarVisita(codigoCliente: number) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Usuário não autenticado');
  }

  // Buscar o cod_vendedor (INTEGER) do usuário atual
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('cod_vendedor')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    console.error('Erro ao buscar cod_vendedor:', userError);
    throw new Error('Erro ao identificar vendedor');
  }

  // Garantir que temos o cod_vendedor
  if (!userData?.cod_vendedor) {
    console.error('Usuário sem cod_vendedor');
    throw new Error('Erro: vendedor não identificado');
  }

  // Buscar última visita ativa para cancelar
  const { data: visita, error: findError } = await supabase
    .from('visitas_clientes')
    .select('id')
    .eq('codigo_cliente', codigoCliente)
    .eq('cod_vendedor', userData.cod_vendedor)
    .eq('status', 'ativo')
    .order('data_visita', { ascending: false })
    .limit(1)
    .single();

  if (findError || !visita) {
    console.error('Nenhuma visita ativa encontrada:', findError);
    throw new Error('Nenhuma visita ativa encontrada');
  }

  // Atualizar para cancelado
  const { data, error } = await supabase
    .from('visitas_clientes')
    .update({
      status: 'cancelado',
      data_cancelamento: new Date().toISOString()
    })
    .eq('id', visita.id)
    .select();

  if (error) {
    console.error('Erro ao cancelar visita:', error);
    throw error;
  }

  console.log('✅ Visita cancelada com sucesso:', data);
  return data;
}

// Função para buscar histórico de visitas de um cliente
export async function getHistoricoVisitas(codigoCliente: number) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Usuário não autenticado');
  }

  // Buscar o cod_vendedor (INTEGER) do usuário atual
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('cod_vendedor')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    console.error('Erro ao buscar cod_vendedor:', userError);
    return []; // Retornar array vazio se não conseguir buscar vendedor
  }

  const { data, error } = await supabase
    .from('visitas_clientes')
    .select('data_visita, status, cod_vendedor')
    .eq('codigo_cliente', codigoCliente)
    .eq('cod_vendedor', userData.cod_vendedor)
    .order('data_visita', { ascending: false });

  if (error) {
    console.error('Erro ao buscar histórico de visitas:', error);
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