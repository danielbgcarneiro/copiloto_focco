/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */

import { supabase } from '../supabase'

/**
 * Interface para dados resumidos de títulos do cliente
 */
export interface TitulosClienteResumo {
  qtd_titulos: number
  ultima_data_vencimento: string | null
}

/**
 * Interface para título individual
 */
export interface TituloAberto {
  numero_titulo: number
  data_vencimento: string
  valor_titulo: number
  dias_atraso: number
}

/**
 * Busca resumo de títulos abertos de um cliente
 * Retorna quantidade total e última data de vencimento
 *
 * @param codigoCliente - Código do cliente
 * @returns Resumo dos títulos ou null se não houver títulos
 */
export async function getTitulosClienteResumo(codigoCliente: number): Promise<TitulosClienteResumo | null> {
  try {
    const { data, error } = await supabase
      .from('titulos_aberto_clientes')
      .select('data_vencimento')
      .eq('codigo_cliente', codigoCliente)

    if (error) {
      console.error('Erro ao buscar títulos do cliente:', error)
      throw error
    }

    // Se não houver títulos, retorna null
    if (!data || data.length === 0) {
      return null
    }

    // Calcular quantidade e última data de vencimento
    const qtd_titulos = data.length

    // Encontrar a data de vencimento mais recente (maior data)
    const datasVencimento = data
      .map(t => t.data_vencimento)
      .filter(d => d !== null)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    const ultima_data_vencimento = datasVencimento.length > 0 ? datasVencimento[0] : null

    return {
      qtd_titulos,
      ultima_data_vencimento
    }
  } catch (error) {
    console.error('Erro ao buscar resumo de títulos:', error)
    return null
  }
}

/**
 * Busca todos os títulos abertos de um cliente
 * Retorna lista completa ordenada por data de vencimento
 *
 * @param codigoCliente - Código do cliente
 * @returns Array de títulos ou array vazio se não houver títulos
 */
export async function getTitulosClienteDetalhes(codigoCliente: number): Promise<TituloAberto[]> {
  try {
    const { data, error } = await supabase
      .from('titulos_aberto_clientes')
      .select('numero_titulo, data_vencimento, valor_titulo, dias_atraso')
      .eq('codigo_cliente', codigoCliente)
      .order('data_vencimento', { ascending: true })

    if (error) {
      console.error('Erro ao buscar títulos do cliente:', error)
      throw error
    }

    // Se não houver títulos, retorna array vazio
    if (!data || data.length === 0) {
      return []
    }

    return data
  } catch (error) {
    console.error('Erro ao buscar detalhes de títulos:', error)
    return []
  }
}
