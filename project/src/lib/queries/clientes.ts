/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import { supabase } from '../supabase';

// Define a interface para os dados RFM retornados pelo Supabase
// Define a interface para os dados RFM retornados pelo Supabase
interface AnaliseRfmData {
  valor_ano_atual?: number;
  meta_ano_atual?: number;
  dias_sem_comprar?: number;
  previsao_pedido?: number;
  perfil?: string;
}

type ClienteBase = {
  codigo_cliente: number;
  nome_fantasia: string;
  cidade: string | null;
  bairro: string | null;
  codigo_ibge_cidade: string | null;
};

/**
 * Enriquece uma lista de clientes-base com dados RFM e marca de visita recente.
 * Compartilhado entre o fluxo por-cidade (getClientesPorVendedor) e por-rota
 * (getClientesPorRota) para evitar divergência de payload entre as duas telas.
 *
 * @param resolveRota define o campo `rota` de cada cliente (depende do fluxo).
 */
async function enriquecerComRfmEVisitas(
  clientesBase: ClienteBase[],
  userId: string,
  resolveRota: (cliente: ClienteBase) => string | undefined,
) {
  if (clientesBase.length === 0) {
    return [];
  }

  const codigosClientes = clientesBase.map(c => c.codigo_cliente);

  // Buscar dados RFM separadamente
  const { data: rfmData, error: rfmError } = await supabase
    .from('analise_rfm')
    .select('codigo_cliente, valor_ano_atual, meta_ano_atual, dias_sem_comprar, previsao_pedido, perfil')
    .in('codigo_cliente', codigosClientes);

  if (rfmError) {
    console.error('Erro ao buscar analise_rfm:', rfmError);
  }

  const rfmMap = new Map<number, AnaliseRfmData>();
  rfmData?.forEach(rfm => {
    rfmMap.set(rfm.codigo_cliente, rfm);
  });

  const clientesFormatados = clientesBase.map(cliente => {
    const rfmObject: AnaliseRfmData = rfmMap.get(cliente.codigo_cliente) || {};

    const metaAnoAtual = rfmObject?.meta_ano_atual || 0;
    const valorAnoAtual = rfmObject?.valor_ano_atual || 0;

    return {
      ...cliente,
      vendedor_uuid: userId,
      rota: resolveRota(cliente),
      analise_rfm: {
        valor_ano_atual: valorAnoAtual,
        meta_ano_atual: metaAnoAtual,
        dias_sem_comprar: rfmObject?.dias_sem_comprar || 0,
        previsao_pedido: rfmObject?.previsao_pedido || 0,
        saldo_meta: metaAnoAtual > 0 ? metaAnoAtual - valorAnoAtual : 0,
        percentual_atingimento: metaAnoAtual > 0 ? (valorAnoAtual / metaAnoAtual) * 100 : 0,
        perfil: rfmObject?.perfil,
      }
    };
  });

  // Buscar visitas recentes (72h) para marcar clientes já visitados
  const { data: visitas, error: visitasError } = await supabase
    .from('visitas')
    .select('codigo_cliente')
    .eq('vendedor_id', userId)
    .eq('ativo', true)
    .in('codigo_cliente', codigosClientes)
    .gte('data_visita', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString());

  if (visitasError) {
    console.warn('Erro ao buscar visitas:', visitasError);
  }

  const clientesVisitados = new Set(visitas?.map(v => v.codigo_cliente) || []);

  return clientesFormatados.map(cliente => ({
    ...cliente,
    visitado: clientesVisitados.has(cliente.codigo_cliente)
  }));
}

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

  // Buscar clientes sem relação embedded
  let query = supabase
    .from('tabela_clientes')
    .select(`
      codigo_cliente,
      nome_fantasia,
      cidade,
      bairro,
      codigo_ibge_cidade
    `)
    .eq('cod_vendedor', profile.cod_vendedor)
    .not('situacao', 'in', '("I","B")');

  // Adicionar filtro por cidade se especificado (case-insensitive)
  if (cidade) {
    query = query.ilike('cidade', cidade);
  }

  const { data, error } = await query.order('nome_fantasia');

  if (error) {
    console.error('Erro ao buscar clientes:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Enriquecer com RFM + visitas; rota resolvida por cidade (rotas_estado)
  return enriquecerComRfmEVisitas(
    data as ClienteBase[],
    user.id,
    cliente => (cliente.codigo_ibge_cidade ? cidadeRotaMap.get(cliente.codigo_ibge_cidade) : undefined),
  );
}

/**
 * Busca clientes de uma rota específica (incl. macrorregiões de grão bairro).
 *
 * Resolve os códigos de cliente via vw_cliente_rota (bairro-aware, escopada por
 * cod_vendedor), depois busca os dados em tabela_clientes aplicando o filtro de
 * situação I/B — espelhando getRotasCompleto para que a contagem da tela bata
 * exatamente com a do card da rota. NÃO lê os clientes direto da view porque ela
 * inclui inativos (I/B), que não devem aparecer.
 */
export async function getClientesPorRota(rota: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Usuário não autenticado');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('cod_vendedor')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Vendedor não encontrado');
  }

  // 1. Resolver os códigos de cliente da rota via view (escopada por cod_vendedor)
  const { data: clienteRotas, error: viewError } = await supabase
    .from('vw_cliente_rota')
    .select('codigo_cliente')
    .eq('cod_vendedor', profile.cod_vendedor)
    .eq('rota_resolvida', rota);

  if (viewError) {
    console.error('❌ Erro ao resolver clientes da rota:', viewError);
    return [];
  }

  const codigos = clienteRotas?.map(c => c.codigo_cliente) || [];
  if (codigos.length === 0) {
    return [];
  }

  // 2. Buscar dados base aplicando o filtro de situação I/B (paridade com o card)
  const { data, error } = await supabase
    .from('tabela_clientes')
    .select('codigo_cliente, nome_fantasia, cidade, bairro, codigo_ibge_cidade')
    .eq('cod_vendedor', profile.cod_vendedor)
    .in('codigo_cliente', codigos)
    .not('situacao', 'in', '("I","B")')
    .order('nome_fantasia');

  if (error) {
    console.error('Erro ao buscar clientes da rota:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // 3. Enriquecer; a rota é conhecida (a própria macrorregião)
  return enriquecerComRfmEVisitas(data as ClienteBase[], user.id, () => rota);
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

  // Lê da tabela 'visitas' (nova) onde registrarVisita grava — inclui campo resultado
  const { data, error } = await supabase
    .from('visitas')
    .select('data_visita, resultado, observacoes, ativo')
    .eq('codigo_cliente', codigoCliente)
    .eq('vendedor_id', user.id)
    .eq('ativo', true)
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
    return 'card-perigo border-red-200';
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
    return 'card-alerta border-yellow-200';
  }
  
  // Verde - Ações de manutenção
  if (
    acao.includes('manter') ||
    acao.includes('foco total') ||
    acao.includes('foco em') ||
    acao.includes('primeira venda')
  ) {
    return 'card-ok border-green-200';
  }
  
  return 'bg-gray-50';
}