/**
 * Copiloto Focco Brasil
 * Molecule: KpiQualidadeCard — KPIs de qualidade do vendedor (Story 3.14 AC5)
 */

import { Star } from 'lucide-react'
import { TopMotivo } from '../../hooks/useGestaoAgenda'

interface KpiQualidadeCardProps {
  topMotivos: TopMotivo[]
  pctComObservacao: number
  clientes30d: number
  clientes60d: number
  clientes90d: number
}

export function KpiQualidadeCard({
  topMotivos,
  pctComObservacao,
  clientes30d,
  clientes60d,
  clientes90d,
}: KpiQualidadeCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-gray-900">Qualidade</h3>
      </div>

      {/* Motivos de não-venda */}
      <div className="mb-3">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
          Top motivos de não-venda
        </p>
        {topMotivos.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Nenhuma não-venda registrada</p>
        ) : (
          <div className="space-y-1">
            {topMotivos.map((m, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-700 truncate">{m.motivo}</span>
                <span className="text-xs font-semibold text-gray-900 flex-shrink-0">{m.count}x</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* % com observação */}
      <div className="flex justify-between gap-2 mb-3 pb-3 border-b border-gray-50">
        <span className="text-xs text-gray-500">Visitas com observação</span>
        <span className={`text-xs font-semibold ${pctComObservacao >= 70 ? 'text-green-700' : pctComObservacao >= 40 ? 'text-orange-600' : 'text-red-600'}`}>
          {pctComObservacao.toFixed(0)}%
        </span>
      </div>

      {/* Clientes sem compra */}
      <div>
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
          Clientes sem compra
        </p>
        <div className="grid grid-cols-3 gap-2">
          <DsvBadge label="+30d" count={clientes30d} color="text-yellow-600 bg-yellow-50" />
          <DsvBadge label="+60d" count={clientes60d} color="text-orange-600 bg-orange-50" />
          <DsvBadge label="+90d" count={clientes90d} color="text-red-600 bg-red-50" />
        </div>
      </div>
    </div>
  )
}

function DsvBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-lg p-2 text-center ${color}`}>
      <p className="text-sm font-bold">{count}</p>
      <p className="text-[10px] font-medium">{label}</p>
    </div>
  )
}
