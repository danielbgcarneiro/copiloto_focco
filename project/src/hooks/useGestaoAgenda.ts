/**
 * Copiloto Focco Brasil
 * Hook: useGestaoAgenda — KPIs de agenda por vendedor para o gestor (Story 3.13)
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getAllVendedores } from '../lib/queries/vendedores'
import { calcularMetaSemana } from '../utils/agendaUtils'
import type { AgendaTotalizacaoItem } from '../components/molecules/AgendaTotalizacaoCard'

export type PeriodoAgendaDetalhe = 'semana' | 'mes' | 'trimestre'
export type PeriodoAgenda = PeriodoAgendaDetalhe

export interface TopMotivo {
  motivo: string
  count: number
}

export interface ClienteNaoVisitado {
  codigoCliente: number
  nomeCliente: string
  diasSemComprar: number
  perfil: string
  situacaoErp: string
}

export interface UltimaVisita {
  visitaId: string
  data: string
  codigoCliente: number
  nomeCliente: string
  resultado: string
  valorRealizado: number | null
  motivo: string | null
  motivoCanonical: string | null
  observacoes: string | null
  inativado: boolean
  inativadoEm: string | null
  /** Situação do cliente em tabela_clientes (A/E/S/V adimplente, P/B pendente/bloqueado, I inativo, C cancelado) — independente do flag manual `inativado`. */
  situacaoErp: string
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
  // Story 3.21 — alinhamento com visão do vendedor
  somaOportunidade: number
  metaMes: number
  realizadoMes: number
  agendaItems: AgendaTotalizacaoItem[]
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

function comHoraZero(date: Date): Date {
  const r = new Date(date)
  r.setHours(0, 0, 0, 0)
  return r
}

