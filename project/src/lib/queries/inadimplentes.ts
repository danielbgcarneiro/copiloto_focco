import { supabase } from '../supabase';

export interface TituloAberto {
  numero: string;
  vencimento: string;
  valor: number;
  dias_atraso: number;
}

export interface ClienteInadimplente {
  codigo_cliente: number;
  nome_fantasia: string;
  cidade: string;
  rota: string;
  status_financeiro: string;
  valor_total_titulos: number;
  qtd_titulos_abertos: number;
  maior_dias_atraso: number;
  ultimo_pagamento: string | null;
  telefone: string | null;
  titulos: TituloAberto[];
}

// Função auxiliar para buscar valor de inadimplência específico por cliente
async function getValorInadimplenciaCliente(codigoCliente: number): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('vw_inadimplentes_resumo')
      .select('valor_total')
      .eq('codigo_cliente', codigoCliente)
      .single();
    
    if (error) {
      console.warn(`⚠️ Erro ao buscar valor de inadimplência para cliente ${codigoCliente}:`, error);
      return 0;
    }
    
    return Number(data?.valor_total || 0);
  } catch (error) {
    console.warn(`⚠️ Erro ao buscar valor de inadimplência para cliente ${codigoCliente}:`, error);
    return 0;
  }
}

export async function getClientesInadimplentes(): Promise<ClienteInadimplente[]> {
  try {
    // Buscar dados do usuário atual (padrão das outras queries)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    console.log('🚨 Buscando inadimplentes para vendedor:', { userId: user.id });

    // Buscar clientes inadimplentes da view com filtro por vendedor
    const { data: clientes, error: clientesError } = await supabase
      .from('vw_clientes_completo')
      .select('*')
      .eq('vendedor_uuid', user.id)  // ✅ FILTRO AUSENTE ADICIONADO!
      .eq('status_financeiro', 'INADIMPLENTE')
      .order('dias_sem_comprar', { ascending: false });
    
    if (clientesError) {
      console.error('Erro ao buscar clientes inadimplentes:', clientesError);
      throw clientesError;
    }
    
    if (!clientes || clientes.length === 0) {
      return [];
    }
    
    // Buscar todos os títulos em uma única query otimizada
    const { data: todosTitulos, error: titulosError } = await supabase
      .from('vw_inadimplentes')
      .select('codigo_cliente, titulo_uuid, data_vencimento, valor_original, dias_atraso')
      .in('codigo_cliente', clientes.map(c => c.codigo_cliente))
      .order('codigo_cliente', { ascending: true })
      .order('data_vencimento', { ascending: true });
    
    if (titulosError) {
      console.warn('⚠️ Erro ao buscar títulos de inadimplentes:', titulosError);
    }
    
    // Agrupar títulos por cliente
    const titulosPorCliente: { [key: number]: TituloAberto[] } = (todosTitulos || []).reduce((acc, titulo) => {
      if (!acc[titulo.codigo_cliente]) acc[titulo.codigo_cliente] = [];
      acc[titulo.codigo_cliente].push({
        numero: titulo.titulo_uuid,
        vencimento: new Date(titulo.data_vencimento).toLocaleDateString('pt-BR'),
        valor: titulo.valor_original,
        dias_atraso: titulo.dias_atraso
      });
      return acc;
    }, {} as { [key: number]: TituloAberto[] });

    // Mapear clientes com seus títulos e valores
    const clientesComTitulos = await Promise.all(
      clientes.map(async (cliente) => {
        // Buscar valor real de inadimplência para este cliente específico
        const valorInadimplencia = await getValorInadimplenciaCliente(cliente.codigo_cliente);
        
        return {
          codigo_cliente: cliente.codigo_cliente,
          nome_fantasia: cliente.nome_fantasia,
          cidade: cliente.cidade || 'Sem cidade',
          rota: cliente.rota || 'Sem rota',
          status_financeiro: cliente.status_financeiro,
          valor_total_titulos: valorInadimplencia, // ✅ Valor real da inadimplência
          qtd_titulos_abertos: (titulosPorCliente[cliente.codigo_cliente] || []).length,
          maior_dias_atraso: cliente.dias_sem_comprar || 0,
          ultimo_pagamento: null, // TODO: Buscar da vw_inadimplentes quando disponível
          telefone: cliente.celular || null,
          titulos: titulosPorCliente[cliente.codigo_cliente] || [] // ✅ Títulos reais
        };
      })
    );
    
    return clientesComTitulos;
  } catch (error) {
    console.error('Erro ao buscar inadimplentes:', error);
    throw error;
  }
}

// Função para classificar status baseado nos dias de atraso
export function getStatusInadimplencia(diasAtraso: number): {
  status: string;
  statusColor: string;
  prioridade: number;
} {
  if (diasAtraso > 90) {
    return { 
      status: 'Crítico', 
      statusColor: 'bg-red-100 text-red-800',
      prioridade: 4
    };
  } else if (diasAtraso > 60) {
    return { 
      status: 'Alto', 
      statusColor: 'bg-orange-100 text-orange-800',
      prioridade: 3
    };
  } else if (diasAtraso > 30) {
    return { 
      status: 'Médio', 
      statusColor: 'bg-yellow-100 text-yellow-800',
      prioridade: 2
    };
  } else {
    return { 
      status: 'Baixo', 
      statusColor: 'bg-blue-100 text-blue-800',
      prioridade: 1
    };
  }
}

// Função para formatar telefone
export function formatarTelefone(telefone: string | null): string {
  if (!telefone) return 'N/A';
  
  // Remove caracteres não numéricos
  const numeros = telefone.replace(/\D/g, '');
  
  if (numeros.length === 11) {
    // Celular com 9 dígitos: (11) 99999-9999
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  } else if (numeros.length === 10) {
    // Telefone fixo: (11) 9999-9999
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }
  
  return telefone;
}