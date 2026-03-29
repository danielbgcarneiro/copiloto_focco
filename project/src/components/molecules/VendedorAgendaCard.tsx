/**
 * Copiloto Focco Brasil
 * Molecule: VendedorAgendaCard — linha de vendedor com KPIs de agenda (Story 3.13 AC4)
 *
 * AC4: Nome, visitas, taxa conversão, realizado vs meta (barra), clientes sem visita 60d
 * AC5: Badge vermelho quando 0 visitas no período
 * AC6: Tap → drilldown do vendedor (Story 3.14)
 */

import { AlertTriangle, ChevronRight } from 'lucide-react'
import { KpisVendedor } from '../../hooks/useGestaoAgenda'

interface VendedorAgendaCardProps {
  kpi: KpisVendedor
  onClick: () => void
}

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export function VendedorAgendaCard({ kpi, onClick }: VendedorAgendaCardProps) {
  const progresso = kpi.meta > 0 ? Math.min((kpi.realizado / kpi.meta) * 100, 100) : 0
  const semVisitas = kpi.visitasRealizadas === 0

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 active:bg-gray-50 transition-colors cursor-pointer"
      aria-label={`${kpi.nome}, ${kpi.visitasRealizadas} visitas`}
    >
      {/* Linha 1: nome + badge alerta */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{kpi.nome}</p>
          {/* AC5: badge vermelho quando 0 visitas */}
          {semVisitas && (
            <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold flex-shrink-0">
              <AlertTriangle className="w-3 h-3" />
              Sem visitas
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>

      {/* Linha 2: KPIs */}
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <span className="text-xs text-gray-600">
          <span className="font-semibold text-gray-900">{kpi.visitasRealizadas}</span> visita{kpi.visitasRealizadas !== 1 ? 's' : ''}
        </span>
        <span className="text-gray-200">·</span>
        <span className="text-xs text-gray-600">
          Conv.{' '}
          <span className={`font-semibold ${kpi.taxaConversao >= 50 ? 'text-green-700' : 'text-orange-600'}`}>
            {kpi.taxaConversao.toFixed(0)}%
          </span>
        </span>
        {kpi.clientesSemVisita60d > 0 && (
          <>
            <span className="text-gray-200">·</span>
            <span className="text-xs text-red-600 font-medium">
              {kpi.clientesSemVisita60d} s/ visita 60d+
            </span>
          </>
        )}
      </div>

      {/* Linha 3: barra de progresso Realizado / Meta */}
      {kpi.meta > 0 && (
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] text-gray-500">
              {fmt(kpi.realizado)} / {fmt(kpi.meta)}
            </span>
            <span className={`text-[11px] font-semibold ${progresso >= 100 ? 'text-green-600' : 'text-gray-500'}`}>
              {progresso.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all ${
                progresso >= 100 ? 'bg-green-500' : progresso >= 40 ? 'bg-blue-500' : 'bg-red-400'
              }`}
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}
    </button>
  )
}
