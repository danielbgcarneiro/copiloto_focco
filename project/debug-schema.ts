/**
 * Script para debugar a estrutura das tabelas do Supabase
 * Execute no console do navegador para ver a estrutura real das tabelas
 */

import { supabase } from './src/lib/supabase';

export async function debugSchema() {
  try {
    console.log('🔍 Inspecionando estrutura das tabelas...\n');

    // 1. Inspecionar tabela_clientes
    console.log('📋 === TABELA: tabela_clientes ===');
    const { data: clientesAmostra, error: erroClientes } = await supabase
      .from('tabela_clientes')
      .select('*')
      .limit(1);

    if (erroClientes) {
      console.error('❌ Erro ao buscar tabela_clientes:', erroClientes.message);
    } else if (clientesAmostra && clientesAmostra.length > 0) {
      console.log('✅ Colunas encontradas:');
      console.table(Object.keys(clientesAmostra[0]));
      console.log('Primeira linha completa:', clientesAmostra[0]);
    } else {
      console.log('⚠️ Tabela vazia');
    }

    // 2. Inspecionar profiles
    console.log('\n📋 === TABELA: profiles ===');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profileAmostra, error: erroProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .limit(1);

      if (erroProfile) {
        console.error('❌ Erro ao buscar profiles:', erroProfile.message);
      } else if (profileAmostra && profileAmostra.length > 0) {
        console.log('✅ Colunas encontradas:');
        console.table(Object.keys(profileAmostra[0]));
        console.log('Seu profile:', profileAmostra[0]);
      } else {
        console.log('⚠️ Perfil não encontrado para user.id:', user.id);
      }
    }

    // 3. Inspecionar analise_rfm
    console.log('\n📋 === TABELA: analise_rfm ===');
    const { data: rfmAmostra, error: erroRfm } = await supabase
      .from('analise_rfm')
      .select('*')
      .limit(1);

    if (erroRfm) {
      console.error('❌ Erro ao buscar analise_rfm:', erroRfm.message);
    } else if (rfmAmostra && rfmAmostra.length > 0) {
      console.log('✅ Colunas encontradas:');
      console.table(Object.keys(rfmAmostra[0]));
      console.log('Primeira linha:', rfmAmostra[0]);
      console.log('\n📊 Valores únicos de "perfil":', 
        (await supabase.from('analise_rfm').select('perfil').limit(100))?.data?.map((d: any) => d.perfil)
      );
    } else {
      console.log('⚠️ Tabela vazia');
    }

    console.log('\n✅ Debug completo! Copie as informações acima para reportar o problema.');
  } catch (error) {
    console.error('💥 Erro durante debug:', error);
  }
}

// Para usar no console:
// 1. Abra F12 (DevTools)
// 2. Vá para a aba "Console"
// 3. Copie e cole este código, depois execute: debugSchema()
