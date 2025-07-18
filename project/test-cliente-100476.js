// Teste direto no banco para cliente 100476
import { createClient } from '@supabase/supabase-js'

// Usar variáveis de ambiente diretamente
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Cliente para testar
const CODIGO_CLIENTE = 100476

async function testarCliente() {
  try {
    console.log('🔍 Testando cliente:', CODIGO_CLIENTE)
    console.log('=' .repeat(50))
    
    // 1. Primeiro, verificar se o cliente existe na view vw_clientes_completo
    console.log('\n1️⃣ Testando view vw_clientes_completo...')
    const { data: dadosView, error: errorView } = await supabase
      .from('vw_clientes_completo')
      .select('codigo_cliente, nome_fantasia, qtd_compras_2024, qtd_compras_2025, valor_vendas_2024, valor_vendas_2025')
      .eq('codigo_cliente', CODIGO_CLIENTE)
      .single()
    
    if (errorView) {
      console.error('❌ Erro na view:', errorView)
    } else {
      console.log('✅ Dados da view vw_clientes_completo:')
      console.log('   - Código:', dadosView.codigo_cliente)
      console.log('   - Nome:', dadosView.nome_fantasia)
      console.log('   - Qtd Compras 2024:', dadosView.qtd_compras_2024)
      console.log('   - Qtd Compras 2025:', dadosView.qtd_compras_2025)
      console.log('   - Valor Vendas 2024:', dadosView.valor_vendas_2024)
      console.log('   - Valor Vendas 2025:', dadosView.valor_vendas_2025)
    }
    
    // 2. Testar RPC get_cliente_detalhes
    console.log('\n2️⃣ Testando RPC get_cliente_detalhes...')
    const { data: dadosRPC, error: errorRPC } = await supabase
      .rpc('get_cliente_detalhes', { 
        p_codigo_cliente: CODIGO_CLIENTE 
      })
    
    if (errorRPC) {
      console.error('❌ Erro na RPC:', errorRPC)
    } else {
      console.log('✅ Dados da RPC get_cliente_detalhes:')
      if (dadosRPC && dadosRPC.length > 0) {
        const dados = dadosRPC[0]
        console.log('   - Código:', dados.codigo_cliente)
        console.log('   - Nome:', dados.nome_fantasia)
        console.log('   - Qtd Compras 2024:', dados.qtd_compras_2024)
        console.log('   - Qtd Compras 2025:', dados.qtd_compras_2025)
        console.log('   - Valor Vendas 2024:', dados.valor_vendas_2024)
        console.log('   - Valor Vendas 2025:', dados.valor_vendas_2025)
        console.log('   - Produtos Comprados:', dados.produtos_comprados?.length || 0, 'produtos')
      } else {
        console.log('   - Nenhum dado retornado')
      }
    }
    
    // 3. Testar consulta direta na tabela clientes
    console.log('\n3️⃣ Testando tabela clientes...')
    const { data: dadosCliente, error: errorCliente } = await supabase
      .from('clientes')
      .select('codigo_cliente, nome_fantasia, cidade, rota')
      .eq('codigo_cliente', CODIGO_CLIENTE)
      .single()
    
    if (errorCliente) {
      console.error('❌ Erro na tabela clientes:', errorCliente)
    } else {
      console.log('✅ Dados da tabela clientes:')
      console.log('   - Código:', dadosCliente.codigo_cliente)
      console.log('   - Nome:', dadosCliente.nome_fantasia)
      console.log('   - Cidade:', dadosCliente.cidade)
      console.log('   - Rota:', dadosCliente.rota)
    }
    
    // 4. Testar consulta direta na tabela compras_produto_cliente
    console.log('\n4️⃣ Testando compras do cliente...')
    const { data: compras, error: errorCompras } = await supabase
      .from('compras_produto_cliente')
      .select('codigo_cliente, ano, count')
      .eq('codigo_cliente', CODIGO_CLIENTE)
      .order('ano', { ascending: false })
    
    if (errorCompras) {
      console.error('❌ Erro na tabela compras:', errorCompras)
    } else {
      console.log('✅ Compras por ano:')
      const compras2024 = compras.filter(c => c.ano === 2024).length
      const compras2025 = compras.filter(c => c.ano === 2025).length
      console.log('   - Registros 2024:', compras2024)
      console.log('   - Registros 2025:', compras2025)
      console.log('   - Total registros:', compras.length)
    }
    
    // 5. Testar view vw_metricas_categoria_cliente
    console.log('\n5️⃣ Testando view vw_metricas_categoria_cliente...')
    const { data: metricas, error: errorMetricas } = await supabase
      .from('vw_metricas_categoria_cliente')
      .select('*')
      .eq('codigo_cliente', CODIGO_CLIENTE)
      .single()
    
    if (errorMetricas) {
      console.error('❌ Erro na view métricas:', errorMetricas)
    } else {
      console.log('✅ Métricas por categoria:')
      console.log('   - RX Fem OB:', metricas.rx_fem_ob)
      console.log('   - RX Fem PW:', metricas.rx_fem_pw)
      console.log('   - RX Mas OB:', metricas.rx_mas_ob)
      console.log('   - RX Mas PW:', metricas.rx_mas_pw)
      console.log('   - Sol Fem OB:', metricas.sol_fem_ob)
      console.log('   - Sol Fem PW:', metricas.sol_fem_pw)
      console.log('   - Sol Mas OB:', metricas.sol_mas_ob)
      console.log('   - Sol Mas PW:', metricas.sol_mas_pw)
    }
    
    console.log('\n' + '=' .repeat(50))
    console.log('✅ Teste concluído!')
    
  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

// Executar teste
testarCliente()