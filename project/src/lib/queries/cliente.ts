import { supabase } from '../supabase';

// Interface para tipo de retorno
interface ClienteDetalhes {
  // Dados básicos da view
  codigo_cliente: number;
  nome_fantasia: string;
  razao_social: string;
  cidade: string;
  bairro: string;
  rota: string;
  status_erp: string;
  status_erp_desc: string;
  status_comercial: string;
  status_financeiro: string;
  status_display: string;
  valor_limite_credito: number;
  saldo_utilizado: number;
  limite_disponivel: number;
  dias_sem_comprar: number;
  valor_vendas_2024: number;
  valor_vendas_2025: number;
  meta_2025: number;
  percentual_atingimento: number;
  estrelas: number;
  previsao_pedido: number;
  acao_recomendada: string;
  oportunidade: number;
  // Dados adicionais
  qtd_compras_2024?: number;
  qtd_compras_2025?: number;
  celular?: string;
  produtos_comprados?: any;
  // Métricas por categoria
  rx_fem_ob?: number;
  rx_fem_pw?: number;
  rx_mas_ob?: number;
  rx_mas_pw?: number;
  sol_fem_ob?: number;
  sol_fem_pw?: number;
  sol_mas_ob?: number;
  sol_mas_pw?: number;
}

// Buscar detalhes completos do cliente (RESTAURADO)
export async function getClienteDetalhes(codigoCliente: number): Promise<ClienteDetalhes> {
  try {
    console.log('1️⃣ getClienteDetalhes chamada com:', codigoCliente);
    
    // VERIFICAR SESSÃO ANTES DE QUALQUER QUERY
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
      email: session.user.email,
      token: session.access_token?.substring(0, 20) + '...',
      expiresAt: session.expires_at
    });
    // 1. Buscar dados básicos da view
     const { data: dadosBasicos, error: error1 } = await supabase
      .from('vw_clientes_completo')
      .select('*')
      .eq('codigo_cliente', codigoCliente)
      .single();
      
    console.log('2️⃣ dadosBasicos:', dadosBasicos);
    console.log('2️⃣ error1:', error1);
  
    if (error1) throw error1;

    // 2. Celular já está incluído em dadosBasicos (select '*')
      
    // 3. DEBUGGING AVANÇADO - INTERCEPTAÇÃO DIRETA
    console.log('🚀 DEBUGGING AVANÇADO - Chamando RPC com código:', codigoCliente);
    
    // Primeiro: testar RPC COM filtro por vendedor
    const rpcResponse = await supabase.rpc('get_cliente_detalhes', { 
      p_codigo_cliente: codigoCliente,
      p_vendedor_uuid: session.user.id
    });
    
    console.log('🔥 RESPOSTA RAW DA RPC:', rpcResponse);
    console.log('🔥 TIPO DA RESPOSTA:', typeof rpcResponse);
    console.log('🔥 KEYS DA RESPOSTA:', Object.keys(rpcResponse));
    
    // Segundo: extrair dados específicos
    const produtosData = rpcResponse.data?.[0];
    const errorRpc = rpcResponse.error;
    
    console.log('🔥 DADOS EXTRAÍDOS:', produtosData);
    console.log('🔥 ERRO EXTRAÍDO:', errorRpc);
    
    if (produtosData) {
      console.log('🔥 QTDS ESPECÍFICAS:', {
        qtd_2024_valor: produtosData.qtd_compras_2024,
        qtd_2025_valor: produtosData.qtd_compras_2025,
        qtd_2024_tipo: typeof produtosData.qtd_compras_2024,
        qtd_2025_tipo: typeof produtosData.qtd_compras_2025,
        qtd_2024_string: String(produtosData.qtd_compras_2024),
        qtd_2025_string: String(produtosData.qtd_compras_2025),
        qtd_2024_number: Number(produtosData.qtd_compras_2024),
        qtd_2025_number: Number(produtosData.qtd_compras_2025),
        todas_props: Object.keys(produtosData).filter(k => k.includes('qtd'))
      });
    }
      
    // 4. Buscar métricas por categoria (opcional)
    let metricasCategoria = null;
    try {
      const { data, error } = await supabase
        .from('vw_metricas_categoria_cliente')
        .select('*')
        .eq('codigo_cliente', codigoCliente)
        .single();
      
      if (error) {
        console.warn('⚠️ Métricas de categoria não disponíveis:', error.message);
      } else {
        metricasCategoria = data;
      }
    } catch (err) {
      console.warn('⚠️ Erro ao buscar métricas de categoria:', err);
    }
      
    // TESTE DEFINITIVO: Forçar valores hardcoded primeiro
    const qtd2024Raw = produtosData?.qtd_compras_2024;
    const qtd2025Raw = produtosData?.qtd_compras_2025;
    
    console.log('🎯 ANTES DA ATRIBUIÇÃO:', {
      qtd2024Raw,
      qtd2025Raw,
      teste_hardcode_2024: 6,
      teste_hardcode_2025: 2
    });
    
    // Combinar todos os dados COM VALORES REAIS DA RPC
    const clienteCompleto: ClienteDetalhes = {
      ...dadosBasicos,
      qtd_compras_2024: qtd2024Raw ?? 0,
      qtd_compras_2025: qtd2025Raw ?? 0,
      celular: dadosBasicos.celular || '',
      produtos_comprados: produtosData?.produtos_comprados || [],
      // Métricas por categoria
      rx_fem_ob: metricasCategoria?.rx_fem_ob || 0,
      rx_fem_pw: metricasCategoria?.rx_fem_pw || 0,
      rx_mas_ob: metricasCategoria?.rx_mas_ob || 0,
      rx_mas_pw: metricasCategoria?.rx_mas_pw || 0,
      sol_fem_ob: metricasCategoria?.sol_fem_ob || 0,
      sol_fem_pw: metricasCategoria?.sol_fem_pw || 0,
      sol_mas_ob: metricasCategoria?.sol_mas_ob || 0,
      sol_mas_pw: metricasCategoria?.sol_mas_pw || 0
    };
    
    console.log('5️⃣ DEBUG FINAL - qtd no clienteCompleto:', {
      qtd_2024_final: clienteCompleto.qtd_compras_2024,
      qtd_2025_final: clienteCompleto.qtd_compras_2025
    })
    console.log('4️⃣ Retornando dados finais:', clienteCompleto);
    console.log('4️⃣ Verificação específica:', {
      qtd_2024: clienteCompleto.qtd_compras_2024,
      qtd_2025: clienteCompleto.qtd_compras_2025,
      celular: clienteCompleto.celular
    });

    return clienteCompleto;
    
  } catch (error: any) {
    console.error('❌ Erro detalhado:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      status: error.status,
      fullError: error
    });
    
    // Se for erro 406, fazer debug adicional
    if (error.status === 406) {
      console.log('🔍 Debug erro 406 - Testando acessos diretos...');
      
      try {
        // Teste direto view (RLS-safe)
        const { data: testData, error: testError } = await supabase
          .from('vw_clientes_completo')
          .select('codigo_cliente, nome_fantasia')
          .eq('codigo_cliente', codigoCliente)
          .single();
          
        console.log('🔍 Teste direto tabela_clientes:', { testData, testError });
        
        // Teste RPC direta
        const rpcTest = await supabase.rpc('get_cliente_detalhes', { p_codigo_cliente: codigoCliente });
        console.log('🔍 Teste RPC direta:', rpcTest);
        
      } catch (debugError) {
        console.log('🔍 Erro nos testes de debug:', debugError);
      }
    }
    
    throw error;
  }
}

// Alternativa: Buscar apenas dados básicos (mais leve)
export async function getClienteBasico(codigoCliente: number) {
  const { data, error } = await supabase
    .from('vw_clientes_completo')
    .select('*')
    .eq('codigo_cliente', codigoCliente)
    .single();
    
  if (error) throw error;
  return data;
}