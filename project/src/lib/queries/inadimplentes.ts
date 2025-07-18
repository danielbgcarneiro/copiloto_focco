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
async function getValorInadimplenciaCliente(codigoCliente: number, userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('vw_titulos_vencidos_detalhado')
      .select('valor_saldo')
      .eq('codigo_cliente', codigoCliente)
      .eq('vendedor_uuid', userId);
    
    if (error) {
      console.warn(`⚠️ Erro ao buscar valor de inadimplência para cliente ${codigoCliente}:`, error);
      return 0;
    }
    
    // Somar todos os valores de títulos do cliente
    const valorTotal = (data || []).reduce((sum, titulo) => sum + (titulo.valor_saldo || 0), 0);
    return valorTotal;
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

    // Buscar TODOS os dados da nova view com RLS automático
    const { data: dadosInadimplentes, error: inadimplentesError } = await supabase
      .from('vw_titulos_vencidos_detalhado')
      .select('*')
      .eq('vendedor_uuid', user.id)
      .order('dias_atraso', { ascending: false });
    
    if (inadimplentesError) {
      console.error('Erro ao buscar inadimplentes:', inadimplentesError);
      throw inadimplentesError;
    }
    
    if (!dadosInadimplentes || dadosInadimplentes.length === 0) {
      return [];
    }
    
    // Agrupar dados por cliente
    const clientesMap = new Map<number, any>();
    const titulosPorCliente: { [key: number]: TituloAberto[] } = {};
    
    dadosInadimplentes.forEach(registro => {
      const codigoCliente = registro.codigo_cliente;
      
      // Armazenar dados do cliente (será sobrescrito, mas são iguais)
      if (!clientesMap.has(codigoCliente)) {
        clientesMap.set(codigoCliente, {
          codigo_cliente: registro.codigo_cliente,
          nome_fantasia: registro.nome_fantasia,
          cidade: registro.cidade || 'Sem cidade',
          rota: registro.rota || 'Sem rota',
          celular: registro.celular
        });
        titulosPorCliente[codigoCliente] = [];
      }
      
      // Adicionar título
      titulosPorCliente[codigoCliente].push({
        numero: registro.titulo_uuid,
        vencimento: new Date(registro.data_vencimento).toLocaleDateString('pt-BR'),
        valor: registro.valor_saldo || registro.valor_original,
        dias_atraso: registro.dias_atraso
      });
    });
    
    // Mapear para o formato final
    const clientesComTitulos: ClienteInadimplente[] = Array.from(clientesMap.values()).map(cliente => {
      const titulos = titulosPorCliente[cliente.codigo_cliente] || [];
      const valorTotal = titulos.reduce((sum, titulo) => sum + titulo.valor, 0);
      const maiorDiasAtraso = Math.max(...titulos.map(t => t.dias_atraso), 0);
      
      return {
        codigo_cliente: cliente.codigo_cliente,
        nome_fantasia: cliente.nome_fantasia,
        cidade: cliente.cidade,
        rota: cliente.rota,
        status_financeiro: 'INADIMPLENTE',
        valor_total_titulos: valorTotal,
        qtd_titulos_abertos: titulos.length,
        maior_dias_atraso: maiorDiasAtraso,
        ultimo_pagamento: null,
        telefone: cliente.celular || null,
        titulos: titulos
      };
    });
    
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