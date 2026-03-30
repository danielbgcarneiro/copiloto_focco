/**
 * Copiloto Focco Brasil
 * Hook: useGestaoAgenda — KPIs de agenda por vendedor para o gestor (Story 3.13)
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getAllVendedores } from '../lib/queries/vendedores'

export type PeriodoAgenda = 'semana' | 'mes'
export type PeriodoAgendaDetalhe = 'semana' | 'mes' | 'trimestre'

export interface TopMotivo {
  motivo: string
  count: number
}

export interface ClienteNaoVisitado {
  codigoCliente: number
  nomeCliente: string
  diasSemComprar: number
  perfil: string
}

export interface UltimaVisita {
  data: string
  codigoCliente: number
  nomeCliente: string
  resultado: string
  valorRealizado: number | null
}

export interface KpisDetalhadosVendedor {
  nomeVendedor: string
  // AC3 — Atividade
  totalVisitas: number
  visitasAgendadas: number
  taxaCumprimento: number
  taxaConversao: number
  mediaVisitasPorSemana: number
  // AC4 — Forecast
  forecastTotal: number
  realizadoTotal: number
  forecastAccuracy: number
  meta: number
  atingimentoMeta: number
  // AC5 — Qualidade
  topMotivos: TopMotivo[]
  pctComObservacao: number
  clientes30d: number
  clientes60d: number
  clientes90d: number
  // AC6 — Cobertura de carteira
  totalClientesCarteira: number
  clientesVisitados: number
  pctCobertura: number
  clientesNaoVisitados: ClienteNaoVisitado[]
  // AC7 — Últimas visitas
  ultimasVisitas: UltimaVisita[]
}

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

function getPeriodoDatesDetalhe(periodo: PeriodoAgendaDetalhe): { inicio: string; fim: string; numSemanas: number } {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const fim = formatDateLocal(hoje)

  let inicio: Date
  if (periodo === 'semana') {
    inicio = new Date(hoje)
    inicio.setDate(inicio.getDate() - inicio.getDay())
  } else if (periodo === 'mes') {
    inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  } else {
    const quarterStart = Math.floor(hoje.getMonth() / 3) * 3
    inicio = new Date(hoje.getFullYear(), quarterStart, 1)
  }

  const diffMs = Math.max(hoje.getTime() - inicio.getTime(), 0)
  const numSemanas = Math.max(1, diffMs / (7 * 24 * 60 * 60 * 1000))

  return { inicio: formatDateLocal(inicio), fim, numSemanas }
}

async function fetchKpisDetalhados(
  vendedorId: string,
  periodo: PeriodoAgendaDetalhe
): Promise<KpisDetalhadosVendedor> {
  const { inicio, fim, numSemanas } = getPeriodoDatesDetalhe(periodo)
  const hoje = new Date()

  // 1. Perfil do vendedor
  const { data: perfil } = await supabase
    .from('profiles')
    .select('cod_vendedor, nome_completo, apelido')
    .eq('id', vendedorId)
    .maybeSingle()

  if (!perfil) throw new Error('Vendedor não encontrado')
  const nomeVendedor = (perfil.apelido || perfil.nome_completo) as string
  const codVendedor = perfil.cod_vendedor as number

  // 2. Queries paralelas
  const [
    { data: visitasData },
    { data: agendamentosData },
    { data: metasData },
    { data: clientesData },
    { data: motivosData },
  ] = await Promise.all([
    supabase
      .from('visitas')
      .select('resultado, valor_realizado, observacoes, motivo_nao_venda_id, data_visita, codigo_cliente')
      .eq('vendedor_id', vendedorId)
      .gte('data_visita', inicio)
      .lte('data_visita', fim)
      .eq('ativo', true)
      .order('data_visita', { ascending: false }),
    supabase
      .from('agendamentos')
      .select('valor_previsto')
      .eq('vendedor_id', vendedorId)
      .gte('data_agendada', inicio)
      .lte('data_agendada', fim),
    supabase
      .from('metas_vendedores')
      .select('meta_valor')
      .eq('cod_vendedor', codVendedor)
      .eq('ano', hoje.getFullYear())
      .eq('mes', hoje.getMonth() + 1),
    supabase
      .from('tabela_clientes')
      .select('codigo_cliente, nome_fantasia, razao_social')
      .eq('cod_vendedor', codVendedor),
    supabase
      .from('motivos_nao_venda')
      .select('id, descricao')
      .eq('ativo', true),
  ])

  const visitas = (visitasData ?? []) as {
    resultado: string | null
    valor_realizado: number | null
    observacoes: string | null
    motivo_nao_venda_id: number | null
    data_visita: string
    codigo_cliente: number
  }[]
  const agendamentos = (agendamentosData ?? []) as { valor_previsto: number | null }[]
  const metaMensal = (metasData ?? [])[0]?.meta_valor ?? 0
  const clientes = (clientesData ?? []) as { codigo_cliente: number; nome_fantasia: string | null; razao_social: string | null }[]
  const motivos = (motivosData ?? []) as { id: number; descricao: string }[]

  const meta = periodo === 'semana' ? metaMensal / 4 : periodo === 'mes' ? metaMensal : metaMensal * 3

  // 3. Analise RFM para a carteira
  const rfmMap = new Map<number, { diasSemComprar: number; perfil: string }>()
  if (clientes.length > 0) {
    const clienteCodes = clientes.map((c) => c.codigo_cliente)
    const { data: rfmData } = await supabase
      .from('analise_rfm')
      .select('codigo_cliente, dias_sem_comprar, perfil')
      .in('codigo_cliente', clienteCodes)
      .order('data_analise', { ascending: false })

    for (const r of rfmData ?? []) {
      if (!rfmMap.has(r.codigo_cliente)) {
        rfmMap.set(r.codigo_cliente, { diasSemComprar: r.dias_sem_comprar ?? 0, perfil: r.perfil ?? '' })
      }
    }
  }

  // AC3 — Atividade
  const totalVisitas = visitas.length
  const visitasAgendadas = agendamentos.length
  const taxaCumprimento = visitasAgendadas > 0 ? (totalVisitas / visitasAgendadas) * 100 : 0
  const vendeu = visitas.filter((v) => v.resultado === 'vendeu').length
  const taxaConversao = totalVisitas > 0 ? (vendeu / totalVisitas) * 100 : 0
  const mediaVisitasPorSemana = totalVisitas / numSemanas

  // AC4 — Forecast
  const forecastTotal = agendamentos.reduce((sum, a) => sum + (a.valor_previsto ?? 0), 0)
  const realizadoTotal = visitas.reduce((sum, v) => sum + (v.valor_realizado ?? 0), 0)
  const forecastAccuracy = forecastTotal > 0 ? realizadoTotal / forecastTotal : 0
  const atingimentoMeta = meta > 0 ? (realizadoTotal / meta) * 100 : 0

  // AC5 — Qualidade
  const motivoDescMap = new Map<number, string>()
  for (const m of motivos) motivoDescMap.set(m.id, m.descricao)

  const motivoCounts = new Map<number, number>()
  for (const v of visitas) {
    if (v.motivo_nao_venda_id != null) {
      motivoCounts.set(v.motivo_nao_venda_id, (motivoCounts.get(v.motivo_nao_venda_id) ?? 0) + 1)
    }
  }
  const topMotivos: TopMotivo[] = [...motivoCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({ motivo: motivoDescMap.get(id) ?? `Motivo ${id}`, count }))

  const comObservacao = visitas.filter((v) => v.observacoes && v.observacoes.trim() !== '').length
  const pctComObservacao = totalVisitas > 0 ? (comObservacao / totalVisitas) * 100 : 0

  let clientes30d = 0, clientes60d = 0, clientes90d = 0
  for (const c of clientes) {
    const dsv = rfmMap.get(c.codigo_cliente)?.diasSemComprar ?? 0
    if (dsv > 30) clientes30d++
    if (dsv > 60) clientes60d++
    if (dsv > 90) clientes90d++
  }

  // AC6 — Cobertura de carteira
  const visitadosSet = new Set(visitas.map((v) => v.codigo_cliente))
  const clientesVisitados = clientes.filter((c) => visitadosSet.has(c.codigo_cliente)).length
  const pctCobertura = clientes.length > 0 ? (clientesVisitados / clientes.length) * 100 : 0

  const clienteNomeMap = new Map<number, string>()
  for (const c of clientes) {
    clienteNomeMap.set(c.codigo_cliente, c.nome_fantasia || c.razao_social || `Cliente ${c.codigo_cliente}`)
  }

  const clientesNaoVisitados: ClienteNaoVisitado[] = clientes
    .filter((c) => !visitadosSet.has(c.codigo_cliente))
    .map((c) => ({
      codigoCliente: c.codigo_cliente,
      nomeCliente: c.nome_fantasia || c.razao_social || `Cliente ${c.codigo_cliente}`,
      diasSemComprar: rfmMap.get(c.codigo_cliente)?.diasSemComprar ?? 0,
      perfil: rfmMap.get(c.codigo_cliente)?.perfil ?? '',
    }))
    .sort((a, b) => b.diasSemComprar - a.diasSemComprar)

  // AC7 — Últimas 10 visitas
  const ultimasVisitas: UltimaVisita[] = visitas.slice(0, 10).map((v) => ({
    data: v.data_visita,
    codigoCliente: v.codigo_cliente,
    nomeCliente: clienteNomeMap.get(v.codigo_cliente) ?? `Cliente ${v.codigo_cliente}`,
    resultado: v.resultado ?? '',
    valorRealizado: v.valor_realizado,
  }))

  return {
    nomeVendedor,
    totalVisitas,
    visitasAgendadas,
    taxaCumprimento,
    taxaConversao,
    mediaVisitasPorSemana,
    forecastTotal,
    realizadoTotal,
    forecastAccuracy,
    meta,
    atingimentoMeta,
    topMotivos,
    pctComObservacao,
    clientes30d,
    clientes60d,
    clientes90d,
    totalClientesCarteira: clientes.length,
    clientesVisitados,
    pctCobertura,
    clientesNaoVisitados,
    ultimasVisitas,
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

export function useKpisDetalhadosVendedor(vendedorId: string, periodo: PeriodoAgendaDetalhe) {
  const [data, setData] = useState<KpisDetalhadosVendedor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!vendedorId) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchKpisDetalhados(vendedorId, periodo)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [vendedorId, periodo])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error }
}
