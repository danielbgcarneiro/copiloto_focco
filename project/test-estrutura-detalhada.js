// Investigar estrutura do banco para cliente 100476
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const CODIGO_CLIENTE = 100476

async function investigarEstrutura() {
  try {
    console.log('🔍 Investigando estrutura do banco para cliente:', CODIGO_CLIENTE)
    console.log('=' .repeat(60))
    
    // 1. Verificar colunas da view vw_clientes_completo
    console.log('\n1️⃣ Verificando estrutura da view vw_clientes_completo...')
    const { data: dadosView, error: errorView } = await supabase
      .from('vw_clientes_completo')
      .select('*')
      .eq('codigo_cliente', CODIGO_CLIENTE)
      .single()
    
    if (errorView) {
      console.error('❌ Erro na view:', errorView)
    } else {
      console.log('✅ Colunas disponíveis na view vw_clientes_completo:')
      Object.keys(dadosView).forEach(key => {
        console.log(`   - ${key}: ${dadosView[key]}`)
      })
    }
    
    // 2. Testar RPC get_cliente_detalhes com detalhes completos
    console.log('\n2️⃣ Testando RPC get_cliente_detalhes completa...')
    const { data: dadosRPC, error: errorRPC } = await supabase
      .rpc('get_cliente_detalhes', { 
        p_codigo_cliente: CODIGO_CLIENTE 
      })
    
    if (errorRPC) {
      console.error('❌ Erro na RPC:', errorRPC)
    } else {
      console.log('✅ Dados completos da RPC get_cliente_detalhes:')
      if (dadosRPC && dadosRPC.length > 0) {
        const dados = dadosRPC[0]
        console.log('   Todas as propriedades:')
        Object.keys(dados).forEach(key => {
          console.log(`   - ${key}: ${dados[key]}`)
        })
      } else {
        console.log('   - Nenhum dado retornado')
      }
    }
    
    // 3. Descobrir tabelas disponíveis
    console.log('\n3️⃣ Testando tabelas conhecidas...')
    const tablesToTest = [
      'clientes', 
      'cliente', 
      'tbl_clientes',
      'compras_produto_cliente',
      'vendas',
      'pedidos'
    ]
    
    for (const table of tablesToTest) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`   ❌ Tabela ${table}: ${error.message}`)
        } else {
          console.log(`   ✅ Tabela ${table}: existe e tem ${data.length} registros`)
          if (data.length > 0) {
            console.log(`     Colunas: ${Object.keys(data[0]).join(', ')}`)
          }
        }
      } catch (err) {
        console.log(`   ❌ Tabela ${table}: erro de acesso`)
      }
    }
    
    // 4. Testar views conhecidas
    console.log('\n4️⃣ Testando views conhecidas...')
    const viewsToTest = [
      'vw_clientes_completo',
      'vw_metricas_categoria_cliente',
      'vw_dashboard_metricas',
      'vw_ranking_vendedores'
    ]
    
    for (const view of viewsToTest) {
      try {
        const { data, error } = await supabase
          .from(view)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`   ❌ View ${view}: ${error.message}`)
        } else {
          console.log(`   ✅ View ${view}: existe e tem ${data.length} registros`)
          if (data.length > 0) {
            console.log(`     Colunas: ${Object.keys(data[0]).join(', ')}`)
          }
        }
      } catch (err) {
        console.log(`   ❌ View ${view}: erro de acesso`)
      }
    }
    
    // 5. Teste específico para verificar onde estão os dados de quantidade
    console.log('\n5️⃣ Investigando origem dos dados de quantidade...')
    
    // Teste com diferentes parâmetros na RPC
    console.log('   Testando RPC com diferentes parâmetros...')
    
    const { data: rpcSemFiltro, error: errorSemFiltro } = await supabase
      .rpc('get_cliente_detalhes', { 
        p_codigo_cliente: CODIGO_CLIENTE,
        p_vendedor_uuid: null
      })
    
    if (errorSemFiltro) {
      console.log('   ❌ RPC sem filtro de vendedor: erro')
    } else {
      console.log('   ✅ RPC sem filtro de vendedor: sucesso')
      if (rpcSemFiltro && rpcSemFiltro.length > 0) {
        const dados = rpcSemFiltro[0]
        console.log(`     Qtd 2024: ${dados.qtd_compras_2024}`)
        console.log(`     Qtd 2025: ${dados.qtd_compras_2025}`)
      }
    }
    
    console.log('\n' + '=' .repeat(60))
    console.log('✅ Investigação concluída!')
    
  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

// Executar investigação
investigarEstrutura()