function startOfWeek(d: Date): Date {
  const r = comHoraZero(d)
  r.setDate(r.getDate() - r.getDay()) // domingo
  return r
}
function endOfWeek(d: Date): Date {
  const r = startOfWeek(d)
  r.setDate(r.getDate() + 6) // sábado
  return r
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

/**
 * Resolve início/fim de um período de agenda ancorado em `refDate` (dia de referência
 * dentro do período desejado — navegação move `refDate` para o período anterior/seguinte).
 * `fim` nunca ultrapassa hoje (sem dias futuros); `isAtual` indica se o período contém hoje,
 * usado para desabilitar a navegação "próximo" além do período corrente.
 * Trimestre = últimos 3 meses corridos terminando no mês de `refDate` (janela rolante, não
 * trimestre-calendário).
 */
export function getPeriodoDatesDetalhe(
  periodo: PeriodoAgendaDetalhe,
  refDate: Date = new Date()
): { inicio: string; fim: string; numSemanas: number; isAtual: boolean } {
  const hoje = comHoraZero(new Date())
  const ref = comHoraZero(refDate)

  let inicioDate: Date
  let fimNatural: Date
  if (periodo === 'semana') {
    inicioDate = startOfWeek(ref)
    fimNatural = endOfWeek(ref)
  } else if (periodo === 'mes') {
    inicioDate = startOfMonth(ref)
    fimNatural = endOfMonth(ref)
  } else {
    inicioDate = startOfMonth(new Date(ref.getFullYear(), ref.getMonth() - 2, 1))
    fimNatural = endOfMonth(ref)
  }

  const isAtual = hoje.getTime() >= inicioDate.getTime() && hoje.getTime() <= fimNatural.getTime()
  const fimDate = fimNatural.getTime() > hoje.getTime() ? hoje : fimNatural

  const diffMs = Math.max(fimDate.getTime() - inicioDate.getTime(), 0)
  const numSemanas = Math.max(1, diffMs / (7 * 24 * 60 * 60 * 1000))

  return { inicio: formatDateLocal(inicioDate), fim: formatDateLocal(fimDate), numSemanas, isAtual }
}

function getPeriodoDates(periodo: PeriodoAgenda, refDate: Date = new Date()): { inicio: string; fim: string } {
  const { inicio, fim } = getPeriodoDatesDetalhe(periodo, refDate)
  return { inicio, fim }
}

/** Move a data de referência um período inteiro para trás (semana ±7d, mês/trimestre ±1/±3 meses). */
export function previousPeriodoRefDate(periodo: PeriodoAgendaDetalhe, refDate: Date): Date {
  const d = new Date(refDate)
  if (periodo === 'semana') d.setDate(d.getDate() - 7)
  else if (periodo === 'mes') d.setMonth(d.getMonth() - 1)
  else d.setMonth(d.getMonth() - 3)
  return d
}

/** Move a data de referência um período inteiro para frente. */
export function nextPeriodoRefDate(periodo: PeriodoAgendaDetalhe, refDate: Date): Date {
  const d = new Date(refDate)
  if (periodo === 'semana') d.setDate(d.getDate() + 7)
  else if (periodo === 'mes') d.setMonth(d.getMonth() + 1)
  else d.setMonth(d.getMonth() + 3)
  return d
}

// ─── tipos de linha (resultados das queries) ─────────────────────────────────

type VisitaRow = {
  id: string
  resultado: string | null
  valor_realizado: number | null
  observacoes: string | null
  motivo_nao_venda_id: number | null
  data_visita: string
  codigo_cliente: number
  cliente_inativado: boolean
  inativado_em: string | null
}
type AgendamentoRow = { id: string; codigo_cliente: number; valor_previsto: number | null; data_agendada: string }
type ClienteRow = { codigo_cliente: number; nome_fantasia: string | null; razao_social: string | null; cidade: string | null; situacao: string | null }
type MotivoRow = { id: number; descricao: string; codigo_canonico: string }
type RfmInfo = { diasSemComprar: number; perfil: string; previsaoPedido: number; metaAnoAtual: number }

// ─── helpers puros de cálculo de KPI (extraídos de fetchKpisDetalhados) ───────

/** Meta do período: semana usa rateio, mês = mensal, trimestre = mensal×3. */
export function calcMetaPeriodo(periodo: PeriodoAgendaDetalhe, metaMensal: number, realizadoMes: number, hoje: Date): number {
  if (periodo === 'semana') return calcularMetaSemana(metaMensal, realizadoMes, hoje)
  return periodo === 'mes' ? metaMensal : metaMensal * 3
}

/** Mapa codigo_cliente → dados RFM (primeira ocorrência = análise mais recente). */
export function buildRfmMap(rfmData: any[] | null): Map<number, RfmInfo> {
  const rfmMap = new Map<number, RfmInfo>()
  for (const r of rfmData ?? []) {
    if (!rfmMap.has(r.codigo_cliente)) {
      rfmMap.set(r.codigo_cliente, {
        diasSemComprar: r.dias_sem_comprar ?? 0,
        perfil: r.perfil ?? '',
        previsaoPedido: r.previsao_pedido ?? 0,
        metaAnoAtual: r.meta_ano_atual ?? 0,
      })
    }
  }
  return rfmMap
}

/** AC3 — Atividade. */
export function computeAtividade(visitas: VisitaRow[], agendamentos: AgendamentoRow[], numSemanas: number) {
  const totalVisitas = visitas.length
  const visitasAgendadas = agendamentos.length
  const taxaCumprimento = visitasAgendadas > 0 ? (totalVisitas / visitasAgendadas) * 100 : 0
  const vendeu = visitas.filter((v) => v.resultado === 'vendeu').length
  const taxaConversao = totalVisitas > 0 ? (vendeu / totalVisitas) * 100 : 0
  const mediaVisitasPorSemana = totalVisitas / numSemanas
  return { totalVisitas, visitasAgendadas, taxaCumprimento, taxaConversao, mediaVisitasPorSemana }
}

/** AC4 — Forecast + oportunidade RFM dos agendados. */
export function computeForecast(agendamentos: AgendamentoRow[], visitas: VisitaRow[], meta: number, rfmMap: Map<number, RfmInfo>) {
  const forecastTotal = agendamentos.reduce((sum, a) => sum + (a.valor_previsto ?? 0), 0)
  const realizadoTotal = visitas.reduce((sum, v) => sum + (v.valor_realizado ?? 0), 0)
  const forecastAccuracy = forecastTotal > 0 ? realizadoTotal / forecastTotal : 0
  const atingimentoMeta = meta > 0 ? (realizadoTotal / meta) * 100 : 0
  const somaOportunidade = agendamentos.reduce((sum, a) => sum + (rfmMap.get(a.codigo_cliente)?.previsaoPedido ?? 0), 0)
  return { forecastTotal, realizadoTotal, forecastAccuracy, atingimentoMeta, somaOportunidade }
}

/** Story 3.21 — items da tab Agenda (read-only no drilldown). */
function buildAgendaItems(agendamentos: AgendamentoRow[], clientes: ClienteRow[], rfmMap: Map<number, RfmInfo>, visitas: VisitaRow[]): AgendaTotalizacaoItem[] {
  const clienteNomeMapAgenda = new Map<number, { nome: string; cidade: string | null }>()
  for (const c of clientes) {
    clienteNomeMapAgenda.set(c.codigo_cliente, {
      nome: c.nome_fantasia || c.razao_social || `Cliente ${c.codigo_cliente}`,
      cidade: c.cidade ?? null,
    })
  }
  // mapa codigo_cliente → última visita do período
  const visitaPorCliente = new Map<number, { resultado: string; valor_realizado: number | null }>()
  for (const v of visitas) {
    if (!visitaPorCliente.has(v.codigo_cliente)) {
      visitaPorCliente.set(v.codigo_cliente, { resultado: v.resultado ?? '', valor_realizado: v.valor_realizado })
    }
  }
  return agendamentos.map((a) => {
    const info = clienteNomeMapAgenda.get(a.codigo_cliente)
    const rfm = rfmMap.get(a.codigo_cliente)
    const visita = visitaPorCliente.get(a.codigo_cliente)
    return {
      id: a.id,
      codigo_cliente: a.codigo_cliente,
      nome: info?.nome ?? `Cliente ${a.codigo_cliente}`,
      cidade: info?.cidade ?? null,
      perfil_rfm: rfm?.perfil ?? null,
      valor_previsto: a.valor_previsto,
      oportunidade: rfm?.previsaoPedido ?? null,
      meta_ano_atual: rfm?.metaAnoAtual ?? null,
      visita_resultado: visita?.resultado ?? null,
      visita_valor_realizado: visita?.valor_realizado ?? null,
    }
  })
}

/** AC5 — Qualidade. Retorna também os mapas de motivo (reusados em últimas visitas). */
export function computeQualidade(visitas: VisitaRow[], motivos: MotivoRow[], totalVisitas: number) {
  const motivoDescMap = new Map<number, string>()
  const motivoCanonicalMap = new Map<number, string>()
  for (const m of motivos) {
    motivoDescMap.set(m.id, m.descricao)
    motivoCanonicalMap.set(m.id, m.codigo_canonico)
  }

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

  return { topMotivos, pctComObservacao, motivoDescMap, motivoCanonicalMap }
}

/** Clientes da carteira ativa por faixa de dias sem comprar. */
export function computeDiasSemCompra(clientesAtivos: ClienteRow[], rfmMap: Map<number, RfmInfo>) {
  let clientes30d = 0, clientes60d = 0, clientes90d = 0
  for (const c of clientesAtivos) {
    const dsv = rfmMap.get(c.codigo_cliente)?.diasSemComprar ?? 0
    if (dsv > 30) clientes30d++
    if (dsv > 60) clientes60d++
    if (dsv > 90) clientes90d++
  }
  return { clientes30d, clientes60d, clientes90d }
}

/** AC6 — Cobertura de carteira (apenas clientes ativos). */
export function computeCobertura(visitas: VisitaRow[], clientesAtivos: ClienteRow[]) {
  const visitadosSet = new Set(visitas.map((v) => v.codigo_cliente))
  const clientesVisitados = clientesAtivos.filter((c) => visitadosSet.has(c.codigo_cliente)).length
  const pctCobertura = clientesAtivos.length > 0 ? (clientesVisitados / clientesAtivos.length) * 100 : 0
  return { visitadosSet, clientesVisitados, pctCobertura }
}

/** Mapa de nomes usando TODOS os clientes (inclusive I/B) p/ visitas históricas. */
type ClienteInfo = { nome: string; situacao: string }

function buildClienteNomeMap(clientes: ClienteRow[]): Map<number, ClienteInfo> {
  const clienteNomeMap = new Map<number, ClienteInfo>()
  for (const c of clientes) {
    clienteNomeMap.set(c.codigo_cliente, {
      nome: c.nome_fantasia || c.razao_social || `Cliente ${c.codigo_cliente}`,
      situacao: c.situacao || '',
    })
  }
  return clienteNomeMap
}

/** Clientes ativos sem visita no período, ordenados por dias sem comprar. */
function buildClientesNaoVisitados(clientesAtivos: ClienteRow[], visitadosSet: Set<number>, rfmMap: Map<number, RfmInfo>): ClienteNaoVisitado[] {
  return clientesAtivos
    .filter((c) => !visitadosSet.has(c.codigo_cliente))
    .map((c) => ({
      codigoCliente: c.codigo_cliente,
      nomeCliente: c.nome_fantasia || c.razao_social || `Cliente ${c.codigo_cliente}`,
      diasSemComprar: rfmMap.get(c.codigo_cliente)?.diasSemComprar ?? 0,
      perfil: rfmMap.get(c.codigo_cliente)?.perfil ?? '',
      situacaoErp: c.situacao || '',
    }))
    .sort((a, b) => b.diasSemComprar - a.diasSemComprar)
}

/** AC7 — Últimas visitas (lista completa do período). */
function buildUltimasVisitas(
  visitas: VisitaRow[],
  clienteNomeMap: Map<number, ClienteInfo>,
  motivoDescMap: Map<number, string>,
  motivoCanonicalMap: Map<number, string>,
): UltimaVisita[] {
  return visitas.map((v) => ({
    visitaId: v.id,
    data: v.data_visita,
    codigoCliente: v.codigo_cliente,
    nomeCliente: clienteNomeMap.get(v.codigo_cliente)?.nome ?? `Cliente ${v.codigo_cliente}`,
    resultado: v.resultado ?? '',
    valorRealizado: v.valor_realizado,
    motivo: v.motivo_nao_venda_id != null ? (motivoDescMap.get(v.motivo_nao_venda_id) ?? null) : null,
    motivoCanonical: v.motivo_nao_venda_id != null ? (motivoCanonicalMap.get(v.motivo_nao_venda_id) ?? null) : null,
    observacoes: v.observacoes ?? null,
    situacaoErp: clienteNomeMap.get(v.codigo_cliente)?.situacao ?? '',
    inativado: v.cliente_inativado ?? false,
    inativadoEm: v.inativado_em ?? null,
  }))
}

async function fetchKpisDetalhados(
  vendedorId: string,
  periodo: PeriodoAgendaDetalhe,
  refDate: Date = new Date()
): Promise<KpisDetalhadosVendedor> {
  const { inicio, fim, numSemanas } = getPeriodoDatesDetalhe(periodo, refDate)
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
    { data: vendasMesData },
  ] = await Promise.all([
    supabase
      .from('visitas')
      .select('id, resultado, valor_realizado, observacoes, motivo_nao_venda_id, data_visita, codigo_cliente, cliente_inativado, inativado_em')
      .eq('vendedor_id', vendedorId)
      .gte('data_visita', inicio)
      .lte('data_visita', fim)
      .eq('ativo', true)
      .order('data_visita', { ascending: false }),
    supabase
      .from('agendamentos')
      .select('id, codigo_cliente, valor_previsto, data_agendada')
      .eq('vendedor_id', vendedorId)
      .gte('data_agendada', inicio)
      .lte('data_agendada', fim),
    supabase
      .from('metas_vendedores')
      .select('meta_valor')
      .eq('cod_vendedor', codVendedor)
      .eq('ano', hoje.getFullYear())
      .eq('mes', hoje.getMonth() + 1)
      .eq('marca', 'OB_PW'),
    supabase
      .from('tabela_clientes')
      .select('codigo_cliente, nome_fantasia, razao_social, cidade, situacao')
      .eq('cod_vendedor', codVendedor),
    supabase
      .from('motivos_nao_venda')
      .select('id, descricao, codigo_canonico')
      .eq('ativo', true),
    supabase
      .from('vendas_mes')
      .select('total_vendas')
      .eq('codigo_vendedor', codVendedor)
      .eq('mes_referencia', `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`)
      .maybeSingle(),
  ])

  const visitas = (visitasData ?? []) as VisitaRow[]
  const agendamentos = (agendamentosData ?? []) as AgendamentoRow[]
  const metaMensal = (metasData ?? [])[0]?.meta_valor ?? 0
  const clientes = (clientesData ?? []) as ClienteRow[]
  // Apenas clientes ativos para métricas de carteira (cobertura, dias sem comprar, não visitados)
  const clientesAtivos = clientes.filter(c => c.situacao !== 'I' && c.situacao !== 'B')
  const motivos = (motivosData ?? []) as MotivoRow[]
  const realizadoMes = (vendasMesData as { total_vendas: number } | null)?.total_vendas ?? 0

  const meta = calcMetaPeriodo(periodo, metaMensal, realizadoMes, hoje)

  // 3. Analise RFM para a carteira (apenas clientes ativos)
  let rfmMap = new Map<number, RfmInfo>()
  if (clientesAtivos.length > 0) {
    const clienteCodes = clientesAtivos.map((c) => c.codigo_cliente)
    const { data: rfmData } = await supabase
      .from('analise_rfm')
      .select('codigo_cliente, dias_sem_comprar, perfil, previsao_pedido, meta_ano_atual')
      .in('codigo_cliente', clienteCodes)
      .order('data_analise', { ascending: false })
    rfmMap = buildRfmMap(rfmData)
  }

  // KPIs derivados (cada bloco em helper puro — ver acima)
  const { totalVisitas, visitasAgendadas, taxaCumprimento, taxaConversao, mediaVisitasPorSemana } =
    computeAtividade(visitas, agendamentos, numSemanas)
  const { forecastTotal, realizadoTotal, forecastAccuracy, atingimentoMeta, somaOportunidade } =
    computeForecast(agendamentos, visitas, meta, rfmMap)
  const agendaItems = buildAgendaItems(agendamentos, clientes, rfmMap, visitas)
  const { topMotivos, pctComObservacao, motivoDescMap, motivoCanonicalMap } =
    computeQualidade(visitas, motivos, totalVisitas)
  const { clientes30d, clientes60d, clientes90d } = computeDiasSemCompra(clientesAtivos, rfmMap)
  const { visitadosSet, clientesVisitados, pctCobertura } = computeCobertura(visitas, clientesAtivos)
  const clienteNomeMap = buildClienteNomeMap(clientes)
  const clientesNaoVisitados = buildClientesNaoVisitados(clientesAtivos, visitadosSet, rfmMap)
  const ultimasVisitas = buildUltimasVisitas(visitas, clienteNomeMap, motivoDescMap, motivoCanonicalMap)

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
    totalClientesCarteira: clientesAtivos.length,
    clientesVisitados,
    pctCobertura,
    clientesNaoVisitados,
    ultimasVisitas,
    somaOportunidade,
    metaMes: metaMensal,
    realizadoMes,
    agendaItems,
  }
}

