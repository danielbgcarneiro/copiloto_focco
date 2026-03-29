/**
 * Copiloto Focco Brasil
 * Hook: useAgenda — Dados de agendamentos para a tela Agenda (Stories 3.6 + 3.7)
 *
 * Prefetch: semana anterior + semana atual + próxima semana
 * Cache: localStorage com TTL de 30 min (fallback offline - AC13)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export interface AgendamentoDia {
  id: string
  codigo_cliente: number
  razao_social: string
  nome_fantasia: string | null
  data_agendada: string // YYYY-MM-DD
  status: 'pendente' | 'realizado' | 'cancelado'
  valor_previsto: number | null
  perfil_rfm: string | null // 'Ouro' | 'Prata' | 'Bronze' | null
  offline_pending?: boolean
}

// Keyed por 'YYYY-MM-DD'
export type AgendaCache = Record<string, AgendamentoDia[]>

export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay()) // volta para domingo
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const CACHE_KEY = 'copiloto_agenda_cache'
const CACHE_TTL = 1000 * 60 * 30 // 30 min

function readLocalCache(): AgendaCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const { data, ts } = JSON.parse(raw) as { data: AgendaCache; ts: number }
    if (Date.now() - ts > CACHE_TTL) return {}
    return data
  } catch {
    return {}
  }
}

function writeLocalCache(data: AgendaCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // ignorar erros de quota
  }
}

export function useAgenda(vendedorId: string | undefined) {
  const [cache, setCache] = useState<AgendaCache>(() => readLocalCache())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const fetchedWeeks = useRef(new Set<string>())

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const fetchWeek = useCallback(async (weekStart: Date) => {
    if (!vendedorId) return

    const weekKey = formatDate(weekStart)
    if (fetchedWeeks.current.has(weekKey)) return
    fetchedWeeks.current.add(weekKey)

    const endOfWeek = new Date(weekStart)
    endOfWeek.setDate(endOfWeek.getDate() + 6)
    const startStr = weekKey
    const endStr = formatDate(endOfWeek)

    setLoading(true)
    setError(null)

    try {
      // 1. Buscar agendamentos da semana (exceto cancelados)
      const { data: agendamentos, error: agErr } = await supabase
        .from('agendamentos')
        .select('id, codigo_cliente, data_agendada, status, valor_previsto')
        .eq('vendedor_id', vendedorId)
        .gte('data_agendada', startStr)
        .lte('data_agendada', endStr)
        .neq('status', 'cancelado')

      if (agErr) throw new Error(agErr.message)

      // Inicializar todos os 7 dias com array vazio
      const grouped: AgendaCache = {}
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + i)
        grouped[formatDate(d)] = []
      }

      const items = agendamentos ?? []

      if (items.length > 0) {
        const codigosCliente = [...new Set(items.map((a) => a.codigo_cliente))]

        // 2. Buscar nomes dos clientes
        const { data: clientes } = await supabase
          .from('tabela_clientes')
          .select('codigo_cliente, razao_social, nome_fantasia')
          .in('codigo_cliente', codigosCliente)

        const clienteMap = new Map<number, { razao_social: string; nome_fantasia: string | null }>()
        for (const c of clientes ?? []) {
          clienteMap.set(c.codigo_cliente, {
            razao_social: c.razao_social,
            nome_fantasia: c.nome_fantasia ?? null,
          })
        }

        // 3. Buscar perfil RFM mais recente por cliente
        const { data: rfmData } = await supabase
          .from('analise_rfm')
          .select('codigo_cliente, perfil')
          .in('codigo_cliente', codigosCliente)
          .order('data_analise', { ascending: false })

        const rfmMap = new Map<number, string>()
        for (const r of rfmData ?? []) {
          if (!rfmMap.has(r.codigo_cliente)) {
            rfmMap.set(r.codigo_cliente, r.perfil)
          }
        }

        // 4. Montar mapa agrupado por data
        for (const ag of items) {
          const client = clienteMap.get(ag.codigo_cliente)
          const entry: AgendamentoDia = {
            id: ag.id,
            codigo_cliente: ag.codigo_cliente,
            razao_social: client?.razao_social ?? `Cliente ${ag.codigo_cliente}`,
            nome_fantasia: client?.nome_fantasia ?? null,
            data_agendada: ag.data_agendada,
            status: ag.status,
            valor_previsto: ag.valor_previsto ?? null,
            perfil_rfm: rfmMap.get(ag.codigo_cliente) ?? null,
          }
          const key = ag.data_agendada
          if (key in grouped) {
            grouped[key].push(entry)
          }
        }
      }

      setCache((prev) => {
        const next = { ...prev, ...grouped }
        writeLocalCache(next)
        return next
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      // Remover da lista para permitir retry
      fetchedWeeks.current.delete(weekKey)
    } finally {
      setLoading(false)
    }
  }, [vendedorId])

  // Prefetch: semana anterior + atual + próxima (AC12)
  const prefetchAroundDate = useCallback(
    async (date: Date) => {
      if (!vendedorId) return
      const current = getWeekStart(date)
      const prev = new Date(current)
      prev.setDate(prev.getDate() - 7)
      const next = new Date(current)
      next.setDate(next.getDate() + 7)

      // Disparar em paralelo
      await Promise.all([fetchWeek(prev), fetchWeek(current), fetchWeek(next)])
    },
    [fetchWeek, vendedorId]
  )

  function getAgendamentosForDate(date: Date): AgendamentoDia[] {
    return cache[formatDate(date)] ?? []
  }

  // Invalida uma semana do cache para forçar re-fetch (usado após inserir agendamento)
  const invalidateWeek = useCallback(
    (date: Date) => {
      const weekKey = formatDate(getWeekStart(date))
      fetchedWeeks.current.delete(weekKey)
      fetchWeek(getWeekStart(date))
    },
    [fetchWeek]
  )

  // Story 3.12 — Fetch de todo o mês de uma vez (para visão mensal)
  const fetchMonth = useCallback(async (year: number, month: number) => {
    if (!vendedorId) return
    const monthStr = String(month + 1).padStart(2, '0')
    const startStr = `${year}-${monthStr}-01`
    const lastDayNum = new Date(year, month + 1, 0).getDate()
    const endStr = `${year}-${monthStr}-${String(lastDayNum).padStart(2, '0')}`

    setLoading(true)
    setError(null)

    try {
      const { data: agendamentos, error: agErr } = await supabase
        .from('agendamentos')
        .select('id, codigo_cliente, data_agendada, status, valor_previsto')
        .eq('vendedor_id', vendedorId)
        .gte('data_agendada', startStr)
        .lte('data_agendada', endStr)
        .neq('status', 'cancelado')

      if (agErr) throw new Error(agErr.message)

      const grouped: AgendaCache = {}
      for (let d = 1; d <= lastDayNum; d++) {
        grouped[`${year}-${monthStr}-${String(d).padStart(2, '0')}`] = []
      }

      const items = agendamentos ?? []
      if (items.length > 0) {
        const codigosCliente = [...new Set(items.map((a) => a.codigo_cliente))]

        const [clientesRes, rfmRes] = await Promise.all([
          supabase
            .from('tabela_clientes')
            .select('codigo_cliente, razao_social, nome_fantasia')
            .in('codigo_cliente', codigosCliente),
          supabase
            .from('analise_rfm')
            .select('codigo_cliente, perfil')
            .in('codigo_cliente', codigosCliente)
            .order('data_analise', { ascending: false }),
        ])

        const clienteMap = new Map<number, { razao_social: string; nome_fantasia: string | null }>()
        for (const c of clientesRes.data ?? []) {
          clienteMap.set(c.codigo_cliente, {
            razao_social: c.razao_social,
            nome_fantasia: c.nome_fantasia ?? null,
          })
        }

        const rfmMap = new Map<number, string>()
        for (const r of rfmRes.data ?? []) {
          if (!rfmMap.has(r.codigo_cliente)) rfmMap.set(r.codigo_cliente, r.perfil)
        }

        for (const ag of items) {
          const client = clienteMap.get(ag.codigo_cliente)
          const entry: AgendamentoDia = {
            id: ag.id,
            codigo_cliente: ag.codigo_cliente,
            razao_social: client?.razao_social ?? `Cliente ${ag.codigo_cliente}`,
            nome_fantasia: client?.nome_fantasia ?? null,
            data_agendada: ag.data_agendada,
            status: ag.status,
            valor_previsto: ag.valor_previsto ?? null,
            perfil_rfm: rfmMap.get(ag.codigo_cliente) ?? null,
          }
          if (ag.data_agendada in grouped) {
            grouped[ag.data_agendada].push(entry)
          }
        }
      }

      setCache((prev) => {
        const next = { ...prev, ...grouped }
        writeLocalCache(next)
        return next
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [vendedorId])

  return {
    getAgendamentosForDate,
    prefetchAroundDate,
    fetchWeek,
    fetchMonth,
    invalidateWeek,
    loading,
    error,
    isOffline,
    cache,
  }
}

// ─── Story 3.7 — Dados detalhados do dia ────────────────────────────────────

export interface AgendamentoDiaDetalhado {
  id: string
  codigo_cliente: number
  razao_social: string
  nome_fantasia: string | null
  cidade: string | null
  data_agendada: string
  status: 'pendente' | 'realizado' | 'cancelado'
  valor_previsto: number | null
  perfil_rfm: string | null
  dsv: number | null          // dias sem comprar
  oportunidade_rfm: number | null  // previsao_pedido RFM
  visita_resultado: 'vendeu' | 'nao_vendeu' | 'ausente' | 'reagendou' | null
  visita_valor_realizado: number | null
  visita_id: string | null
}

export interface ForecastSemana {
  planejado: number
  oportunidade: number
  metaSemana: number
  realizado: number
}

export async function getAgendamentosDia(
  data: string,
  vendedorId: string
): Promise<AgendamentoDiaDetalhado[]> {
  const { data: agendamentos, error: agErr } = await supabase
    .from('agendamentos')
    .select('id, codigo_cliente, data_agendada, status, valor_previsto, visita_id')
    .eq('vendedor_id', vendedorId)
    .eq('data_agendada', data)
    .neq('status', 'cancelado')

  if (agErr) throw new Error(agErr.message)
  if (!agendamentos?.length) return []

  const codigosCliente = [...new Set(agendamentos.map((a) => a.codigo_cliente))]
  const visitaIds = agendamentos.map((a) => a.visita_id).filter(Boolean) as string[]

  const [clientesRes, rfmRes, visitasRes] = await Promise.all([
    supabase
      .from('tabela_clientes')
      .select('codigo_cliente, razao_social, nome_fantasia, cidade')
      .in('codigo_cliente', codigosCliente),
    supabase
      .from('analise_rfm')
      .select('codigo_cliente, perfil, dias_sem_comprar, previsao_pedido')
      .in('codigo_cliente', codigosCliente)
      .order('data_analise', { ascending: false }),
    visitaIds.length > 0
      ? supabase
          .from('visitas')
          .select('id, resultado, valor_realizado')
          .in('id', visitaIds)
      : Promise.resolve({ data: [] }),
  ])

  const clienteMap = new Map<number, { razao_social: string; nome_fantasia: string | null; cidade: string | null }>()
  for (const c of clientesRes.data ?? []) {
    clienteMap.set(c.codigo_cliente, {
      razao_social: c.razao_social,
      nome_fantasia: c.nome_fantasia ?? null,
      cidade: c.cidade ?? null,
    })
  }

  const rfmMap = new Map<number, { perfil: string; dsv: number | null; oportunidade: number | null }>()
  for (const r of rfmRes.data ?? []) {
    if (!rfmMap.has(r.codigo_cliente)) {
      rfmMap.set(r.codigo_cliente, {
        perfil: r.perfil,
        dsv: r.dias_sem_comprar ?? null,
        oportunidade: r.previsao_pedido ?? null,
      })
    }
  }

  const visitaMap = new Map<string, { resultado: string; valor_realizado: number | null }>()
  for (const v of (visitasRes.data ?? []) as Array<{ id: string; resultado: string; valor_realizado: number | null }>) {
    visitaMap.set(v.id, { resultado: v.resultado, valor_realizado: v.valor_realizado })
  }

  return agendamentos.map((ag) => {
    const client = clienteMap.get(ag.codigo_cliente)
    const rfm = rfmMap.get(ag.codigo_cliente)
    const visita = ag.visita_id ? visitaMap.get(ag.visita_id) : null

    return {
      id: ag.id,
      codigo_cliente: ag.codigo_cliente,
      razao_social: client?.razao_social ?? `Cliente ${ag.codigo_cliente}`,
      nome_fantasia: client?.nome_fantasia ?? null,
      cidade: client?.cidade ?? null,
      data_agendada: ag.data_agendada,
      status: ag.status as AgendamentoDiaDetalhado['status'],
      valor_previsto: ag.valor_previsto ?? null,
      perfil_rfm: rfm?.perfil ?? null,
      dsv: rfm?.dsv ?? null,
      oportunidade_rfm: rfm?.oportunidade ?? null,
      visita_resultado: (visita?.resultado ?? null) as AgendamentoDiaDetalhado['visita_resultado'],
      visita_valor_realizado: visita?.valor_realizado ?? null,
      visita_id: ag.visita_id ?? null,
    }
  })
}

export async function getForecastSemana(
  weekStart: Date,
  vendedorId: string
): Promise<ForecastSemana> {
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
  const weekStr = formatDate(weekStart)
  const weekEndStr = formatDate(weekEnd)

  // Obter cod_vendedor do profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('cod_vendedor')
    .eq('id', vendedorId)
    .single()
  const codVendedor = profile?.cod_vendedor

  // Planejado: agendamentos pendentes da semana
  const { data: agendamentosSemana } = await supabase
    .from('agendamentos')
    .select('valor_previsto, codigo_cliente')
    .eq('vendedor_id', vendedorId)
    .gte('data_agendada', weekStr)
    .lte('data_agendada', weekEndStr)
    .eq('status', 'pendente')

  const planejado = (agendamentosSemana ?? []).reduce((sum, a) => sum + (a.valor_previsto ?? 0), 0)

  // Oportunidade: previsao_pedido dos clientes agendados (mais recente por cliente)
  const clienteIds = [...new Set((agendamentosSemana ?? []).map((a) => a.codigo_cliente))]
  let oportunidade = 0
  if (clienteIds.length > 0) {
    const { data: rfmSemana } = await supabase
      .from('analise_rfm')
      .select('codigo_cliente, previsao_pedido')
      .in('codigo_cliente', clienteIds)
      .order('data_analise', { ascending: false })

    const seen = new Set<number>()
    for (const r of rfmSemana ?? []) {
      if (!seen.has(r.codigo_cliente)) {
        seen.add(r.codigo_cliente)
        oportunidade += r.previsao_pedido ?? 0
      }
    }
  }

  // Meta semana: meta mensal / 4
  let metaSemana = 0
  if (codVendedor) {
    const year = weekStart.getFullYear()
    const month = weekStart.getMonth() + 1
    const { data: metaMes } = await supabase
      .from('metas_vendedores')
      .select('meta_valor')
      .eq('cod_vendedor', codVendedor)
      .eq('ano', year)
      .eq('mes', month)
      .maybeSingle()
    metaSemana = ((metaMes?.meta_valor as number) ?? 0) / 4
  }

  // Realizado: valor_faturado de vendas_semanais do ERP
  let realizado = 0
  if (codVendedor) {
    const { data: vendas } = await supabase
      .from('vendas_semanais')
      .select('valor_faturado')
      .eq('codigo_vendedor', codVendedor)
      .gte('data_referencia', weekStr)
      .lte('data_referencia', weekEndStr)
    realizado = (vendas ?? []).reduce((sum, v) => sum + (v.valor_faturado ?? 0), 0)
  }

  return { planejado, oportunidade, metaSemana, realizado }
}
