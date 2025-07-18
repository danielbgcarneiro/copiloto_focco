import { supabase } from '../supabase';

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

    console.log('👨‍💼 Buscando ranking para vendedor:', { userId: user.id, email: user.email });

    // Buscar dados da view vw_ranking_vendedores usando o vendedor_uuid
    const { data, error } = await supabase
      .from('vw_ranking_vendedores')
      .select('*')
      .eq('vendedor_uuid', user.id)
      .single();
    
    console.log('👨‍💼 Resposta da view vw_ranking_vendedores:', { data, error, userId: user.id });
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️ Nenhum ranking encontrado para o vendedor atual');
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
    
    console.log('✅ Ranking do vendedor processado:', vendedorRanking);
    return vendedorRanking;
  } catch (error) {
    console.error('💥 Erro ao buscar ranking do vendedor:', error);
    throw error;
  }
}