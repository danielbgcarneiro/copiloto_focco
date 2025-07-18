// Teste específico para quantidades de compras
console.log('🔍 TESTE ESPECÍFICO - Quantidades de Compras');

// Simular a chamada da RPC que está no código
async function testarQuantidades() {
  try {
    // Usar fetch para simular chamada ao Supabase
    console.log('📞 Testando dados que chegam da RPC...');
    
    // Dados simulados como se viessem da RPC
    const produtosDataSimulado = {
      qtd_compras_2024: 6,     // Valor correto
      qtd_compras_2025: 2,     // Valor correto
      outros_dados: "..."
    };
    
    console.log('1️⃣ Dados vindos da RPC:', produtosDataSimulado);
    
    // Simular o processamento no clienteCompleto (linha 88-89 de cliente.ts)
    const clienteCompleto = {
      qtd_compras_2024: produtosDataSimulado?.qtd_compras_2024 ?? 0,
      qtd_compras_2025: produtosDataSimulado?.qtd_compras_2025 ?? 0,
    };
    
    console.log('2️⃣ Após processamento em clienteCompleto:', clienteCompleto);
    
    // Simular o processamento no dadosCliente (linha 186-187 de DetalhesCliente.tsx)
    const dadosCliente = {
      qtdVendas2024: clienteCompleto.qtd_compras_2024 ?? 0,
      qtdVendas2025: clienteCompleto.qtd_compras_2025 ?? 0,
    };
    
    console.log('3️⃣ Após processamento em dadosCliente:', dadosCliente);
    
    // Testar diferentes cenários
    console.log('\n🧪 TESTANDO CENÁRIOS:');
    
    // Cenário 1: Valor 0 real
    const teste1 = {
      valor: 0,
      com_ou: 0 || 0,
      com_nullish: 0 ?? 0
    };
    console.log('Teste 1 (valor 0):', teste1);
    
    // Cenário 2: Valor null/undefined
    const teste2 = {
      valor: null,
      com_ou: null || 0,
      com_nullish: null ?? 0
    };
    console.log('Teste 2 (valor null):', teste2);
    
    // Cenário 3: Valor string
    const teste3 = {
      valor: "6",
      com_ou: "6" || 0,
      com_nullish: "6" ?? 0
    };
    console.log('Teste 3 (valor string):', teste3);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testarQuantidades();