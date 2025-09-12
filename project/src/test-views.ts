import { supabase } from './lib/supabase';

async function testViews() {
  console.log('🧪 Testando views do dashboard...\n');
  
  const { data: { user } } = await supabase.auth.getUser();
  console.log('👤 User ID:', user?.id);
  
  // Test vw_top10_cidades
  console.log('\n📊 Testando vw_top10_cidades:');
  const { data: top10, error: top10Error } = await supabase
    .from('vw_top10_cidades')
    .select('*')
    .eq('vendedor_uuid', user?.id)
    .limit(5);
    
  if (top10Error) {
    console.error('❌ Erro:', top10Error);
  } else {
    console.log('✅ Dados encontrados:', top10?.length || 0);
    console.log('Amostra:', top10?.slice(0, 2));
  }
  
  // Test vw_top20_clientes
  console.log('\n📊 Testando vw_top20_clientes:');
  const { data: top20, error: top20Error } = await supabase
    .from('vw_top20_clientes')
    .select('*')
    .eq('vendedor_uuid', user?.id)
    .limit(5);
    
  if (top20Error) {
    console.error('❌ Erro:', top20Error);
  } else {
    console.log('✅ Dados encontrados:', top20?.length || 0);
    console.log('Amostra:', top20?.slice(0, 2));
  }
}

// Execute o teste
testViews().catch(console.error);