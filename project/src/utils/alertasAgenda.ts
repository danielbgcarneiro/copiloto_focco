/**
 * Copiloto Focco Brasil
 * Utils: alertasAgenda — utilitários de alertas visuais (Story 3.11)
 */

import type { AgendamentoDia } from '../hooks/useAgenda'

export type DsvAlertLevel = 'normal' | 'amarelo' | 'vermelho'

/**
 * Retorna o nível de alerta para DSV dado os limiares configuráveis.
 */
export function getDsvAlertLevel(
  dsv: number | null | undefined,
  amareloDias: number,
  vermelhoDias: number
): DsvAlertLevel {
  if (dsv == null) return 'normal'
  if (dsv > vermelhoDias) return 'vermelho'
  if (dsv > amareloDias) return 'amarelo'
  return 'normal'
}

/**
 * Conta agendamentos pendentes em dias anteriores a hoje dentro do cache.
 * Usado para o banner "X visita(s) sem resultado registrado".
 */
export function hasAgendamentosSemResultado(
  cache: Record<string, AgendamentoDia[]>,
  todayStr: string
): number {
  let count = 0
  for (const [dateStr, ags] of Object.entries(cache)) {
    if (dateStr >= todayStr) continue
    count += ags.filter((ag) => ag.status === 'pendente').length
  }
  return count
}

/**
 * Retorna true quando o realizado está abaixo do threshold (em %) da meta
 * e já é quinta-feira ou mais tarde na semana.
 */
export function isForecastEmRisco(
  realizado: number,
  meta: number,
  thresholdPct: number,
  diaSemana: number // 0=dom, 4=qui
): boolean {
  return meta > 0 && realizado < meta * (thresholdPct / 100) && diaSemana >= 4
}

/**
 * Retorna true quando a oportunidade agendada é menor que 50% da meta semanal.
 */
export function isCoberturaAgendaBaixa(
  oportunidade: number,
  meta: number
): boolean {
  return meta > 0 && oportunidade < meta * 0.5
}
