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
