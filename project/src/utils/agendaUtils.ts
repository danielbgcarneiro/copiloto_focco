/**
 * Copiloto Focco Brasil
 * Utils: agendaUtils — utilitários compartilhados do módulo Agenda (Story 3.10)
 *
 * calcularSugestaoData: sugestão de próxima visita com base em histórico ou RFM
 * verificarForecastAtipico: aviso quando valor_previsto > 2× média histórica
 */

import { supabase } from '../lib/supabase'

export interface SugestaoData {
  data: Date
  mediaIntervaloDias: number | null
  fonte: 'historico' | 'compras_anuais' | 'padrao'
}

export interface ForecastCheck {
  atipico: boolean
  mediaHistorica: number
}

/**
 * Calcular sugestão de data para próxima visita.
 * Prioridade:
 *   1. Média de intervalo das últimas 3 visitas com resultado = 'vendeu' (cap 90d)
 *   2. Frequência estimada via qtd_compras_ano_atual em analise_rfm (14-90d)
 *   3. Fallback: 45 dias
 */
export async function calcularSugestaoData(codigoCliente: number): Promise<SugestaoData> {
  // 1. Buscar últimas 3 visitas com resultado = 'vendeu'
  const { data: visitas } = await supabase
    .from('visitas')
    .select('data_visita')
    .eq('codigo_cliente', codigoCliente)
    .eq('resultado', 'vendeu')
    .order('data_visita', { ascending: false })
    .limit(3)

  if (visitas && visitas.length >= 2) {
    const intervalos: number[] = []
    for (let i = 0; i < visitas.length - 1; i++) {
      const a = new Date(visitas[i].data_visita).getTime()
      const b = new Date(visitas[i + 1].data_visita).getTime()
      intervalos.push(Math.abs(Math.round((a - b) / (1000 * 60 * 60 * 24))))
    }
    const media = Math.round(intervalos.reduce((acc, v) => acc + v, 0) / intervalos.length)
    const diasFuturos = Math.min(media, 90)
    const data = new Date()
    data.setDate(data.getDate() + diasFuturos)
    return { data, mediaIntervaloDias: media, fonte: 'historico' }
  }

  // 2. Fallback: usar qtd_compras_ano_atual para estimar frequência
  const { data: rfm } = await supabase
    .from('analise_rfm')
    .select('qtd_compras_ano_atual')
    .eq('codigo_cliente', codigoCliente)
    .single()

  if (rfm?.qtd_compras_ano_atual && rfm.qtd_compras_ano_atual > 0) {
    const diasEstimados = Math.round(360 / rfm.qtd_compras_ano_atual)
    const diasFuturos = Math.min(Math.max(diasEstimados, 14), 90)
    const data = new Date()
    data.setDate(data.getDate() + diasFuturos)
    return { data, mediaIntervaloDias: diasEstimados, fonte: 'compras_anuais' }
  }

  // 3. Fallback final: 45 dias
  const data = new Date()
  data.setDate(data.getDate() + 45)
  return { data, mediaIntervaloDias: null, fonte: 'padrao' }
}

// ─── Cálculo de Meta Dinâmica (Story 3.18) ───────────────────────────────────

const FERIADOS_FIXOS_SET = new Set([
  '01-01', '04-21', '05-01', '09-07',
  '10-12', '11-02', '11-15', '11-20', '12-25',
])

const FERIADOS_PASCOA_SET = new Set([
  '2026-04-03', '2027-03-26', '2028-04-14', '2029-04-06', '2030-04-19',
])

function toIsoLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function ehFeriadoLocal(d: Date): boolean {
  const iso = toIsoLocal(d)
  return FERIADOS_PASCOA_SET.has(iso) || FERIADOS_FIXOS_SET.has(iso.slice(5))
}

/** Dias úteis de hoje (inclusive) até o último dia do mês */
export function diasUteisRestantesMes(hoje: Date): number {
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  let count = 0
  const d = new Date(hoje)
  d.setHours(0, 0, 0, 0)
  while (d <= fim) {
    const dow = d.getDay()
    if (dow >= 1 && dow <= 5 && !ehFeriadoLocal(d)) count++
    d.setDate(d.getDate() + 1)
  }
  return Math.max(count, 1)
}

/**
 * Dias úteis de hoje (inclusive) até o fim da semana OU fim do mês,
 * o que vier primeiro. Garante que meta_semana <= saldo_mes.
 */
export function diasUteisSemanaAtual(hoje: Date): number {
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  let count = 0
  const d = new Date(hoje)
  d.setHours(0, 0, 0, 0)
  while (true) {
    const dow = d.getDay()
    if (dow === 0) break           // chegou domingo = nova semana
    if (d > fimMes) break          // passou do fim do mês
    if (dow >= 1 && dow <= 5 && !ehFeriadoLocal(d)) count++
    if (dow === 6) break           // sábado = fim da semana de trabalho
    d.setDate(d.getDate() + 1)
  }
  return Math.max(count, 1)
}

/**
 * Meta da semana dinâmica: saldo do mês distribuído pelos dias úteis restantes.
 * Se o vendedor está atrás da meta, a pressão semanal aumenta.
 */
export function calcularMetaSemana(metaMes: number, realizadoMes: number, hoje: Date): number {
  const saldo = Math.max(metaMes - realizadoMes, 0)
  if (saldo === 0) return 0
  const diasMes = diasUteisRestantesMes(hoje)
  const metaDiaria = saldo / diasMes
  const diasSemana = diasUteisSemanaAtual(hoje)
  return Math.round(metaDiaria * diasSemana)
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verificar se valor_previsto é atípico (> 2× média dos últimos 5 valor_realizado).
 * Retorna { atipico: false } se histórico < 3 vendas com valor.
 */
export async function verificarForecastAtipico(
  codigoCliente: number,
  valorPrevisto: number
): Promise<ForecastCheck> {
  const { data: visitas } = await supabase
    .from('visitas')
    .select('valor_realizado')
    .eq('codigo_cliente', codigoCliente)
    .eq('resultado', 'vendeu')
    .not('valor_realizado', 'is', null)
    .order('data_visita', { ascending: false })
    .limit(5)

  const valores = (visitas ?? [])
    .map((v) => v.valor_realizado as number)
    .filter((v) => v > 0)

  if (valores.length < 3) return { atipico: false, mediaHistorica: 0 }

  const media = valores.reduce((acc, v) => acc + v, 0) / valores.length
  return {
    atipico: valorPrevisto > media * 2.0,
    mediaHistorica: Math.round(media * 100) / 100,
  }
}
