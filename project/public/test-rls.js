// Teste direto RLS - Execute no console do navegador após login
// Acesse: http://localhost:3001 -> Login -> F12 -> Console -> Execute: testeRLSCompleto()

// Função para aguardar supabase estar disponível
function aguardarSupabase() {
  return new Promise((resolve) => {
    const verificar = () => {
      if (window.supabase) {
        resolve();
      } else {
        setTimeout(verificar, 100);
      }
    };
    verificar();
  });
}

async function testeRLSCompleto() {
  console.log('🧪 === TESTE COMPLETO DE RLS ===');
  
  // Aguardar supabase estar disponível
  await aguardarSupabase();
  
  // 1. Verificar usuário atual
  console.log('\n1. 👤 VERIFICANDO USUÁRIO ATUAL...');
  const { data: { user }, error: authError } = await window.supabase.auth.getUser();
  console.log('Usuário:', { 
    id: user?.id, 
    email: user?.email,
    error: authError 
  });
  
  if (!user) {
    console.error('❌ Usuário não autenticado! Faça login primeiro.');
    return;
  }
  
  // 2. Testar vw_clientes_completo (RLS-safe)
  console.log('\n2. 👥 TESTANDO VW_CLIENTES_COMPLETO (RLS aplicado)...');
  try {
    const { data: clientes, error: clientesError } = await window.supabase
      .from('vw_clientes_completo')
      .select('codigo_cliente, nome_fantasia, rota')
      .limit(10);
    
    console.log('vw_clientes_completo resultado:', {
      count: clientes?.length || 0,
      primeiros3: clientes?.slice(0, 3),
      error: clientesError,
      errorDetails: clientesError ? {
        message: clientesError.message,
        code: clientesError.code,
        hint: clientesError.hint,
        details: clientesError.details
      } : null
    });
  } catch (err) {
    console.error('❌ Erro crítico vw_clientes_completo:', err);
  }
  
  // 3. Testar vendedor_rotas (deve mostrar apenas rotas do usuário)
  console.log('\n3. 🛣️ TESTANDO VENDEDOR_ROTAS...');
  try {
    const { data: rotas, error: rotasError } = await window.supabase
      .from('vendedor_rotas')
      .select('*')
      .eq('ativo', true);
    
    console.log('vendedor_rotas resultado:', {
      count: rotas?.length || 0,
      dados: rotas,
      error: rotasError
    });
  } catch (err) {
    console.error('❌ Erro vendedor_rotas:', err);
  }
  
  // 4. Testar views problemáticas vs funcionais
  console.log('\n4. 📊 TESTANDO VIEWS...');
  
  const viewsProblematicas = [
    'vw_metricas_por_rota',
    'vw_cidades_completo', 
    'vw_clientes_completo'
  ];
  
  const viewsFuncionais = [
    'vw_ranking_rotas',
    'vw_top10_cidades',
    'vw_dashboard_metricas'
  ];
  
  console.log('\n4a. ❌ VIEWS PROBLEMÁTICAS:');
  for (const view of viewsProblematicas) {
    try {
      const { data, error } = await window.supabase
        .from(view)
        .select('*')
        .limit(5);
      
      console.log(`${view}:`, {
        count: data?.length || 0,
        primeiros2: data?.slice(0, 2),
        error: error?.message
      });
    } catch (err) {
      console.error(`❌ Erro ${view}:`, err.message);
    }
  }
  
  console.log('\n4b. ✅ VIEWS FUNCIONAIS:');
  for (const view of viewsFuncionais) {
    try {
      const { data, error } = await window.supabase
        .from(view)
        .select('*')
        .limit(5);
      
      console.log(`${view}:`, {
        count: data?.length || 0,
        primeiros2: data?.slice(0, 2),
        error: error?.message
      });
    } catch (err) {
      console.error(`❌ Erro ${view}:`, err.message);
    }
  }
  
  console.log('\n🏁 === TESTE COMPLETO ===');
}

// Disponibilizar globalmente
window.testeRLSCompleto = testeRLSCompleto;

console.log('📋 Script carregado! Execute: testeRLSCompleto()');