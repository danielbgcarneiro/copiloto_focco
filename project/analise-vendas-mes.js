const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://krisjvemfpnkmduebqdr.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyaXNqdmVtZnBua21kdWVicWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NTQ5MTMsImV4cCI6MjA2MzQzMDkxM30.jktcXSfSQfcfXUPTDuvu75GuUscMhpsYnvhfloRUf4I');

async function analisarEstrutura() {
  console.log('🔍 Analisando estrutura da tabela vendas_mes e view vw_dashboard_metricas...\n');
  
  try {
    // 1. Verificar tabela vendas_mes
    console.log('📊 Analisando tabela vendas_mes:');
    const { data: vendasMes, error: err1 } = await supabase
      .from('vendas_mes')
      .select('*')
      .limit(3);
      
    if (err1) {
      console.log('❌ Erro ao acessar vendas_mes:', err1.message);
    } else {
      console.log('✅ Tabela vendas_mes encontrada');
      if (vendasMes && vendasMes.length > 0) {
        console.log('📋 Colunas disponíveis:', Object.keys(vendasMes[0]));
        console.log('📋 Exemplos de registros:');
        vendasMes.forEach((row, idx) => {
          console.log(`  ${idx + 1}. `, row);
        });
      } else {
        console.log('⚠️ Tabela vazia');
      }
    }
    
    // 2. Verificar view vw_dashboard_metricas com dados reais
    console.log('\n📊 Analisando view vw_dashboard_metricas:');
    const { data: viewData, error: err2 } = await supabase
      .from('vw_dashboard_metricas')
      .select('*')
      .not('vendedor_id', 'is', null)
      .limit(3);
      
    if (err2) {
      console.log('❌ Erro ao acessar vw_dashboard_metricas:', err2.message);
    } else {
      console.log('✅ View vw_dashboard_metricas encontrada');
      if (viewData && viewData.length > 0) {
        console.log('📋 Colunas disponíveis:', Object.keys(viewData[0]));
        console.log('📋 Exemplos de registros (com vendedor_id):');
        viewData.forEach((row, idx) => {
          console.log(`  ${idx + 1}. `, row);
        });
      } else {
        console.log('⚠️ Sem dados com vendedor_id válido');
      }
    }
    
    // 3. Verificar se há relação entre elas usando SQL
    console.log('\n🔗 Verificando se view usa tabela vendas_mes...');
    const { data: relationCheck, error: err3 } = await supabase
      .rpc('get_view_definition', { view_name: 'vw_dashboard_metricas' });
      
    if (err3) {
      console.log('❌ Não foi possível verificar definição da view:', err3.message);
    } else {
      if (relationCheck && relationCheck.includes('vendas_mes')) {
        console.log('✅ A view vw_dashboard_metricas USA a tabela vendas_mes');
      } else {
        console.log('❌ A view vw_dashboard_metricas NÃO usa a tabela vendas_mes');
      }
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error.message);
  }
}

analisarEstrutura();