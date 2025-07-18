// Debug temporário para testar queries do dashboard
// Execute no console do navegador: window.debugDashboard()

window.debugDashboard = async function() {
  const userId = '09f316d7-eeac-4828-85a0-ad1b891f8460';
  
  console.log('🔍 Iniciando debug do dashboard...');
  console.log('👤 User ID:', userId);
  
  try {
    // 1. Testar vw_dashboard_metricas
    console.log('\n📊 Testando vw_dashboard_metricas...');
    const { data: metricas, error: e1 } = await window.supabase
      .from('vw_dashboard_metricas')
      .select('*')
      .limit(5);
    
    console.log('Resultado vw_dashboard_metricas:', { count: metricas?.length, data: metricas, error: e1 });
    
    // 2. Testar vw_top10_cidades  
    console.log('\n🏙️ Testando vw_top10_cidades...');
    const { data: cidades, error: e2 } = await window.supabase
      .from('vw_top10_cidades')
      .select('*')
      .limit(5);
    
    console.log('Resultado vw_top10_cidades:', { count: cidades?.length, data: cidades, error: e2 });
    
    // 3. Testar vw_ranking_rotas
    console.log('\n🛣️ Testando vw_ranking_rotas...');
    const { data: rotas, error: e3 } = await window.supabase
      .from('vw_ranking_rotas')
      .select('*')
      .limit(5);
    
    console.log('Resultado vw_ranking_rotas:', { count: rotas?.length, data: rotas, error: e3 });
    
    // 4. Testar tabelas base
    console.log('\n🗃️ Testando tabelas base...');
    const { data: profiles, error: e4 } = await window.supabase
      .from('profiles')
      .select('id, nome_completo, cargo')
      .eq('id', userId);
    
    console.log('Perfil do usuário:', { data: profiles, error: e4 });
    
    const { data: rotasEstado, error: e5 } = await window.supabase
      .from('rotas_estado')
      .select('*')
      .eq('vendedor_uuid', userId)
      .limit(3);
    
    console.log('Rotas do vendedor:', { count: rotasEstado?.length, data: rotasEstado, error: e5 });
    
  } catch (error) {
    console.error('💥 Erro no debug:', error);
  }
};

console.log('✅ Debug carregado! Execute: window.debugDashboard()');