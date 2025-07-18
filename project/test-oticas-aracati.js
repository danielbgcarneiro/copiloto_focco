import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://krisjvemfpnkmduebqdr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyaXNqdmVtZnBua21kdWVicWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NTQ5MTMsImV4cCI6MjA2MzQzMDkxM30.jktcXSfSQfcfXUPTDuvu75GuUscMhpsYnvhfloRUf4I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarOticasAracati() {
  console.log('🔍 Testando dados de óticas para Aracati...')
  
  try {
    // 1. Verificar dados da view vw_metricas_por_rota para Aracati
    console.log('\n1. 📊 Dados da vw_metricas_por_rota (visão geral por rota):')
    const { data: metricasRota, error: errorMetricas } = await supabase
      .from('vw_metricas_por_rota')
      .select('*')
      .ilike('rota', '%aracati%')
    
    if (errorMetricas) {
      console.error('❌ Erro ao buscar vw_metricas_por_rota:', errorMetricas)
    } else {
      console.log('Dados encontrados:', metricasRota)
      if (metricasRota && metricasRota.length > 0) {
        const rota = metricasRota[0]
        console.log(`Total de clientes (óticas): ${rota.total_clientes}`)
        console.log(`Clientes sem venda 90d: ${rota.clientes_sem_venda_90d}`)
      }
    }
    
    // 2. Verificar dados detalhados dos clientes de Aracati
    console.log('\n2. 👥 Dados detalhados dos clientes em Aracati:')
    const { data: clientesAracati, error: errorClientes } = await supabase
      .from('vw_clientes_completo')
      .select('codigo_cliente, nome_fantasia, cidade, ultima_compra, dias_sem_compra')
      .ilike('cidade', '%aracati%')
    
    if (errorClientes) {
      console.error('❌ Erro ao buscar clientes:', errorClientes)
    } else {
      console.log(`Total de clientes encontrados: ${clientesAracati?.length || 0}`)
      
      if (clientesAracati && clientesAracati.length > 0) {
        // Contar clientes sem venda há mais de 90 dias
        const clientesSemVenda90d = clientesAracati.filter(cliente => 
          cliente.dias_sem_compra && cliente.dias_sem_compra > 90
        )
        
        console.log(`Clientes sem venda há mais de 90 dias: ${clientesSemVenda90d.length}`)
        
        console.log('\nPrimeiros 5 clientes:')
        clientesAracati.slice(0, 5).forEach((cliente, index) => {
          console.log(`${index + 1}. ${cliente.nome_fantasia} - Última compra: ${cliente.ultima_compra || 'N/A'} - Dias sem compra: ${cliente.dias_sem_compra || 'N/A'}`)
        })
        
        if (clientesSemVenda90d.length > 0) {
          console.log('\nClientes sem venda há mais de 90 dias:')
          clientesSemVenda90d.slice(0, 5).forEach((cliente, index) => {
            console.log(`${index + 1}. ${cliente.nome_fantasia} - Dias sem compra: ${cliente.dias_sem_compra}`)
          })
        }
      }
    }
    
    // 3. Verificar se há diferença na contagem
    console.log('\n3. 🔍 Comparação de dados:')
    if (metricasRota && metricasRota.length > 0 && clientesAracati) {
      const rotaMetricas = metricasRota[0]
      const totalOticasViaView = rotaMetricas.total_clientes
      const totalOticasViaQuery = clientesAracati.length
      const semVenda90dViaView = rotaMetricas.clientes_sem_venda_90d
      const semVenda90dViaQuery = clientesAracati.filter(c => c.dias_sem_compra && c.dias_sem_compra > 90).length
      
      console.log(`📊 Via vw_metricas_por_rota: ${totalOticasViaView} óticas, ${semVenda90dViaView} sem venda 90d`)
      console.log(`👥 Via vw_clientes_completo: ${totalOticasViaQuery} óticas, ${semVenda90dViaQuery} sem venda 90d`)
      
      if (totalOticasViaView !== totalOticasViaQuery) {
        console.log('⚠️ INCONSISTÊNCIA DETECTADA no total de óticas!')
      }
      
      if (semVenda90dViaView !== semVenda90dViaQuery) {
        console.log('⚠️ INCONSISTÊNCIA DETECTADA no total de óticas sem venda 90d!')
      }
      
      if (totalOticasViaView === totalOticasViaQuery && semVenda90dViaView === semVenda90dViaQuery) {
        console.log('✅ Dados estão consistentes entre as duas fontes')
      }
    }
    
    // 4. Verificar se existe problema de RLS ou filtros diferentes
    console.log('\n4. 🔐 Verificando possíveis problemas de RLS:')
    
    // Testar consulta direta na tabela clientes se existir
    try {
      const { data: clientesTabela, error: errorTabelaClientes } = await supabase
        .from('clientes')
        .select('codigo_cliente, nome_fantasia, cidade')
        .ilike('cidade', '%aracati%')
        .limit(5)
      
      if (errorTabelaClientes) {
        console.log('❌ Não foi possível acessar tabela clientes diretamente (pode ser RLS)')
      } else {
        console.log(`✅ Acesso direto à tabela clientes: ${clientesTabela?.length || 0} registros`)
      }
    } catch (err) {
      console.log('❌ Erro ao acessar tabela clientes:', err.message)
    }
    
  } catch (error) {
    console.error('💥 Erro geral no teste:', error)
  }
}

// Executar o teste
testarOticasAracati()