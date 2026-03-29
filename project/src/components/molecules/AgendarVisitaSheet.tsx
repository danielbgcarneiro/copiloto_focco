/**
 * Copiloto Focco Brasil
 * Molecule: AgendarVisitaSheet — bottom sheet para agendar próxima visita (Story 3.3)
 */

import React, { useState, useEffect, useRef } from 'react'
import { X, Calendar, AlertCircle } from 'lucide-react'
import { calcularSugestaoData, SugestaoData, CriarAgendamentoParams, EditarAgendamentoParams, Agendamento } from '../../hooks/useVisitas'
import { verificarForecastAtipico } from '../../utils/agendaUtils'

interface AgendarVisitaSheetProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  codigoCliente: number
  vendedorId: string
  agendamentoExistente?: Agendamento | null
  criarAgendamento: (params: CriarAgendamentoParams) => Promise<Agendamento>
  editarAgendamento: (id: string, params: EditarAgendamentoParams) => Promise<Agendamento>
}

function formatarDataBR(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

export const AgendarVisitaSheet: React.FC<AgendarVisitaSheetProps> = ({
  isOpen,
  onClose,
  onSuccess,
  codigoCliente,
  vendedorId,
  agendamentoExistente,
  criarAgendamento,
  editarAgendamento,
}) => {
  const hoje = new Date().toISOString().split('T')[0]
  const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const initialDate = agendamentoExistente?.data_agendada ?? amanha
  const initialValor = agendamentoExistente?.valor_previsto != null
    ? String(agendamentoExistente.valor_previsto)
    : ''

  const [dataAgendada, setDataAgendada] = useState(initialDate)
  const [valorPrevisto, setValorPrevisto] = useState(initialValor)
  const [sugestao, setSugestao] = useState<SugestaoData | null>(null)
  const [loadingSugestao, setLoadingSugestao] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedForRef = useRef<number | null>(null)

  // Aviso de forecast atípico (Story 3.10)
  const [forecastWarning, setForecastWarning] = useState<{ mediaHistorica: number } | null>(null)
  const [loadingForecast, setLoadingForecast] = useState(false)

  // Bloquear edição de valor_previsto se data já passou (AC13)
  const dataPassada = agendamentoExistente && agendamentoExistente.data_agendada < hoje

  useEffect(() => {
    if (!isOpen) return
    // Reset ao abrir
    setDataAgendada(agendamentoExistente?.data_agendada ?? amanha)
    setValorPrevisto(
      agendamentoExistente?.valor_previsto != null
        ? String(agendamentoExistente.valor_previsto)
        : ''
    )
    setError(null)
    setForecastWarning(null)

    // Carregar sugestão apenas uma vez por cliente
    if (loadedForRef.current === codigoCliente) return
    loadedForRef.current = codigoCliente
    setLoadingSugestao(true)
    calcularSugestaoData(codigoCliente)
      .then(s => setSugestao(s))
      .catch(() => setSugestao(null))
      .finally(() => setLoadingSugestao(false))
  }, [isOpen, codigoCliente, agendamentoExistente, amanha])

  const handleSugestaoClick = () => {
    if (!sugestao) return
    const iso = sugestao.data.toISOString().split('T')[0]
    if (iso > hoje) setDataAgendada(iso)
  }

  const handleValorBlur = async () => {
    if (!valorPrevisto) {
      setForecastWarning(null)
      return
    }
    const valor = parseFloat(valorPrevisto.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) {
      setForecastWarning(null)
      return
    }
    setLoadingForecast(true)
    try {
      const resultado = await verificarForecastAtipico(codigoCliente, valor)
      setForecastWarning(resultado.atipico ? { mediaHistorica: resultado.mediaHistorica } : null)
    } catch {
      setForecastWarning(null)
    } finally {
      setLoadingForecast(false)
    }
  }

  const handleConfirmar = async () => {
    if (!dataAgendada || dataAgendada <= hoje) {
      setError('Selecione uma data futura.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const valorNum = valorPrevisto ? parseFloat(valorPrevisto.replace(',', '.')) : null
      if (agendamentoExistente) {
        await editarAgendamento(agendamentoExistente.id, {
          dataAgendada,
          valorPrevisto: valorNum,
        })
      } else {
        await criarAgendamento({
          vendedorId,
          codigoCliente,
          dataAgendada,
          valorPrevisto: valorNum,
        })
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar agendamento.')
    } finally {
      setSaving(false)
    }
  }

  const sugestaoTexto = () => {
    if (loadingSugestao) return 'Calculando sugestão...'
    if (!sugestao) return null
    const d = formatarDataBR(sugestao.data.toISOString().split('T')[0])
    if (sugestao.fonte === 'historico' && sugestao.mediaIntervaloDias) {
      return `Sugestão: ${d} (média de ${sugestao.mediaIntervaloDias} dias entre visitas)`
    }
    if (sugestao.fonte === 'compras_anuais' && sugestao.mediaIntervaloDias) {
      return `Sugestão: ${d} (baseado em frequência de compras)`
    }
    return `Sugestão: ${d} (padrão 45 dias)`
  }

  if (!isOpen) return null

  const titulo = agendamentoExistente ? 'Editar agendamento' : 'Agendar próxima visita'

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl px-5 pt-5 pb-8 max-h-[70vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Data */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data da visita <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={dataAgendada}
            min={amanha}
            onChange={e => setDataAgendada(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Sugestão de data */}
        {(loadingSugestao || sugestao) && (
          <button
            type="button"
            onClick={handleSugestaoClick}
            disabled={loadingSugestao}
            className="w-full text-left text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4 hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {sugestaoTexto()}
          </button>
        )}

        {/* Valor previsto */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor previsto (R$) <span className="text-gray-400 text-xs">opcional</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={valorPrevisto}
            onChange={(e) => {
              setValorPrevisto(e.target.value)
              setForecastWarning(null)
            }}
            onBlur={handleValorBlur}
            disabled={!!dataPassada}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
          />
          {dataPassada && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Valor previsto não pode ser editado após a data de visita
            </p>
          )}
          {loadingForecast && (
            <p className="text-xs text-gray-400 mt-1">Verificando histórico...</p>
          )}
          {!loadingForecast && forecastWarning && (
            <p className="text-orange-600 text-sm mt-1 flex items-start gap-1">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              Sua previsão está acima do dobro da média histórica deste cliente (R${' '}
              {forecastWarning.mediaHistorica.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              )
            </p>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Confirmar */}
        <button
          onClick={handleConfirmar}
          disabled={saving || !dataAgendada}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Salvando...' : 'Confirmar agendamento'}
        </button>
      </div>
    </>
  )
}
