import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://krisjvemfpnkmduebqdr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyaXNqdmVtZnBua21kdWVicWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NTQ5MTMsImV4cCI6MjA2MzQzMDkxM30.jktcXSfSQfcfXUPTDuvu75GuUscMhpsYnvhfloRUf4I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarEstrutura() {
  console.log('🔍 Testando estrutura das views...')
  
  try {
    // 1. Testar vw_metricas_por_rota primeiro para ver sua estrutura
    console.log('\n1. 📊 Estrutura da vw_metricas_por_rota:')
    const { data: metricasAmostra, error: errorMetricas } = await supabase
      .from('vw_metricas_por_rota')
      .select('*')
      .limit(1)
    
    if (errorMetricas) {
      console.error('❌ Erro ao buscar vw_metricas_por_rota:', errorMetricas)
    } else {
      console.log('Estrutura encontrada:', metricasAmostra?.[0] || 'Sem dados')
      if (metricasAmostra && metricasAmostra.length > 0) {
        console.log('Colunas disponíveis:', Object.keys(metricasAmostra[0]))
      }
    }
    
    // 2. Testar vw_clientes_completo para ver sua estrutura
    console.log('\n2. 👥 Estrutura da vw_clientes_completo:')
    const { data: clientesAmostra, error: errorClientes } = await supabase
      .from('vw_clientes_completo')
      .select('*')
      .limit(1)
    
    if (errorClientes) {
      console.error('❌ Erro ao buscar vw_clientes_completo:', errorClientes)
    } else {
      console.log('Estrutura encontrada:', clientesAmostra?.[0] || 'Sem dados')
      if (clientesAmostra && clientesAmostra.length > 0) {
        console.log('Colunas disponíveis:', Object.keys(clientesAmostra[0]))
      }
    }
    
    // 3. Buscar especificamente por Aracati usando apenas colunas básicas
    console.log('\n3. 🎯 Buscar dados específicos para análise:')
    
    // Primeiro testar se existe alguma rota com Aracati
    const { data: rotasAracati, error: errorRotasAracati } = await supabase
      .from('vw_metricas_por_rota')
      .select('*')
      .ilike('rota', '%aracati%')
    
    console.log('Rotas contendo Aracati:', rotasAracati)
    
    // Testar busca de clientes por código básico
    const { data: clientesBasico, error: errorClientesBasico } = await supabase
      .from('vw_clientes_completo')
      .select('codigo_cliente, nome_fantasia, cidade, rota')
      .limit(10)
    
    if (errorClientesBasico) {
      console.error('❌ Erro ao buscar clientes básico:', errorClientesBasico)
    } else {
      console.log(`✅ Clientes encontrados: ${clientesBasico?.length || 0}`)
      if (clientesBasico && clientesBasico.length > 0) {
        console.log('Primeiros clientes:', clientesBasico.slice(0, 3))
        
        // Verificar quais cidades estão disponíveis
        const cidades = [...new Set(clientesBasico.map(c => c.cidade))].slice(0, 10)
        console.log('Cidades encontradas:', cidades)
        
        // Verificar se existe algum cliente em Aracati
        const clientesAracati = clientesBasico.filter(c => 
          c.cidade && c.cidade.toLowerCase().includes('aracati')
        )
        console.log('Clientes em Aracati:', clientesAracati)
      }
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

// Executar o teste
testarEstrutura()