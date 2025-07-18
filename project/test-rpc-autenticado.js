// Teste RPC com usuário autenticado
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const CODIGO_CLIENTE = 100476

async function testarRPCAutenticado() {
  try {
    console.log('🔐 Testando RPC com usuário autenticado...')
    console.log('=' .repeat(50))
    
    // 1. Fazer login primeiro
    console.log('\n1️⃣ Fazendo login...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'misterclaudio1972@gmail.com',
      password: '123456'
    })
    
    if (authError) {
      console.error('❌ Erro de login:', authError)
      return
    }
    
    console.log('✅ Login bem-sucedido!')
    console.log('   User ID:', authData.user.id)
    console.log('   Email:', authData.user.email)
    
    // 2. Testar RPC com vendedor autenticado
    console.log('\n2️⃣ Testando RPC com vendedor autenticado...')
    const { data: dadosRPC, error: errorRPC } = await supabase
      .rpc('get_cliente_detalhes', { 
        p_codigo_cliente: CODIGO_CLIENTE,
        p_vendedor_uuid: authData.user.id
      })
    
    if (errorRPC) {
      console.error('❌ Erro na RPC:', errorRPC)
    } else {
      console.log('✅ Dados da RPC com vendedor autenticado:')
      if (dadosRPC && dadosRPC.length > 0) {
        const dados = dadosRPC[0]
        console.log('   - Código:', dados.codigo_cliente)
        console.log('   - Nome:', dados.nome_fantasia)
        console.log('   - Qtd Compras 2024:', dados.qtd_compras_2024)
        console.log('   - Qtd Compras 2025:', dados.qtd_compras_2025)
        console.log('   - Valor Vendas 2024:', dados.valor_vendas_2024)
        console.log('   - Valor Vendas 2025:', dados.valor_vendas_2025)
        console.log('   - Produtos Comprados:', dados.produtos_comprados)
        
        // Verificar se produtos_comprados tem dados
        if (dados.produtos_comprados) {
          console.log('   - Tipo produtos_comprados:', typeof dados.produtos_comprados)
          console.log('   - Dados produtos_comprados:', dados.produtos_comprados)
        }
      } else {
        console.log('   - Nenhum dado retornado')
      }
    }
    
    // 3. Testar RPC apenas com código cliente (sem vendedor)
    console.log('\n3️⃣ Testando RPC apenas com código cliente...')
    const { data: dadosRPC2, error: errorRPC2 } = await supabase
      .rpc('get_cliente_detalhes', { 
        p_codigo_cliente: CODIGO_CLIENTE
      })
    
    if (errorRPC2) {
      console.error('❌ Erro na RPC sem vendedor:', errorRPC2)
    } else {
      console.log('✅ Dados da RPC sem vendedor:')
      if (dadosRPC2 && dadosRPC2.length > 0) {
        const dados = dadosRPC2[0]
        console.log('   - Código:', dados.codigo_cliente)
        console.log('   - Nome:', dados.nome_fantasia)
        console.log('   - Qtd Compras 2024:', dados.qtd_compras_2024)
        console.log('   - Qtd Compras 2025:', dados.qtd_compras_2025)
        console.log('   - Valor Vendas 2024:', dados.valor_vendas_2024)
        console.log('   - Valor Vendas 2025:', dados.valor_vendas_2025)
        console.log('   - Produtos Comprados:', dados.produtos_comprados)
      } else {
        console.log('   - Nenhum dado retornado')
      }
    }
    
    // 4. Verificar se há alguma consulta direta que possa mostrar as quantidades
    console.log('\n4️⃣ Testando consulta direta na view de compras...')
    const { data: comprasData, error: comprasError } = await supabase
      .from('compras_produto_cliente')
      .select('*')
      .eq('codigo_cliente', CODIGO_CLIENTE)
    
    if (comprasError) {
      console.error('❌ Erro na consulta compras:', comprasError)
    } else {
      console.log('✅ Consulta compras:')
      console.log('   - Total registros:', comprasData.length)
      if (comprasData.length > 0) {
        console.log('   - Primeiro registro:', comprasData[0])
        
        // Contar por ano se existir campo de data
        const anos = {}
        comprasData.forEach(compra => {
          // Tentar identificar o ano de diferentes formas
          const chavesData = Object.keys(compra).filter(k => 
            k.includes('data') || k.includes('ano') || k.includes('year')
          )
          console.log('   - Chaves relacionadas a data:', chavesData)
          
          if (chavesData.length > 0) {
            chavesData.forEach(chave => {
              console.log(`   - ${chave}: ${compra[chave]}`)
            })
          }
        })
      }
    }
    
    // 5. Logout
    console.log('\n5️⃣ Fazendo logout...')
    await supabase.auth.signOut()
    
    console.log('\n' + '=' .repeat(50))
    console.log('✅ Teste concluído!')
    
  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

// Executar teste
testarRPCAutenticado()