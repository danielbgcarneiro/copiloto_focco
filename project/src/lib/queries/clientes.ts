import { supabase } from '../supabase';

export async function getClientesPorVendedor(_vendedorId?: string, cidade?: string) {
  // Buscar dados do usuário atual (padrão das outras queries)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Usuário não autenticado');
  }

  // Buscar o cod_vendedor (INTEGER) do usuário atual a partir do UUID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('cod_vendedor')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Vendedor não encontrado');
  }

  // 1. Buscar rotas do vendedor
  const { data: rotasVendedor, error: rotasError } = await supabase
    .from('vendedor_rotas')
    .select('rota')
    .eq('vendedor_id', user.id)
    .eq('ativo', true);

  if (rotasError) {
    console.error('❌ Erro ao buscar rotas do vendedor:', rotasError);
    return [];
  }

  const rotasAtivas = rotasVendedor?.map(r => r.rota) || [];
  if (rotasAtivas.length === 0) {
    console.log('⚠️ Nenhuma rota ativa encontrada para o vendedor');
    return [];
  }

  // 2. Buscar mapeamento cidade -> rota para as rotas ativas do vendedor
  const { data: rotasEstado, error: rotasEstadoError } = await supabase
    .from('rotas_estado')
    .select('codigo_ibge_cidade, rota')
    .in('rota', rotasAtivas);

  if (rotasEstadoError) {
    console.error('❌ Erro ao buscar rotas_estado:', rotasEstadoError);
    return [];
  }

  const cidadeRotaMap = new Map<string, string>();
  rotasEstado?.forEach(re => {
    if (re.codigo_ibge_cidade) {
      cidadeRotaMap.set(re.codigo_ibge_cidade, re.rota);
    }
  });

  let query = supabase
    .from('tabela_clientes')
    .select(`
      codigo_cliente,
      nome_fantasia,
      cidade,
      bairro,
      codigo_ibge_cidade,
      analise_rfm (
        valor_ano_atual,
        meta_ano_atual,
        dias_sem_comprar,
        previsao_pedido
      )
    `)
    .eq('cod_vendedor', profile.cod_vendedor);

  // Adicionar filtro por cidade se especificado (case-insensitive)
  if (cidade) {
    query = query.ilike('cidade', `%${cidade}%`);
  }

  const { data, error } = await query.order('nome_fantasia');
  
  if (error) {
    console.error('Erro ao buscar clientes:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // A relação 'analise_rfm' retorna um objeto, não um array.
  // Também calculamos saldo_meta e percentual_atingimento aqui.
  const clientesFormatados = data.map(cliente => {
    const rfmRaw = cliente.analise_rfm || {};
    
    const metaAnoAtual = rfmRaw.meta_ano_atual || 0;
    const valorAnoAtual = rfmRaw.valor_ano_atual || 0;

    const rotaDoCliente = cliente.codigo_ibge_cidade 
      ? cidadeRotaMap.get(cliente.codigo_ibge_cidade) 
      : undefined;

    // Remover analise_rfm bruto para evitar confusão
    const { analise_rfm, ...clienteData } = cliente;

    return {
      ...clienteData,
      vendedor_uuid: user.id, // Adiciona o vendedor_uuid explicitamente
      rota: rotaDoCliente, // Adiciona a rota mapeada
      analise_rfm: {
        valor_ano_atual: valorAnoAtual,
        meta_ano_atual: metaAnoAtual,
        dias_sem_comprar: rfmRaw.dias_sem_comprar || 0,
        previsao_pedido: rfmRaw.previsao_pedido || 0,
        saldo_meta: metaAnoAtual - valorAnoAtual,
        percentual_atingimento: metaAnoAtual > 0 ? (valorAnoAtual / metaAnoAtual) * 100 : 0,
      }
    };
  });

  // Buscar visitas recentes para todos os clientes
  const codigosClientes = clientesFormatados.map(cliente => cliente.codigo_cliente);
  
  const { data: visitas, error: visitasError } = await supabase
    .from('visitas_clientes')
    .select('codigo_cliente')
    .eq('cod_vendedor', profile.cod_vendedor)
    .eq('status', 'ativo')
    .in('codigo_cliente', codigosClientes)
    .gte('data_visita', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString());

  if (visitasError) {
    console.warn('Erro ao buscar visitas:', visitasError);
  }

  // Criar set de clientes visitados para lookup rápido
  const clientesVisitados = new Set(visitas?.map(v => v.codigo_cliente) || []);

  // Adicionar campo visitado aos dados dos clientes
  const clientesComVisitas = clientesFormatados.map(cliente => ({
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