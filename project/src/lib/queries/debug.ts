import { supabase } from '../supabase';

export async function diagnosticarRotasUsuario(userId: string) {
  try {
    console.log('🔍 Iniciando diagnóstico para userId:', userId);
    
    // 1. Verificar dados do perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, nome_completo, cargo, cod_vendedor, status, created_at, updated_at')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('❌ Erro ao buscar perfil:', profileError);
      return { error: 'Erro ao buscar perfil do usuário' };
    }
    
    console.log('👤 Perfil do usuário:', { ...profile, email: 'obtido do auth.users' });
    
    // 2. Verificar rotas atribuídas ao usuário
    const { data: vendedorRotas, error: rotasError } = await supabase
      .from('vendedor_rotas')
      .select('*')
      .eq('vendedor_id', profile.id);
    
    if (rotasError) {
      console.error('❌ Erro ao buscar rotas do vendedor:', rotasError);
    } else {
      console.log('🛣️ Rotas do vendedor:', vendedorRotas);
    }
    
    // 3. Verificar dados da tabela rotas_estado
    const { data: rotasEstado, error: rotasEstadoError } = await supabase
      .from('rotas_estado')
      .select('*')
      .eq('cod_vendedor', profile.cod_vendedor);
    
    if (rotasEstadoError) {
      console.error('❌ Erro ao buscar rotas_estado:', rotasEstadoError);
    } else {
      console.log('🗺️ Rotas no estado:', rotasEstado);
    }
    
    // 4. Testar acesso às views principais
    const testes = [
      { nome: 'vw_dashboard_metricas', query: supabase.from('vw_dashboard_metricas').select('*').limit(1) },
      { nome: 'vw_ranking_rotas', query: supabase.from('vw_ranking_rotas').select('*').limit(10) },
      { nome: 'vw_top10_cidades', query: supabase.from('vw_top10_cidades').select('*').limit(10) },
      { nome: 'vw_metricas_por_rota', query: supabase.from('vw_metricas_por_rota').select('*').limit(10) },
      { nome: 'vw_clientes_completo', query: supabase.from('vw_clientes_completo').select('*').limit(10) }
    ];
    
    const resultadosTestes: Record<string, { sucesso: boolean; registros: number; erro: string | null }> = {};
    
    for (const teste of testes) {
      try {
        const { data, error } = await teste.query;
        resultadosTestes[teste.nome] = {
          sucesso: !error,
          registros: data?.length || 0,
          erro: error?.message || null
        };
        console.log(`🧪 Teste ${teste.nome}:`, resultadosTestes[teste.nome]);
      } catch (err) {
        resultadosTestes[teste.nome] = {
          sucesso: false,
          registros: 0,
          erro: err instanceof Error ? err.message : 'Erro desconhecido'
        };
        console.error(`❌ Erro no teste ${teste.nome}:`, err);
      }
    }
    
    return {
      profile,
      vendedorRotas,
      rotasEstado,
      testesViews: resultadosTestes
    };
    
  } catch (error) {
    console.error('💥 Erro no diagnóstico:', error);
    return { error: 'Erro geral no diagnóstico' };
  }
}

// Função simplificada para obter informações básicas do usuário atual
export async function obterInfoBasicaUsuario() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { error: 'Usuário não autenticado' };
    }
    
    // Buscar perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      return { error: 'Erro ao buscar perfil: ' + profileError.message };
    }
    
    return {
      user: { id: user.id, email: user.email },
      profile,
      sucesso: true
    };
  } catch (error) {
    return { error: 'Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido') };
  }
}

// Função para executar diagnóstico do usuário atual
export async function diagnosticarUsuarioAtual() {
  try {
    // Buscar o usuário atual
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error('❌ Usuário não autenticado:', error);
      return { error: 'Usuário não autenticado' };
    }
    
    console.log('🔐 Usuário autenticado:', { id: user.id, email: user.email });
    
    // Executar diagnóstico
    return await diagnosticarRotasUsuario(user.id);
    
  } catch (error) {
    console.error('💥 Erro ao diagnosticar usuário atual:', error);
    return { error: 'Erro ao diagnosticar usuário atual' };
  }
}

