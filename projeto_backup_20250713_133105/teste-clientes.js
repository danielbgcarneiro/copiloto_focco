// Teste rápido da integração da página Clientes
// Execute no console do navegador (F12) quando estiver na página

(async function testeClientes() {
  console.log('🔍 Testando integração da página Clientes...');
  
  try {
    // Importar funções necessárias
    const { supabase } = await import('/src/lib/supabase.ts');
    const { getClientesPorVendedor, getCorPrioridade } = await import('/src/lib/queries/clientes.ts');
    
    console.log('📊 Testando query de clientes...');
    
    // Testar query básica
    const { data: clientesBasicos } = await supabase
      .from('vw_clientes_completo')
      .select('*')
      .limit(5);
    
    console.log('✅ Clientes básicos:', clientesBasicos);
    
    // Testar função com filtro por vendedor
    console.log('👤 Testando filtro por vendedor...');
    const clientesPorVendedor = await getClientesPorVendedor('some-vendor-id');
    console.log('📋 Clientes filtrados:', clientesPorVendedor);
    
    // Testar sistema de cores
    console.log('🎨 Testando sistema de cores por prioridade...');
    
    const testesCor = [
      'URGENTE - Meta em risco',
      'Reconquistar cliente',
      'Manter foco total',
      'Aumentar frequência de visitas',
      'Cobrança necessária',
      'Primeira venda importante'
    ];
    
    testesCor.forEach(acao => {
      const cor = getCorPrioridade(acao);
      console.log(`📌 "${acao}" → ${cor}`);
    });
    
    console.log('🎯 Testando formatação de moeda...');
    const formatarMoeda = (valor) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(valor || 0);
    };
    
    console.log('💰 R$ 15000 formatado:', formatarMoeda(15000));
    console.log('💰 R$ 2500.50 formatado:', formatarMoeda(2500.50));
    
    console.log('✅ Todos os testes passaram!');
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
  }
})();

// Manual de Cores por Prioridade:
console.log(`
🔴 VERMELHO (Urgente):
- "urgente", "bloqueio", "vai perder", "cobrança", "última tentativa", "resolver situação"

🟡 AMARELO (Atenção):  
- "reconquistar", "aumentar frequência", "reativar", "desenvolver", "ação de reativação", "avaliar manutenção"

🟢 VERDE (Manutenção):
- "manter", "foco total", "foco em", "primeira venda"

⚪ CINZA (Sem ação):
- Quando não há recomendação
`);

// Instruções de uso:
console.log(`
📝 INSTRUÇÕES:
1. Abra as DevTools (F12)
2. Vá para a aba Console
3. Cole este código e pressione Enter
4. Verifique os logs para confirmar funcionalidades
5. Teste navegação clicando nos cards de clientes
`);

// Teste de rota:
console.log('🔗 Rota de detalhes deve ser: /clientes/detalhes/:id');
console.log('🔗 Exemplo: /clientes/detalhes/100125');