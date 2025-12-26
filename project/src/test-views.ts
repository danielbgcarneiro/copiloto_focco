/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


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
  
  // vw_top20_clientes foi removida do backend; teste omitido.
}

// Execute o teste
testViews().catch(console.error);