/** Agrupa linhas por uma chave string. */
export function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const r of rows) {
    const k = key(r)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(r)
  }
  return map
}

/** Mapa codigo_cliente → dias sem comprar (primeira ocorrência = mais recente). */
export function buildDsvMap(rfmData: any[] | null): Map<number, number> {
  const map = new Map<number, number>()
  for (const r of rfmData ?? []) {
    if (!map.has(r.codigo_cliente)) map.set(r.codigo_cliente, r.dias_sem_comprar ?? 0)
  }
  return map
}

/** Conta, por cod_vendedor, clientes com mais de 60 dias sem comprar. */
export function countSemVisita60d(
  clientesData: { codigo_cliente: number; cod_vendedor: number }[],
  dsvMap: Map<number, number>,
): Map<number, number> {
  const res = new Map<number, number>()
  for (const c of clientesData) {
    const dsv = dsvMap.get(c.codigo_cliente) ?? 0
    if (dsv > 60) {
      const cod = c.cod_vendedor as number
      res.set(cod, (res.get(cod) ?? 0) + 1)
    }
  }
  return res
}

async function fetchKpis(
  periodo: PeriodoAgenda,
  refDate: Date = new Date()
): Promise<{ kpis: KpisVendedor[]; resumo: ResumoEquipe }> {
  const { inicio, fim } = getPeriodoDates(periodo, refDate)
  const hoje = new Date()

  // 1. Vendedores (inclui inativos — filtrados abaixo por atividade no período)
  const vendedores = (await getAllVendedores({ incluirInativos: true })) ?? []
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

  // 4. Metas do mês atual (bulk) — apenas OB_PW
  const { data: metasData } = await supabase
    .from('metas_vendedores')
    .select('cod_vendedor, meta_valor')
    .in('cod_vendedor', codVendedores)
    .eq('ano', hoje.getFullYear())
    .eq('mes', hoje.getMonth() + 1)
    .eq('marca', 'OB_PW')

  // 5. Clientes sem visita > 60d: via analise_rfm + tabela_clientes
  const { data: clientesData } = await supabase
    .from('tabela_clientes')
    .select('codigo_cliente, cod_vendedor')
    .in('cod_vendedor', codVendedores)
    .not('situacao', 'in', '("I","B")')

  let semVisita60dPorCodVendedor = new Map<number, number>()
  if (clientesData && clientesData.length > 0) {
    const clienteCodes = [...new Set(clientesData.map((c) => c.codigo_cliente))]
    const { data: rfmData } = await supabase
      .from('analise_rfm')
      .select('codigo_cliente, dias_sem_comprar')
      .in('codigo_cliente', clienteCodes)
      .order('data_analise', { ascending: false })

    semVisita60dPorCodVendedor = countSemVisita60d(clientesData, buildDsvMap(rfmData))
  }

  // Montar mapas por vendedorId
  const visitasPorVendedor = groupBy(visitasData ?? [], (v) => v.vendedor_id)
  const agsPorVendedor = groupBy(agendamentosData ?? [], (a) => a.vendedor_id)

  const metaPorCodVendedor = new Map<number, number>()
  for (const m of metasData ?? []) {
    metaPorCodVendedor.set(m.cod_vendedor, m.meta_valor ?? 0)
  }

  // Montar KPIs por vendedor.
  // Vendedores ativos sempre aparecem (mesmo com zero atividade — sinaliza quem não visitou
  // ninguém no período). Vendedores inativos só aparecem quando têm registro no período.
  const kpis: KpisVendedor[] = vendedores
    .filter((vendedor) => {
      if (vendedor.status === 'ativo') return true
      const temVisitas = (visitasPorVendedor.get(vendedor.id) ?? []).length > 0
      const temAgs = (agsPorVendedor.get(vendedor.id) ?? []).length > 0
      return temVisitas || temAgs
    })
    .map((vendedor) => {
    const visitas = visitasPorVendedor.get(vendedor.id) ?? []
    const ags = agsPorVendedor.get(vendedor.id) ?? []
    const metaMensal = metaPorCodVendedor.get(vendedor.cod_vendedor ?? -1) ?? 0
    const meta = periodo === 'semana' ? metaMensal / 4 : periodo === 'trimestre' ? metaMensal * 3 : metaMensal

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

export function useGestaoAgenda(periodo: PeriodoAgenda, refDate: Date = new Date()) {
  const [kpis, setKpis] = useState<KpisVendedor[]>([])
  const [resumo, setResumo] = useState<ResumoEquipe>({
    totalVisitas: 0,
    totalVendasGeradas: 0,
    totalAgendamentosPendentes: 0,
    forecastTotal: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refDateMs = refDate.getTime()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchKpis(periodo, new Date(refDateMs))
      setKpis(result.kpis)
      setResumo(result.resumo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [periodo, refDateMs])

  useEffect(() => {
    load()
  }, [load])

  return { kpis, resumo, loading, error }
}

export function useKpisDetalhadosVendedor(vendedorId: string, periodo: PeriodoAgendaDetalhe, refDate: Date = new Date()) {
  const [data, setData] = useState<KpisDetalhadosVendedor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refDateMs = refDate.getTime()

  const load = useCallback(async () => {
    if (!vendedorId) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchKpisDetalhados(vendedorId, periodo, new Date(refDateMs))
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [vendedorId, periodo, refDateMs])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error }
}
