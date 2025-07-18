// Teste direto de RLS - Execute no console do navegador
// Depois de fazer login como misterclaudio1972@gmail.com

import { supabase } from './src/lib/supabase';

async function testeRLSDireto() {
  console.log('🧪 TESTE DIRETO DE RLS');
  
  // 1. Verificar usuário atual
  const { data: { user } } = await supabase.auth.getUser();
  console.log('👤 Usuário:', { id: user?.id, email: user?.email });
  
  // 2. Testar tabela vendedor_rotas (deve mostrar apenas rotas do usuário)
  const { data: rotas, error: rotasError } = await supabase
    .from('vendedor_rotas')
    .select('*')
    .eq('ativo', true);
  
  console.log('🛣️ vendedor_rotas:', { 
    count: rotas?.length, 
    dados: rotas, 
    error: rotasError 
  });
  
  // 3. Testar tabela_clientes (deve mostrar apenas clientes das rotas do usuário)
  const { data: clientes, error: clientesError } = await supabase
    .from('tabela_clientes')
    .select('codigo_cliente, nome_fantasia, rota')
    .limit(20);
  
  console.log('👥 tabela_clientes:', { 
    count: clientes?.length, 
    primeiros: clientes?.slice(0, 5), 
    error: clientesError 
  });
  
  // 4. Testar views problemáticas
  const views = [
    'vw_metricas_por_rota',
    'vw_cidades_completo', 
    'vw_clientes_completo'
  ];
  
  for (const view of views) {
    try {
      const { data, error } = await supabase
        .from(view)
        .select('*')
        .limit(10);
      
      console.log(`📊 ${view}:`, { 
        count: data?.length, 
        primeiros: data?.slice(0, 2),
        error 
      });
    } catch (err) {
      console.error(`❌ Erro em ${view}:`, err);
    }
  }
  
  // 5. Comparar com views que funcionam (Dashboard)
  const viewsFuncionando = [
    'vw_ranking_rotas',
    'vw_top10_cidades',
    'vw_dashboard_metricas'
  ];
  
  for (const view of viewsFuncionando) {
    try {
      const { data, error } = await supabase
        .from(view)
        .select('*')
        .limit(10);
      
      console.log(`✅ ${view}:`, { 
        count: data?.length, 
        primeiros: data?.slice(0, 2),
        error 
      });
    } catch (err) {
      console.error(`❌ Erro em ${view}:`, err);
    }
  }
}

// Execute esta função no console depois do login
testeRLSDireto();