// Função para testar contexto de autenticação e RLS
export async function testarContextoAuth() {
  console.log('🔐 Testando contexto de autenticação...');
  
  try {
    // 1. Verificar usuário atual no frontend
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 Usuário frontend:', { 
      id: user?.id, 
      email: user?.email, 
      error: authError 
    });
    
    // 2. Verificar se o backend reconhece o usuário
    const { data: authContext, error: contextError } = await supabase
      .rpc('get_current_user_info'); // Vamos criar esta função
    
    console.log('🏗️ Contexto backend:', { 
      data: authContext, 
      error: contextError 
    });
    
    // 3. Testar query direta nas tabelas com RLS
    const { data: vendedorRotas, error: rotasError } = await supabase
      .from('vendedor_rotas')
      .select('*')
      .eq('ativo', true);
    
    console.log('📊 vendedor_rotas (deve ser filtrado):', {
      count: vendedorRotas?.length || 0,
      dados: vendedorRotas,
      error: rotasError
    });
    
    // 4. Testar query na view clientes (RLS-safe)
    const { data: clientes, error: clientesError } = await supabase
      .from('vw_clientes_completo')
      .select('codigo_cliente, nome_fantasia, rota')
      .limit(10);
    
    console.log('👥 vw_clientes_completo (RLS aplicado):', {
      count: clientes?.length || 0,
      primeiros: clientes?.slice(0, 3),
      error: clientesError,
      errorDetails: {
        message: clientesError?.message,
        code: clientesError?.code,
        hint: clientesError?.hint,
        details: clientesError?.details
      }
    });
    
    return {
      user,
      authContext,
      vendedorRotas: vendedorRotas?.length || 0,
      clientes: clientes?.length || 0
    };
    
  } catch (error) {
    console.error('💥 Erro no teste de contexto:', error);
    return { error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Função para testar se as views respeitam RLS
export async function testarRLSPorView() {
  console.log('🔐 Testando RLS por view específica...');
  
  const viewsParaTestar = [
    { nome: 'vw_dashboard_metricas', funcionando: true },
    { nome: 'vw_ranking_rotas', funcionando: true },
    { nome: 'vw_top10_cidades', funcionando: true },
    { nome: 'vw_metricas_por_rota', funcionando: false }, // Suspeita
    { nome: 'vw_cidades_completo', funcionando: false }   // Suspeita
  ];
  
  const resultados: Record<string, { count: number; amostra: any; funcionando: boolean }> = {};
  
  for (const view of viewsParaTestar) {
    try {
      const { data } = await supabase
        .from(view.nome)
        .select('*')
        .limit(5);
      
      resultados[view.nome] = {
        count: data?.length || 0,
        amostra: data?.slice(0, 2) || [],
        funcionando: view.funcionando
      };
      
      console.log(`${view.funcionando ? '✅' : '❌'} ${view.nome}:`, {
        registros: data?.length || 0,
        primeiroItem: data?.[0]
      });
      
    } catch (err) {
      resultados[view.nome] = {
        count: 0,
        amostra: [],
        funcionando: false
      };
      console.error(`💥 Erro em ${view.nome}:`, err);
    }
  }
  
  return resultados;
}

// Função para testar cada query do Dashboard individualmente
export async function testarQueriesDashboard() {
  console.log('🧪 Testando queries do Dashboard individualmente...');
  
  const resultados: Record<string, { sucesso: boolean; dados: any; erro: string | null }> = {
    vw_dashboard_metricas: { sucesso: false, dados: null, erro: null },
    vw_top10_cidades: { sucesso: false, dados: null, erro: null },
    vw_ranking_rotas: { sucesso: false, dados: null, erro: null },
    vw_clientes_completo: { sucesso: false, dados: null, erro: null },
    vw_metricas_por_rota: { sucesso: false, dados: null, erro: null }
  };
  
  // Testar vw_dashboard_metricas
  try {
    const { data, error } = await supabase
      .from('vw_dashboard_metricas')
      .select('*')
      .single();
    
    resultados.vw_dashboard_metricas = {
      sucesso: !error,
      dados: data,
      erro: error?.message || null
    };
    console.log('📊 vw_dashboard_metricas:', resultados.vw_dashboard_metricas);
  } catch (err) {
    resultados.vw_dashboard_metricas.erro = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('❌ Erro vw_dashboard_metricas:', err);
  }
  
  // Testar vw_top10_cidades
  try {
    const { data, error } = await supabase
      .from('vw_top10_cidades')
      .select('*')
      .limit(10);
    
    resultados.vw_top10_cidades = {
      sucesso: !error,
      dados: data,
      erro: error?.message || null
    };
    console.log('🏙️ vw_top10_cidades:', resultados.vw_top10_cidades);
  } catch (err) {
    resultados.vw_top10_cidades.erro = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('❌ Erro vw_top10_cidades:', err);
  }
  
  // Testar vw_ranking_rotas
  try {
    const { data, error } = await supabase
      .from('vw_ranking_rotas')
      .select('*')
      .limit(10);
    
    resultados.vw_ranking_rotas = {
      sucesso: !error,
      dados: data,
      erro: error?.message || null
    };
    console.log('🛣️ vw_ranking_rotas:', resultados.vw_ranking_rotas);
  } catch (err) {
    resultados.vw_ranking_rotas.erro = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('❌ Erro vw_ranking_rotas:', err);
  }
  
  // Testar vw_clientes_completo
  try {
    const { data, error } = await supabase
      .from('vw_clientes_completo')
      .select('*')
      .limit(10);
    
    resultados.vw_clientes_completo = {
      sucesso: !error,
      dados: data,
      erro: error?.message || null
    };
    console.log('👥 vw_clientes_completo:', resultados.vw_clientes_completo);
  } catch (err) {
    resultados.vw_clientes_completo.erro = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('❌ Erro vw_clientes_completo:', err);
  }
  
  // Testar vw_metricas_por_rota
  try {
    const { data, error } = await supabase
      .from('vw_metricas_por_rota')
      .select('*')
      .limit(10);
    
    resultados.vw_metricas_por_rota = {
      sucesso: !error,
      dados: data,
      erro: error?.message || null
    };
    console.log('📈 vw_metricas_por_rota:', resultados.vw_metricas_por_rota);
  } catch (err) {
    resultados.vw_metricas_por_rota.erro = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('❌ Erro vw_metricas_por_rota:', err);
  }
  
  return resultados;
}

// Função para testar RLS específico
export async function testarRLS() {
  try {
    console.log('🧪 Testando RLS...');
    
    // Testar acesso direto às tabelas principais
    const testes = [
      { nome: 'vw_clientes_completo', query: supabase.from('vw_clientes_completo').select('count').limit(1) },
      { nome: 'vendedor_rotas', query: supabase.from('vendedor_rotas').select('*').limit(5) },
      { nome: 'rotas_estado', query: supabase.from('rotas_estado').select('*').limit(5) }
    ];
    
    const resultados: Record<string, { sucesso: boolean; dados: any; erro: string | null }> = {};
    
    for (const teste of testes) {
      try {
        const { data, error } = await teste.query;
        resultados[teste.nome] = {
          sucesso: !error,
          dados: data,
          erro: error?.message || null
        };
        console.log(`🧪 RLS ${teste.nome}:`, resultados[teste.nome]);
      } catch (err) {
        resultados[teste.nome] = {
          sucesso: false,
          dados: null,
          erro: err instanceof Error ? err.message : 'Erro desconhecido'
        };
        console.error(`❌ Erro RLS ${teste.nome}:`, err);
      }
    }
    
    return resultados;
    
  } catch (error) {
    console.error('💥 Erro ao testar RLS:', error);
    return { error: 'Erro ao testar RLS' };
  }
}