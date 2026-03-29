/**
 * Copiloto Focco Brasil
 * Util: scoreCliente — cálculo de score de prioridade de visita (Story 3.9)
 *
 * Fórmula:
 *   score = (oportunidade_norm × pesos.oportunidade)
 *         + (dsv_norm          × pesos.dsv)
 *         + (bonus_historico   × pesos.historico)
 *
 * oportunidade_norm = previsao_pedido / max(previsao_pedido na carteira)
 * dsv_norm          = min(dias_sem_comprar / 90, 1.0)
 * bonus_historico   = 1.0 se última visita = 'vendeu'; 0.5 se outro resultado; 0.0 se sem histórico
 */

export interface ScorePesos {
  oportunidade: number // peso para previsao_pedido normalizado (default 0.5)
  dsv: number          // peso para dias_sem_comprar normalizado (default 0.3)
  historico: number    // peso para bonus de última visita     (default 0.2)
}

export const PESOS_DEFAULT: ScorePesos = {
  oportunidade: 0.5,
  dsv: 0.3,
  historico: 0.2,
}

export interface ClienteRFM {
  codigo_cliente: number
  nome_fantasia: string | null
  razao_social: string
  cidade: string | null
  perfil_rfm: string | null
  previsao_pedido: number       // previsao_pedido de analise_rfm
  dias_sem_comprar: number      // dias_sem_comprar de analise_rfm
  resultado_ultima_visita?: string | null // de visitas mais recente
}

/**
 * Calcula o score de prioridade para um cliente.
 * @param cliente     Dados do cliente com RFM
 * @param maxOportunidade  Máximo de previsao_pedido na carteira (para normalização)
 * @param pesos       Pesos configuráveis
 */
export function calcularScoreCliente(
  cliente: ClienteRFM,
  maxOportunidade: number,
  pesos: ScorePesos
): number {
  const oportunidadeNorm =
    maxOportunidade > 0 ? Math.min(cliente.previsao_pedido / maxOportunidade, 1.0) : 0

  const dsvNorm = Math.min(cliente.dias_sem_comprar / 90, 1.0)

  const bonusHistorico =
    cliente.resultado_ultima_visita === 'vendeu'
      ? 1.0
      : cliente.resultado_ultima_visita != null
      ? 0.5
      : 0.0

  return (
    oportunidadeNorm * pesos.oportunidade +
    dsvNorm * pesos.dsv +
    bonusHistorico * pesos.historico
  )
}

/**
 * Ordena lista de clientes com score calculado do maior para o menor.
 */
export function ordenarPorScore<T extends { score: number }>(clientes: T[]): T[] {
  return [...clientes].sort((a, b) => b.score - a.score)
}
