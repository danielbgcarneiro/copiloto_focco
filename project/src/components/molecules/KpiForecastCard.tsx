/**
 * Copiloto Focco Brasil
 * Molecule: KpiForecastCard — KPIs de forecast do vendedor (Story 3.14 AC4)
 */

import { TrendingUp } from 'lucide-react'

interface KpiForecastCardProps {
  forecastTotal: number
  realizadoTotal: number
  forecastAccuracy: number
  meta: number
  atingimentoMeta: number
}

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function accuracyColor(accuracy: number): string {
  if (accuracy >= 1.0) return 'text-green-700'
  if (accuracy >= 0.8) return 'text-yellow-600'
  return 'text-red-600'
}

export function KpiForecastCard({
  forecastTotal,
  realizadoTotal,
  forecastAccuracy,
  meta,
  atingimentoMeta,
}: KpiForecastCardProps) {
  const progresso = Math.min(atingimentoMeta, 100)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-gray-900">Forecast</h3>
      </div>

      <div className="space-y-2.5 mb-3">
        <div className="flex justify-between gap-2">
          <span className="text-xs text-gray-500">Previsão total</span>
          <span className="text-xs text-gray-900">{fmt(forecastTotal)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-xs text-gray-500">Realizado</span>
          <span className="text-xs font-semibold text-gray-900">{fmt(realizadoTotal)}</span>
        </div>
        {forecastTotal > 0 && (
          <div className="flex justify-between gap-2">
            <span className="text-xs text-gray-500">Accuracy</span>
            <div className="text-right">
              <span className={`text-xs font-semibold ${accuracyColor(forecastAccuracy)}`}>
                {(forecastAccuracy * 100).toFixed(0)}%
              </span>
              <p className="text-[10px] text-gray-400">
                {forecastAccuracy >= 1.0 ? 'Superou a previsão' : forecastAccuracy >= 0.8 ? 'Dentro da margem' : 'Abaixo da previsão'}
              </p>
            </div>
          </div>
        )}
      </div>

      {meta > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Meta do período</span>
            <span className={`text-xs font-semibold ${progresso >= 100 ? 'text-green-600' : 'text-gray-600'}`}>
              {atingimentoMeta.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-400">{fmt(realizadoTotal)}</span>
            <span className="text-[11px] text-gray-400">{fmt(meta)}</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${
                progresso >= 100 ? 'bg-green-500' : progresso >= 40 ? 'bg-primary' : 'bg-red-400'
              }`}
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
