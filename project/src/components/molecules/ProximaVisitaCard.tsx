/**
 * Copiloto Focco Brasil
 * Molecule: ProximaVisitaCard — exibe agendamento pendente (Story 3.3)
 */

import React, { useState } from 'react'
import { Calendar, Edit2, X, AlertCircle } from 'lucide-react'
import { Agendamento } from '../../hooks/useVisitas'

interface ProximaVisitaCardProps {
  agendamento: Agendamento
  onEditar: () => void
  onCancelado: () => void
  cancelarAgendamento: (id: string) => Promise<void>
}

function formatarDataBR(dateStr: string): string {
  const [ano, m, d] = dateStr.split('-')
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const anoAtual = new Date().getFullYear()
  const sufixoAno = parseInt(ano) !== anoAtual ? ` ${ano}` : ''
  return `${d} ${meses[parseInt(m) - 1]}${sufixoAno}`
}

function diasAte(dateStr: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(dateStr + 'T00:00:00')
  return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

export const ProximaVisitaCard: React.FC<ProximaVisitaCardProps> = ({
  agendamento,
  onEditar,
  onCancelado,
  cancelarAgendamento,
}) => {
  const [confirmando, setConfirmando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dias = diasAte(agendamento.data_agendada)
  const dataBR = formatarDataBR(agendamento.data_agendada)

  const handleCancelar = async () => {
    setCancelando(true)
    setError(null)
    try {
      await cancelarAgendamento(agendamento.id)
      setConfirmando(false)
      onCancelado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar.')
    } finally {
      setCancelando(false)
    }
  }

  return (
    <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">{dataBR}</span>
          <span className="text-xs text-blue-500">
            {dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEditar}
            className="p-2.5 rounded-lg text-blue-600 hover:bg-blue-100 active:bg-blue-200 transition-colors"
            aria-label="Editar agendamento"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setConfirmando(true)}
            className="p-2.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 active:bg-red-100 transition-colors"
            aria-label="Cancelar agendamento"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Valor previsto */}
      {agendamento.valor_previsto != null && agendamento.valor_previsto > 0 ? (
        <p className="text-xs text-blue-600">
          Valor previsto:{' '}
          <span className="font-semibold">
            R$ {agendamento.valor_previsto.toFixed(2).replace('.', ',')}
          </span>
        </p>
      ) : (
        /* AC10: indicador azul quando valor_previsto é null/0 (Story 3.11) */
        <p className="text-xs text-blue-500 italic">
          Adicione uma previsão de valor
        </p>
      )}

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2 mt-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Modal de confirmação de cancelamento */}
      {confirmando && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-xs text-gray-700 mb-2">Cancelar este agendamento?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmando(false)}
              disabled={cancelando}
              className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Não
            </button>
            <button
              onClick={handleCancelar}
              disabled={cancelando}
              className="flex-1 text-xs py-1.5 px-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {cancelando ? 'Cancelando...' : 'Sim, cancelar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
