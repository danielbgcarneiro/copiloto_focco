// Teste rápido da integração - Execute no console do navegador
// Copie e cole este código no DevTools (F12) quando estiver na página

(async function testeCliente() {
  console.log('🔍 Testando integração do cliente...');
  
  try {
    // Importar o Supabase
    const { supabase } = await import('/src/lib/supabase.ts');
    
    // Testar a função get_cliente_detalhes
    console.log('📞 Chamando get_cliente_detalhes...');
    const resultado = await supabase.rpc('get_cliente_detalhes', { p_codigo_cliente: 100125 });
    
    if (resultado.error) {
      console.error('❌ Erro:', resultado.error);
      return;
    }
    
    console.log('✅ Sucesso! Dados do cliente:');
    console.log('📋 Cliente completo:', resultado.data);
    console.log('🛍️ Mix de produtos:', resultado.data.produtos_comprados);
    console.log('📱 Celular:', resultado.data.celular);
    console.log('💰 Vendas 2025:', resultado.data.valor_vendas_2025);
    console.log('🎯 Meta 2025:', resultado.data.meta_2025);
    console.log('📊 Percentual atingimento:', resultado.data.percentual_atingimento);
    
    // Testar formatações
    const formatarMoeda = (valor) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valor || 0);
    };
    
    console.log('💵 Vendas 2025 formatado:', formatarMoeda(resultado.data.valor_vendas_2025));
    console.log('🎯 Meta formatada:', formatarMoeda(resultado.data.meta_2025));
    
  } catch (error) {
    console.error('💥 Erro crítico:', error);
  }
})();

// Instruções:
// 1. Abra o DevTools (F12)
// 2. Vá para a aba Console
// 3. Cole este código e pressione Enter
// 4. Verifique os logs para confirmar que tudo está funcionando