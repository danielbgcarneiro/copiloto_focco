// =====================================================
// SCRIPT DE DEBUG PARA TESTAR VIEWS COM RLS
// =====================================================
// Execute no console do navegador quando logado como misterclaudio

// 1. Testar view de rotas
console.log('🧪 Testando vw_metricas_por_rota...');
const { data: rotasData, error: rotasError } = await supabase
  .from('vw_metricas_por_rota')
  .select('*');

console.log('📊 Resultado vw_metricas_por_rota:', {
  dados: rotasData,
  erro: rotasError,
  total: rotasData?.length || 0,
  rotas: rotasData?.map(r => r.rota) || []
});

// 2. Testar view de cidades
console.log('🧪 Testando vw_cidades_completo...');
const { data: cidadesData, error: cidadesError } = await supabase
  .from('vw_cidades_completo')
  .select('*');

console.log('📊 Resultado vw_cidades_completo:', {
  dados: cidadesData,
  erro: cidadesError,
  total: cidadesData?.length || 0,
  cidades: cidadesData?.map(c => `${c.cidade} (${c.rota})`) || []
});

// 3. Testar usuário atual
console.log('🧪 Testando usuário atual...');
const { data: { user } } = await supabase.auth.getUser();
console.log('👤 Usuário atual:', {
  id: user?.id,
  email: user?.email,
  metadata: user?.user_metadata
});

// 4. Testar view de clientes (que funciona)
console.log('🧪 Testando vw_clientes_completo (referência que funciona)...');
const { data: clientesData, error: clientesError } = await supabase
  .from('vw_clientes_completo')
  .select('rota, cidade')
  .limit(5);

console.log('📊 Resultado vw_clientes_completo:', {
  dados: clientesData,
  erro: clientesError,
  total: clientesData?.length || 0,
  rotasUnicas: [...new Set(clientesData?.map(c => c.rota))] || []
});

// 5. Comparar se há diferença
console.log('🔍 COMPARAÇÃO:');
console.log('Rotas da view rotas:', rotasData?.map(r => r.rota) || []);
console.log('Rotas da view clientes:', [...new Set(clientesData?.map(c => c.rota))] || []);

// 6. Resultado final
console.log('✅ TESTE CONCLUÍDO - Verifique os logs acima');