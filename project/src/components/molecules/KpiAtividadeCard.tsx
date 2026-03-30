/**
 * Copiloto Focco Brasil
 * Molecule: KpiAtividadeCard — KPIs de atividade do vendedor (Story 3.14 AC3)
 */

import { Activity } from 'lucide-react'

interface KpiAtividadeCardProps {
  totalVisitas: number
  visitasAgendadas: number
  taxaCumprimento: number
  taxaConversao: number
  mediaVisitasPorSemana: number
}

export function KpiAtividadeCard({
  totalVisitas,
  visitasAgendadas,
  taxaCumprimento,
  taxaConversao,
  mediaVisitasPorSemana,
}: KpiAtividadeCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-gray-900">Atividade</h3>
      </div>

      <div className="space-y-2.5">
        <Row
          label="Visitas realizadas"
          value={String(totalVisitas)}
          valueClass="text-gray-900 font-bold"
        />
        <Row
          label="Realizadas / Agendadas"
          value={`${totalVisitas} / ${visitasAgendadas}`}
          sub={visitasAgendadas > 0 ? `${taxaCumprimento.toFixed(0)}% cumprimento` : undefined}
          valueClass="text-gray-900"
        />
        <Row
          label="Taxa de conversão"
          value={`${taxaConversao.toFixed(1)}%`}
          valueClass={taxaConversao >= 50 ? 'text-green-700 font-semibold' : taxaConversao >= 25 ? 'text-orange-600 font-semibold' : 'text-red-600 font-semibold'}
        />
        <Row
          label="Média por semana"
          value={`${mediaVisitasPorSemana.toFixed(1)} visitas`}
          valueClass="text-gray-900"
        />
      </div>
    </div>
  )
}

function Row({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-gray-500 leading-tight">{label}</span>
      <div className="text-right flex-shrink-0">
        <span className={`text-xs ${valueClass ?? 'text-gray-700'}`}>{value}</span>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}
