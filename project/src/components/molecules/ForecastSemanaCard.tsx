/**
 * Copiloto Focco Brasil
 * Molecule: ForecastSemanaCard — forecast semanal (Story 3.7)
 *
 * AC2: Planejado, Oportunidade, Meta, Realizado
 * AC2: Barra de progresso Realizado / Meta
 * Story 3.11 — AC7: Badge "Meta em risco" via isForecastEmRisco + useConfiguracoes
 * Story 3.11 — AC8: Banner "Cobertura baixa" via isCoberturaAgendaBaixa
 */

import { useConfiguracoes } from '../../hooks/useConfiguracoes'
import { isForecastEmRisco, isCoberturaAgendaBaixa } from '../../utils/alertasAgenda'

interface ForecastSemanaCardProps {
  planejado: number
  oportunidade: number
  metaSemana: number
  realizado: number
  onVerSugestoes?: () => void
}

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

export function ForecastSemanaCard({
  planejado,
  oportunidade,
  metaSemana,
  realizado,
  onVerSugestoes,
}: ForecastSemanaCardProps) {
  const config = useConfiguracoes()
  const progresso = metaSemana > 0 ? Math.min((realizado / metaSemana) * 100, 100) : 0
  const hoje = new Date().getDay() // 0=dom, 4=qui, 5=sex, 6=sab

  // AC7: threshold configurável via useConfiguracoes (Story 3.11)
  const metaEmRisco = isForecastEmRisco(realizado, metaSemana, config.threshold_forecast_risco_pct, hoje)

  // AC8: cobertura baixa — oportunidade agendada < 50% da meta (Story 3.11)
  const coberturaAgendaBaixa = isCoberturaAgendaBaixa(oportunidade, metaSemana)

  const barColor =
    progresso >= 100 ? 'bg-green-500' : progresso >= 40 ? 'bg-blue-500' : 'bg-red-400'

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Forecast da Semana
        </p>
        {metaEmRisco && (
          <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">
            ⚠ Meta em risco
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1 mb-2">
        {[
          { label: 'Planejado', value: planejado, color: 'text-blue-600' },
          { label: 'Oportunidade', value: oportunidade, color: 'text-yellow-600' },
          { label: 'Meta', value: metaSemana, color: 'text-gray-500' },
          { label: 'Realizado', value: realizado, color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center">
            <span className={`text-sm font-bold ${color} tabular-nums`}>{fmt(value)}</span>
            <span className="text-[10px] text-gray-400 mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      {/* Barra de progresso Realizado / Meta */}
      {metaSemana > 0 && (
        <div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all ${barColor}`}
              style={{ width: `${progresso}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 text-right">
            {Math.round(progresso)}% da meta
          </p>
        </div>
      )}

      {/* AC8: banner cobertura baixa (Story 3.11) */}
      {coberturaAgendaBaixa && (
        <div className="mt-2 flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="text-[11px] text-amber-700">
            Agenda com cobertura baixa
          </p>
          {onVerSugestoes && (
            <button
              onClick={onVerSugestoes}
              className="text-[11px] text-amber-800 font-semibold underline whitespace-nowrap cursor-pointer"
            >
              ver sugestões
            </button>
          )}
        </div>
      )}
    </div>
  )
}
