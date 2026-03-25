/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import { supabase } from '../supabase';

// Interface para tipo de retorno (simplificada para refletir dados disponíveis)
export interface ClienteDetalhes {
  // Dados básicos
  codigo_cliente: number;
  nome_fantasia: string;
  razao_social: string;
  cidade: string;
  bairro: string;
  celular?: string;

  // Dados de RFM (campos confirmados)
  dias_sem_comprar?: number;
  valor_ano_atual?: number;
  valor_ano_anterior?: number;
  meta_ano_atual?: number;
  percentual_atingimento?: number;
  previsao_pedido?: number;
  qtd_compras_ano_anterior?: number;
  qtd_compras_ano_atual?: number;
  perfil?: string;

  // Métricas por categoria
  rx_fem_ob?: number;
  rx_fem_pw?: number;
  rx_mas_ob?: number;
  rx_mas_pw?: number;
  sol_fem_ob?: number;
  sol_fem_pw?: number;
  sol_mas_ob?: number;
  sol_mas_pw?: number;

  // Status financeiro (opcional, indicador de inadimplência)
  status_financeiro?: string;
}

export async function getClienteDetalhes(codigoCliente: number): Promise<ClienteDetalhes> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Usuário não autenticado');

    const { data: profile } = await supabase
      .from('profiles')
      .select('cod_vendedor')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Perfil do vendedor não encontrado.');

    // 1. Buscar dados básicos de tabela_clientes (sem relação embedded)
    const { data: clienteData, error: clienteError } = await supabase
      .from('tabela_clientes')
      .select(`
        codigo_cliente,
        nome_fantasia,
        razao_social,
        cidade,
        bairro,
        celular
      `)
      .eq('codigo_cliente', codigoCliente)
      .eq('cod_vendedor', profile.cod_vendedor)
      .single();

    if (clienteError) throw clienteError;
    if (!clienteData) throw new Error('Cliente não encontrado ou sem permissão.');

    // 2. Buscar dados RFM separadamente
    const { data: rfmData, error: rfmError } = await supabase
      .from('analise_rfm')
      .select(`
        dias_sem_comprar,
        valor_ano_atual,
        valor_ano_anterior,
        meta_ano_atual,
        percentual_atingimento,
        previsao_pedido,
        qtd_compras_ano_anterior,
        qtd_compras_ano_atual,
        perfil
      `)
      .eq('codigo_cliente', codigoCliente)
      .maybeSingle();

    if (rfmError) {
      console.warn('Dados RFM não disponíveis:', rfmError.message);
    }

    // 3. Buscar métricas de categoria
    const { data: metricasCategoria, error: metricasError } = await supabase
      .from('vw_metricas_categoria_cliente')
      .select('*')
      .eq('codigo_cliente', codigoCliente)
      .maybeSingle();

    if (metricasError) {
      console.warn('Métricas de categoria não disponíveis:', metricasError.message);
    }

    // 4. Combinar os resultados
    const clienteCompleto: ClienteDetalhes = {
      ...clienteData,
      ...(rfmData || {}),
      ...(metricasCategoria || {})
    };

    return clienteCompleto;

  } catch (error) {
    console.error('❌ Erro em getClienteDetalhes:', error);
    throw error;
  }
}