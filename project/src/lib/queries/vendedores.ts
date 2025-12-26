/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import { supabase } from '../supabase';

export interface VendedorProfile {
  id: string;
  cod_vendedor: number | null;
  nome_completo: string;
  apelido: string | null;
  cargo: string | null;
  status: string | null;
  vendedor_responsavel: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export async function getAllVendedores(): Promise<VendedorProfile[] | null> {
  try {
    console.log('👥 Buscando todos os vendedores...');
    const { data, error } = await supabase
      .from('profiles')
      .select('id, cod_vendedor, nome_completo, apelido, cargo, status, vendedor_responsavel, created_at, updated_at')
      .eq('cargo', 'vendedor');

    if (error) {
      console.error('❌ Erro ao buscar todos os vendedores:', error);
      throw error;
    }

    if (!data) {
      console.log('⚠️ Nenhum vendedor encontrado.');
      return null;
    }

    console.log('✅ Vendedores encontrados:', data.length);
    return data as VendedorProfile[];
  } catch (error) {
    console.error('💥 Erro ao buscar todos os vendedores:', error);
    throw error;
  }
}

export interface VendedorRanking {
  vendedor_uuid: string;
  cod_vendedor: string;
  nome_completo: string;
  apelido: string;
  total_clientes: number;
  clientes_sem_vendas_90d: number;
  vendas_ano: number;
  meta_ano: number;
  percentual_meta: number;
  total_inadimplencia: number;
}


export async function getVendedorRanking(): Promise<VendedorRanking | null> {
  try {
    console.log('👨‍💼 Iniciando busca de ranking do vendedor...');
    
    // Buscar dados do usuário atual
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
              throw new Error('Usuário não autenticado');
            }
        
            // Buscar dados da view vw_ranking_vendedores usando o vendedor_uuid
            const { data, error } = await supabase
              .from('vw_ranking_vendedores')
              .select('*')
              .eq('vendedor_uuid', user.id)
              .single();
            
            if (error) {
              if (error.code === 'PGRST116') {
                return null;
              }
              console.error('❌ Erro ao buscar ranking do vendedor:', error);
              throw error;
            }
            
            const vendedorRanking: VendedorRanking = {
              vendedor_uuid: data.vendedor_uuid,
              cod_vendedor: data.cod_vendedor,
              nome_completo: data.nome_completo,
              apelido: data.apelido,
              total_clientes: Number(data.total_clientes || 0),
              clientes_sem_vendas_90d: Number(data['+90d'] || 0),
              vendas_ano: Number(data.vendas_ano || 0),
              meta_ano: Number(data.meta_ano || 0),
              percentual_meta: Number(data.percentual_meta || 0),
              total_inadimplencia: Number(data.total_inadimplencia || 0)
            };
            
            return vendedorRanking;      } catch (error) {
        console.error('💥 Erro ao buscar ranking do vendedor:', error);
        throw error;
      }
    }
    
    export interface OticasSemVendas180d {
      count: number;
      clientesAtendidosAnoCount: number; // Novo campo
    }
    
    export async function getOticasSemVendas180d(): Promise<OticasSemVendas180d | null> {
      try {
        console.log('📉 Buscando óticas sem vendas +180 dias e clientes atendidos no ano...');
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('Usuário não autenticado para buscar óticas sem vendas.');
        }
    
        // Consulta única para todos os clientes da view para o vendedor atual
        const { data: oticasData, error: oticasError } = await supabase
          .from('vw_oticas_sem_vendas_180d')
          .select('dias_sem_comprar, compra_ano_corrente') // Selecionando as colunas necessárias
          .eq('vendedor_uuid', user.id); // Sem .single() pois esperamos múltiplos resultados
        
        if (oticasError) {
          console.error('❌ Erro ao buscar dados de óticas da view:', oticasError);
          throw oticasError;
        }
    
        if (!oticasData || oticasData.length === 0) {
          return { count: 0, clientesAtendidosAnoCount: 0 };
        }
    
        // Processar os dados localmente
        const semVendas180dTotal = oticasData.filter(
          (otica: any) => otica.dias_sem_comprar > 180
        ).length;
    
        const clientesAtendidosAnoTotal = oticasData.filter(
          (otica: any) => otica.compra_ano_corrente === 'SIM'
        ).length;
        
        return { 
          count: semVendas180dTotal,
          clientesAtendidosAnoCount: clientesAtendidosAnoTotal
        };

  } catch (error) {
    console.error('💥 Erro na função getOticasSemVendas180d:', error);
    throw error;
  }
}