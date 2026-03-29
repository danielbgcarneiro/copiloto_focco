/**
 * Copiloto Focco Brasil
 * Molecule: AgendamentoCard — card de agendamento com contexto de negócio (Story 3.7)
 *
 * AC3: nome, cidade, perfil RFM, oportunidade, DSV, valor_previsto
 * AC4: badge DSV amarelo >60d, vermelho >90d (thresholds configuráveis Story 3.11)
 * AC5: ícone de resultado + valor_realizado
 * AC6: tap → DetalhesCliente (via onClick)
 * AC7: botão "Registrar resultado" (via onRegistrar)
 *
 * Story 3.11 — Alertas visuais:
 * - AC3/AC4: thresholds DSV via useConfiguracoes + borda esquerda colorida
 * - AC5: badge azul "Sem previsão" quando valor_previsto null/0 e visita em ≤3 dias
 * - AC6: tag "Atenção" quando agendamento pendente de dia passado
 */

import { MapPin, TrendingUp, DollarSign, AlertTriangle, Clock } from 'lucide-react'
import { AgendamentoDiaDetalhado } from '../../hooks/useAgenda'
import { useConfiguracoes } from '../../hooks/useConfiguracoes'
import { getDsvAlertLevel } from '../../utils/alertasAgenda'

interface AgendamentoCardProps {
  ag: AgendamentoDiaDetalhado
  onClick: () => void
  onRegistrar: () => void
}

function getBadgeRfm(perfil: string | null) {
  switch (perfil?.toLowerCase()) {
    case 'ouro':
      return { label: 'Ouro', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
    case 'prata':
      return { label: 'Prata', classes: 'bg-gray-100 text-gray-600 border-gray-200' }
    case 'bronze':
      return { label: 'Bronze', classes: 'bg-orange-100 text-orange-700 border-orange-200' }
    default:
      return { label: 'N/A', classes: 'bg-blue-50 text-blue-500 border-blue-100' }
  }
}

function getResultadoIcon(resultado: string | null): string {
  switch (resultado) {
    case 'vendeu':
      return '✅'
    case 'nao_vendeu':
      return '❌'
    case 'ausente':
      return '👻'
    case 'reagendou':
      return '🔄'
    default:
      return ''
  }
}

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

export function AgendamentoCard({ ag, onClick, onRegistrar }: AgendamentoCardProps) {
  const config = useConfiguracoes()
  const rfmBadge = getBadgeRfm(ag.perfil_rfm)
  const nomeExibido = ag.nome_fantasia || ag.razao_social
  const temResultado = !!ag.visita_resultado

  // AC3: DSV com thresholds configuráveis (Story 3.11)
  const dsvLevel = getDsvAlertLevel(
    ag.dsv,
    config.prazo_alerta_amarelo_dias,
    config.prazo_alerta_vermelho_dias
  )
  const dsvBadge =
    dsvLevel !== 'normal' && ag.dsv != null
      ? {
          label: `${ag.dsv}d s/ comprar`,
          classes:
            dsvLevel === 'vermelho'
              ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700',
        }
      : null

  // AC4: borda esquerda colorida (Story 3.11)
  const borderLeft =
    dsvLevel === 'vermelho'
      ? 'border-l-red-500'
      : dsvLevel === 'amarelo'
      ? 'border-l-yellow-400'
      : 'border-l-transparent'

  // AC5: badge azul "Sem previsão" quando valor_previsto null/0 e visita em ≤3 dias (Story 3.11)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const visitaDate = new Date(ag.data_agendada + 'T00:00:00')
  const diasParaVisita = Math.round(
    (visitaDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
  )
  const showSemPrevisao =
    (ag.valor_previsto === null || ag.valor_previsto === 0) &&
    diasParaVisita >= 0 &&
    diasParaVisita <= 3

  // AC6: "Atenção" quando pendente e data já passou (Story 3.11)
  const showAtencao = ag.status === 'pendente' && diasParaVisita < 0

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border border-gray-100 border-l-4 ${borderLeft} shadow-sm px-4 py-3 active:bg-gray-50 transition-colors cursor-pointer`}
      aria-label={nomeExibido}
    >
      {/* AC6: tag "Atenção" para agendamentos atrasados (Story 3.11) */}
      {showAtencao && (
        <div className="flex items-center gap-1 mb-1.5">
          <Clock className="w-3 h-3 text-orange-500 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-orange-600">Visita em atraso</span>
        </div>
      )}

      {/* Linha 1: nome + badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{nomeExibido}</p>
          {ag.nome_fantasia && (
            <p className="text-xs text-gray-400 truncate">{ag.razao_social}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {temResultado && (
            <span className="text-base leading-none">{getResultadoIcon(ag.visita_resultado)}</span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${rfmBadge.classes}`}>
            {rfmBadge.label}
          </span>
        </div>
      </div>

      {/* Linha 2: cidade + DSV */}
      {(ag.cidade || dsvBadge) && (
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {ag.cidade && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {ag.cidade}
            </span>
          )}
          {dsvBadge && (
            <span
              className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${dsvBadge.classes}`}
            >
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              {dsvBadge.label}
            </span>
          )}
          {/* AC5: badge azul sem previsão (Story 3.11) */}
          {showSemPrevisao && (
            <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">
              Sem previsão de valor
            </span>
          )}
        </div>
      )}

      {/* AC5 quando não há cidade nem DSV badge */}
      {!ag.cidade && !dsvBadge && showSemPrevisao && (
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">
            Sem previsão de valor
          </span>
        </div>
      )}

      {/* Linha 3: oportunidade + valor previsto + realizado */}
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        {ag.oportunidade_rfm != null && ag.oportunidade_rfm > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-yellow-600 font-medium">
            <TrendingUp className="w-3 h-3 flex-shrink-0" />
            {fmt(ag.oportunidade_rfm)}
          </span>
        )}
        {ag.valor_previsto != null && ag.valor_previsto > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-blue-600">
            <DollarSign className="w-3 h-3 flex-shrink-0" />
            {fmt(ag.valor_previsto)}
          </span>
        )}
        {temResultado && ag.visita_valor_realizado != null && (
          <span className="text-xs text-green-600 font-semibold">
            Realizado: {fmt(ag.visita_valor_realizado)}
          </span>
        )}
      </div>

      {/* Botão registrar resultado (AC7) */}
      {!temResultado && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRegistrar()
          }}
          className="mt-2 w-full py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold active:bg-primary/20 transition-colors cursor-pointer"
        >
          Registrar resultado
        </button>
      )}
    </button>
  )
}
