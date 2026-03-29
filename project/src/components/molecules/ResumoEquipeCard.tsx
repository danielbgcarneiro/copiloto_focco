/**
 * Copiloto Focco Brasil
 * Molecule: ResumoEquipeCard — totais consolidados da equipe (Story 3.13 AC3)
 */

import { CheckCircle, DollarSign, Calendar, TrendingUp } from 'lucide-react'
import { ResumoEquipe } from '../../hooks/useGestaoAgenda'

interface ResumoEquipeCardProps {
  resumo: ResumoEquipe
}

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export function ResumoEquipeCard({ resumo }: ResumoEquipeCardProps) {
  const items = [
    {
      label: 'Visitas realizadas',
      value: String(resumo.totalVisitas),
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Vendas geradas',
      value: fmt(resumo.totalVendasGeradas),
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Ag. pendentes',
      value: String(resumo.totalAgendamentosPendentes),
      icon: Calendar,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Forecast equipe',
      value: fmt(resumo.forecastTotal),
      icon: TrendingUp,
      color: 'text-primary',
      bg: 'bg-primary/5',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {items.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className={`${bg} rounded-xl p-3 flex items-start gap-2`}>
          <Icon className={`w-4 h-4 ${color} flex-shrink-0 mt-0.5`} />
          <div className="min-w-0">
            <p className={`text-sm font-bold ${color} truncate`}>{value}</p>
            <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
