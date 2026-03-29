/**
 * Copiloto Focco Brasil
 * Hook: useVisitas — Registro e consulta de visitas (Story 3.2 + 3.3)
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface MotivoNaoVenda {
  id: number
  descricao: string
  codigo_canonico: string
  ordem: number
}

export interface Visita {
  id: string
  vendedor_id: string
  codigo_cliente: number
  data_visita: string
  resultado: 'vendeu' | 'nao_vendeu' | 'ausente' | 'reagendou'
  motivo_nao_venda_id: number | null
  observacoes: string | null
  valor_realizado: number | null
  origem: 'manual' | 'automatica_venda'
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface RegistrarVisitaParams {
  vendedorId: string
  codigoCliente: number
  resultado: 'vendeu' | 'nao_vendeu' | 'ausente' | 'reagendou'
  motivoNaoVendaId?: number | null
  observacoes?: string | null
  valorRealizado?: number | null
  rfmPerfilSnapshot?: string | null
  rfmOportunidadeSnapshot?: number | null
  rfmDsvSnapshot?: number | null
}

export interface Agendamento {
  id: string
  vendedor_id: string
  codigo_cliente: number
  data_agendada: string
  valor_previsto: number | null
  status: 'pendente' | 'realizado' | 'cancelado' | 'reagendado'
  observacoes: string | null
  visita_id: string | null
  created_at: string
  updated_at: string
}

export interface CriarAgendamentoParams {
  vendedorId: string
  codigoCliente: number
  dataAgendada: string
  valorPrevisto?: number | null
  observacoes?: string | null
}

export interface EditarAgendamentoParams {
  dataAgendada?: string
  valorPrevisto?: number | null
  observacoes?: string | null
}

// Re-exportados de agendaUtils (Story 3.10 — fonte única de verdade)
export { calcularSugestaoData } from '../utils/agendaUtils'
export type { SugestaoData } from '../utils/agendaUtils'

export function useVisitas(codigoCliente: number) {
  const [visitaHoje, setVisitaHoje] = useState<Visita | null>(null)
  const [ultimasVisitas, setUltimasVisitas] = useState<Visita[]>([])
  const [proximoAgendamento, setProximoAgendamento] = useState<Agendamento | null>(null)
  const [motivos, setMotivos] = useState<MotivoNaoVenda[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMotivos, setLoadingMotivos] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hoje = new Date().toISOString().split('T')[0]

  const getVisitaHoje = useCallback(async () => {
    const { data, error } = await supabase
      .from('visitas')
      .select('*')
      .eq('codigo_cliente', codigoCliente)
      .eq('data_visita', hoje)
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as Visita | null
  }, [codigoCliente, hoje])

  const getUltimasVisitas = useCallback(async (limit = 5) => {
    const { data, error } = await supabase
      .from('visitas')
      .select('*')
      .eq('codigo_cliente', codigoCliente)
      .eq('ativo', true)
      .order('data_visita', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data ?? []) as Visita[]
  }, [codigoCliente])

  const registrarVisita = useCallback(async (params: RegistrarVisitaParams): Promise<Visita> => {
    const { data, error } = await supabase
      .from('visitas')
      .insert({
        vendedor_id: params.vendedorId,
        codigo_cliente: params.codigoCliente,
        data_visita: hoje,
        resultado: params.resultado,
        motivo_nao_venda_id: params.motivoNaoVendaId ?? null,
        observacoes: params.observacoes ?? null,
        valor_realizado: params.valorRealizado ?? null,
        origem: 'manual',
        rfm_perfil_snapshot: params.rfmPerfilSnapshot ?? null,
        rfm_oportunidade_snapshot: params.rfmOportunidadeSnapshot ?? null,
        rfm_dsv_snapshot: params.rfmDsvSnapshot ?? null,
        // snapshots ML e campos temporais preenchidos via trigger no banco
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Visita
  }, [hoje])

  const getProximoAgendamento = useCallback(async () => {
    const hoje = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('codigo_cliente', codigoCliente)
      .eq('status', 'pendente')
      .gte('data_agendada', hoje)
      .order('data_agendada', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as Agendamento | null
  }, [codigoCliente])

  const criarAgendamento = useCallback(async (params: CriarAgendamentoParams): Promise<Agendamento> => {
    const { data, error } = await supabase
      .from('agendamentos')
      .insert({
        vendedor_id: params.vendedorId,
        codigo_cliente: params.codigoCliente,
        data_agendada: params.dataAgendada,
        valor_previsto: params.valorPrevisto ?? null,
        observacoes: params.observacoes ?? null,
        status: 'pendente',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Agendamento
  }, [])

  const editarAgendamento = useCallback(async (id: string, params: EditarAgendamentoParams): Promise<Agendamento> => {
    const payload: Record<string, unknown> = {}
    if (params.dataAgendada !== undefined) payload.data_agendada = params.dataAgendada
    if (params.valorPrevisto !== undefined) payload.valor_previsto = params.valorPrevisto
    if (params.observacoes !== undefined) payload.observacoes = params.observacoes

    const { data, error } = await supabase
      .from('agendamentos')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Agendamento
  }, [])

  const cancelarAgendamento = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', id)

    if (error) throw new Error(error.message)
  }, [])

  const carregarMotivos = useCallback(async () => {
    setLoadingMotivos(true)
    try {
      const { data, error } = await supabase
        .from('motivos_nao_venda')
        .select('id, descricao, codigo_canonico, ordem')
        .eq('ativo', true)
        .order('ordem', { ascending: true })

      if (error) throw new Error(error.message)
      setMotivos((data ?? []) as MotivoNaoVenda[])
    } catch {
      // motivos não são críticos — falha silenciosa
    } finally {
      setLoadingMotivos(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [visita, ultimas, agendamento] = await Promise.all([
        getVisitaHoje(),
        getUltimasVisitas(),
        getProximoAgendamento(),
      ])
      setVisitaHoje(visita)
      setUltimasVisitas(ultimas)
      setProximoAgendamento(agendamento)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar visitas')
    } finally {
      setLoading(false)
    }
  }, [getVisitaHoje, getUltimasVisitas, getProximoAgendamento])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    visitaHoje,
    ultimasVisitas,
    proximoAgendamento,
    motivos,
    loading,
    loadingMotivos,
    error,
    registrarVisita,
    criarAgendamento,
    editarAgendamento,
    cancelarAgendamento,
    carregarMotivos,
    refresh,
  }
}
