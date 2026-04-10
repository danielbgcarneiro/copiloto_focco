/**
 * Copiloto Focco Brasil
 * Hook: useTelefones — gestão de telefones por cliente (Story 3.4)
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface Telefone {
  id: string
  codigo_cliente: number
  numero: string
  tipo: 'celular' | 'fixo' | 'whatsapp' | 'outro'
  descricao: string | null
  whatsapp_habilitado: boolean
  adicionado_por: string | null  // null = importado do ERP
  origem?: 'erp' | 'manual'
  ativo: boolean
  created_at: string | null
}

export interface AdicionarTelefoneParams {
  codigoCliente: number
  numero: string
  tipo: Telefone['tipo']
  descricao?: string
  whatsappHabilitado: boolean
}

export function useTelefones(codigoCliente: number) {
  const [telefones, setTelefones] = useState<Telefone[]>([])
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Obter userId uma vez
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  const carregar = useCallback(async () => {
    if (!codigoCliente) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('telefones_clientes')
        .select('*')
        .eq('codigo_cliente', codigoCliente)
        .eq('ativo', true)
        .order('created_at', { ascending: true })

      if (error) throw error
      setTelefones((data as Telefone[]) ?? [])
    } catch {
      setTelefones([])
    } finally {
      setLoading(false)
    }
  }, [codigoCliente])

  useEffect(() => {
    carregar()
  }, [carregar])

  const adicionarTelefone = useCallback(async (params: AdicionarTelefoneParams) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    const { data, error } = await supabase
      .from('telefones_clientes')
      .insert({
        codigo_cliente: params.codigoCliente,
        numero: params.numero.replace(/\D/g, ''),
        tipo: params.tipo,
        descricao: params.descricao || null,
        whatsapp_habilitado: params.whatsappHabilitado,
        adicionado_por: user.id,
        ativo: true,
      })
      .select()
      .single()

    if (error) throw error
    await carregar()
    return data as Telefone
  }, [carregar])

  const desativarTelefone = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('telefones_clientes')
      .update({ ativo: false })
      .eq('id', id)

    if (error) throw error
    await carregar()
  }, [carregar])

  return {
    telefones,
    loading,
    userId,
    adicionarTelefone,
    desativarTelefone,
    refresh: carregar,
  }
}
