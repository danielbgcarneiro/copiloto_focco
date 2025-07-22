// =============================================================================
// DEBUG: Investigar duplicação de rotas no ranking
// =============================================================================
// Este script ajuda a identificar por que a rota "João Pessoa / Litoral" 
// está sendo duplicada ou por que existe uma rota vazia
// =============================================================================

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function investigarRotasDuplicadas() {
  try {
    console.log('🔍 INVESTIGANDO ROTAS DUPLICADAS')
    console.log('=' .repeat(50))
    
    // 1. Buscar dados brutos da view
    console.log('\n📊 1. DADOS BRUTOS DA VIEW vw_ranking_rotas:')
    const { data: dadosBrutos, error: errorBrutos } = await supabase
      .from('vw_ranking_rotas')
      .select('*')
      .order('percentual_meta', { ascending: false })
    
    if (errorBrutos) {
      console.error('❌ Erro ao buscar dados brutos:', errorBrutos)
      return
    }
    
    console.log(`📈 Total de registros encontrados: ${dadosBrutos?.length || 0}`)
    
    if (dadosBrutos && dadosBrutos.length > 0) {
      console.log('\n📋 Todos os registros:')
      dadosBrutos.forEach((rota, index) => {
        console.log(`${index + 1}. Rota: "${rota.rota || 'VAZIO'}" | Nome: "${rota.nome_rota || 'VAZIO'}" | Vendido: ${rota.vendido_2025} | Meta: ${rota.meta_2025} | %: ${rota.percentual_meta}%`)
      })
      
      // 2. Verificar duplicatas
      console.log('\n🔍 2. ANÁLISE DE DUPLICATAS:')
      const rotasContador = {}
      const rotasVazias = []
      
      dadosBrutos.forEach((rota, index) => {
        const nomeRota = rota.rota || 'ROTA_VAZIA'
        
        // Contar ocorrências
        if (rotasContador[nomeRota]) {
          rotasContador[nomeRota].count++
          rotasContador[nomeRota].indices.push(index)
        } else {
          rotasContador[nomeRota] = {
            count: 1,
            indices: [index],
            dados: rota
          }
        }
        
        // Identificar rotas vazias
        if (!rota.rota || rota.rota.trim() === '') {
          rotasVazias.push({
            index: index,
            dados: rota
          })
        }
      })
      
      // Mostrar duplicatas
      console.log('\n📊 CONTAGEM DE ROTAS:')
      Object.entries(rotasContador).forEach(([nomeRota, info]) => {
        const status = info.count > 1 ? '🚨 DUPLICADA' : '✅ ÚNICA'
        console.log(`${status} "${nomeRota}": ${info.count} ocorrência(s) nos índices ${info.indices.join(', ')}`)
        
        if (info.count > 1) {
          console.log('   📋 Dados de cada ocorrência:')
          info.indices.forEach(idx => {
            const dados = dadosBrutos[idx]
            console.log(`   ${idx}: Vendido=${dados.vendido_2025}, Meta=${dados.meta_2025}, %=${dados.percentual_meta}%, vendedor_uuid=${dados.vendedor_uuid}`)
          })
        }
      })
      
      // Mostrar rotas vazias
      if (rotasVazias.length > 0) {
        console.log('\n⚠️  ROTAS VAZIAS ENCONTRADAS:')
        rotasVazias.forEach(item => {
          console.log(`   Índice ${item.index}: vendedor_uuid=${item.dados.vendedor_uuid}, vendido=${item.dados.vendido_2025}, meta=${item.dados.meta_2025}`)
        })
      }
      
      // 3. Verificar "João Pessoa / Litoral" especificamente
      console.log('\n🎯 3. ANÁLISE ESPECÍFICA DA ROTA "João Pessoa / Litoral":')
      const joaoPessoa = dadosBrutos.filter(rota => 
        rota.rota && rota.rota.toLowerCase().includes('joão pessoa')
      )
      
      if (joaoPessoa.length > 0) {
        console.log(`📍 Encontradas ${joaoPessoa.length} ocorrência(s) de "João Pessoa / Litoral":`)
        joaoPessoa.forEach((rota, idx) => {
          console.log(`   ${idx + 1}: "${rota.rota}" | Vendido: ${rota.vendido_2025} | Meta: ${rota.meta_2025} | %: ${rota.percentual_meta}% | UUID: ${rota.vendedor_uuid}`)
        })
      } else {
        console.log('❌ Nenhuma rota "João Pessoa" encontrada')
      }
      
      // 4. Verificar possíveis problemas na view
      console.log('\n🔧 4. POSSÍVEIS PROBLEMAS IDENTIFICADOS:')
      
      const problemas = []
      
      if (rotasVazias.length > 0) {
        problemas.push(`${rotasVazias.length} rota(s) com nome vazio`)
      }
      
      const duplicadas = Object.values(rotasContador).filter(info => info.count > 1)
      if (duplicadas.length > 0) {
        problemas.push(`${duplicadas.length} rota(s) duplicada(s)`)
      }
      
      if (problemas.length > 0) {
        console.log('🚨 PROBLEMAS ENCONTRADOS:')
        problemas.forEach(problema => console.log(`   - ${problema}`))
        
        console.log('\n💡 POSSÍVEIS CAUSAS:')
        console.log('   - View vw_ranking_rotas pode estar fazendo JOIN incorreto')
        console.log('   - Dados inconsistentes na tabela base (rotas NULL ou duplicadas)')
        console.log('   - RLS (Row Level Security) pode estar causando problemas')
        console.log('   - Múltiplos registros para o mesmo vendedor em tabelas relacionadas')
        
        console.log('\n🔧 PRÓXIMOS PASSOS SUGERIDOS:')
        console.log('   1. Verificar definição da view vw_ranking_rotas')
        console.log('   2. Analisar tabelas base (clientes, vendas, rotas)')
        console.log('   3. Verificar se há vendedores com múltiplas rotas')
        console.log('   4. Testar query da view diretamente no SQL')
      } else {
        console.log('✅ Nenhum problema óbvio encontrado nos dados')
      }
      
    } else {
      console.log('⚠️ Nenhum dado encontrado na view')
    }
    
  } catch (error) {
    console.error('💥 Erro durante investigação:', error)
  }
}

// Executar investigação
investigarRotasDuplicadas()