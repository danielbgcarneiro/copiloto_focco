/**
 * Copiloto Focco Brasil
 * Molecule: VisitaRegistradaCard — exibe resumo de visita registrada hoje (Story 3.2)
 */

import React from 'react'
import { Check, XCircle, UserX, RotateCcw } from 'lucide-react'
import { Visita } from '../../hooks/useVisitas'

interface VisitaRegistradaCardProps {
  visita: Visita
}

const resultadoConfig = {
  vendeu: {
    label: 'Vendeu',
    icon: Check,
    cardClass: 'bg-green-50 border-green-200',
    iconClass: 'text-green-600',
    labelClass: 'text-green-800',
  },
  nao_vendeu: {
    label: 'Não vendeu',
    icon: XCircle,
    cardClass: 'bg-red-50 border-red-200',
    iconClass: 'text-red-600',
    labelClass: 'text-red-800',
  },
  ausente: {
    label: 'Ausente',
    icon: UserX,
    cardClass: 'bg-gray-50 border-gray-200',
    iconClass: 'text-gray-500',
    labelClass: 'text-gray-700',
  },
  reagendou: {
    label: 'Reagendou',
    icon: RotateCcw,
    cardClass: 'bg-blue-50 border-blue-200',
    iconClass: 'text-blue-600',
    labelClass: 'text-blue-800',
  },
}

export const VisitaRegistradaCard: React.FC<VisitaRegistradaCardProps> = ({ visita }) => {
  const config = resultadoConfig[visita.resultado]
  const Icon = config.icon

  const horario = new Date(visita.created_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`border-2 rounded-xl p-3 ${config.cardClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.iconClass}`} />
          <span className={`text-sm font-semibold ${config.labelClass}`}>
            {config.label}
          </span>
        </div>
        <span className="text-xs text-gray-400">às {horario}</span>
      </div>

      {visita.valor_realizado != null && (
        <p className="text-xs text-gray-600 mt-1.5">
          Valor:{' '}
          <span className="font-semibold text-green-700">
            R$ {visita.valor_realizado.toFixed(2).replace('.', ',')}
          </span>
        </p>
      )}

      {visita.observacoes && (
        <p className="text-xs text-gray-600 mt-1 italic">"{visita.observacoes}"</p>
      )}
    </div>
  )
}
