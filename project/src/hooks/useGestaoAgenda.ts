/**
 * Copiloto Focco Brasil
 * Hook: useGestaoAgenda — KPIs de agenda por vendedor para o gestor (Story 3.13)
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getAllVendedores } from '../lib/queries/vendedores'

export type PeriodoAgenda = 'semana' | 'mes'

export interface KpisVendedor {
  vendedorId: string
  nome: string
  visitasRealizadas: number
  taxaConversao: number   // 0-100
  realizado: number       // soma valor_realizado visitas do período
  meta: number            // meta do período
  agendamentosPendentes: number
  forecastPendente: number
  clientesSemVisita60d: number
}

export interface ResumoEquipe {
  totalVisitas: number
  totalVendasGeradas: number
  totalAgendamentosPendentes: number
  forecastTotal: number
}

function formatDateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getPeriodoDates(periodo: PeriodoAgenda): { inicio: string; fim: string } {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const fim = formatDateLocal(hoje)

  if (periodo === 'semana') {
    const inicio = new Date(hoje)
    inicio.setDate(inicio.getDate() - inicio.getDay()) // domingo desta semana
    return { inicio: formatDateLocal(inicio), fim }
  } else {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    return { inicio: formatDateLocal(inicio), fim }
  }
}

async function fetchKpis(
  periodo: PeriodoAgenda
): Promise<{ kpis: KpisVendedor[]; resumo: ResumoEquipe }> {
  const { inicio, fim } = getPeriodoDates(periodo)
  const hoje = new Date()

  // 1. Vendedores
  const vendedores = (await getAllVendedores()) ?? []
  if (vendedores.length === 0) {
    return { kpis: [], resumo: { totalVisitas: 0, totalVendasGeradas: 0, totalAgendamentosPendentes: 0, forecastTotal: 0 } }
  }
  const vendedorIds = vendedores.map((v) => v.id)
  const codVendedores = vendedores.map((v) => v.cod_vendedor).filter(Boolean) as number[]

  // 2. Visitas do período (bulk)
  const { data: visitasData } = await supabase
    .from('visitas')
    .select('vendedor_id, resultado, valor_realizado')
    .in('vendedor_id', vendedorIds)
    .gte('data_visita', inicio)
    .lte('data_visita', fim)
    .eq('ativo', true)

  // 3. Agendamentos pendentes do período (bulk)
  const { data: agendamentosData } = await supabase
    .from('agendamentos')
    .select('vendedor_id, valor_previsto')
    .in('vendedor_id', vendedorIds)
    .eq('status', 'pendente')
    .gte('data_agendada', inicio)
    .lte('data_agendada', fim)

  // 4. Metas do mês atual (bulk)
  const { data: metasData } = await supabase
    .from('metas_vendedores')
    .select('cod_vendedor, meta_valor')
    .in('cod_vendedor', codVendedores)
    .eq('ano', hoje.getFullYear())
    .eq('mes', hoje.getMonth() + 1)

  // 5. Clientes sem visita > 60d: via analise_rfm + tabela_clientes
  const { data: clientesData } = await supabase
    .from('tabela_clientes')
    .select('codigo_cliente, cod_vendedor')
    .in('cod_vendedor', codVendedores)

  let semVisita60dPorCodVendedor = new Map<number, number>()
  if (clientesData && clientesData.length > 0) {
    const clienteCodes = [...new Set(clientesData.map((c) => c.codigo_cliente))]
    const { data: rfmData } = await supabase
      .from('analise_rfm')
      .select('codigo_cliente, dias_sem_comprar')
      .in('codigo_cliente', clienteCodes)
      .order('data_analise', { ascending: false })

    const rfmMap = new Map<number, number>()
    for (const r of rfmData ?? []) {
      if (!rfmMap.has(r.codigo_cliente)) rfmMap.set(r.codigo_cliente, r.dias_sem_comprar ?? 0)
    }

    for (const c of clientesData) {
      const dsv = rfmMap.get(c.codigo_cliente) ?? 0
      if (dsv > 60) {
        const cod = c.cod_vendedor as number
        semVisita60dPorCodVendedor.set(cod, (semVisita60dPorCodVendedor.get(cod) ?? 0) + 1)
      }
    }
  }

  // Montar mapas por vendedorId
  const visitasPorVendedor = new Map<string, { resultado: string; valor_realizado: number | null }[]>()
  for (const v of visitasData ?? []) {
    if (!visitasPorVendedor.has(v.vendedor_id)) visitasPorVendedor.set(v.vendedor_id, [])
    visitasPorVendedor.get(v.vendedor_id)!.push(v)
  }

  const agsPorVendedor = new Map<string, { valor_previsto: number | null }[]>()
  for (const a of agendamentosData ?? []) {
    if (!agsPorVendedor.has(a.vendedor_id)) agsPorVendedor.set(a.vendedor_id, [])
    agsPorVendedor.get(a.vendedor_id)!.push(a)
  }

  const metaPorCodVendedor = new Map<number, number>()
  for (const m of metasData ?? []) {
    metaPorCodVendedor.set(m.cod_vendedor, m.meta_valor ?? 0)
  }

  // Montar KPIs por vendedor
  const kpis: KpisVendedor[] = vendedores.map((vendedor) => {
    const visitas = visitasPorVendedor.get(vendedor.id) ?? []
    const ags = agsPorVendedor.get(vendedor.id) ?? []
    const metaMensal = metaPorCodVendedor.get(vendedor.cod_vendedor ?? -1) ?? 0
    const meta = periodo === 'semana' ? metaMensal / 4 : metaMensal

    const total = visitas.length
    const vendeu = visitas.filter((v) => v.resultado === 'vendeu').length
    const realizado = visitas.reduce((sum, v) => sum + (v.valor_realizado ?? 0), 0)
    const forecastPendente = ags.reduce((sum, a) => sum + (a.valor_previsto ?? 0), 0)
    const clientesSemVisita60d = semVisita60dPorCodVendedor.get(vendedor.cod_vendedor ?? -1) ?? 0

    return {
      vendedorId: vendedor.id,
      nome: vendedor.apelido || vendedor.nome_completo,
      visitasRealizadas: total,
      taxaConversao: total > 0 ? (vendeu / total) * 100 : 0,
      realizado,
      meta,
      agendamentosPendentes: ags.length,
      forecastPendente,
      clientesSemVisita60d,
    }
  })

  // Resumo geral
  const resumo: ResumoEquipe = {
    totalVisitas: kpis.reduce((s, k) => s + k.visitasRealizadas, 0),
    totalVendasGeradas: kpis.reduce((s, k) => s + k.realizado, 0),
    totalAgendamentosPendentes: kpis.reduce((s, k) => s + k.agendamentosPendentes, 0),
    forecastTotal: kpis.reduce((s, k) => s + k.forecastPendente, 0),
  }

  return { kpis, resumo }
}

export function useGestaoAgenda(periodo: PeriodoAgenda) {
  const [kpis, setKpis] = useState<KpisVendedor[]>([])
  const [resumo, setResumo] = useState<ResumoEquipe>({
    totalVisitas: 0,
    totalVendasGeradas: 0,
    totalAgendamentosPendentes: 0,
    forecastTotal: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchKpis(periodo)
      setKpis(result.kpis)
      setResumo(result.resumo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => {
    load()
  }, [load])

  return { kpis, resumo, loading, error }
}
