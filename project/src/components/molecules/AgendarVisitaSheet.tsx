/**
 * Copiloto Focco Brasil
 * Molecule: AgendarVisitaSheet — bottom sheet para agendar próxima visita (Story 3.3)
 */

import React, { useState, useEffect, useRef } from 'react'
import { X, Calendar, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
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

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay() // 0=Dom
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Monday-first: Dom=6, Seg=0, Ter=1…
  const offset = firstDow === 0 ? 6 : firstDow - 1
  const cells: (number | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
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

  const [dataAgendada, setDataAgendada]     = useState(initialDate)
  const [valorPrevisto, setValorPrevisto]   = useState(initialValor)
  const [viewYear, setViewYear]             = useState(() => new Date(initialDate).getFullYear())
  const [viewMonth, setViewMonth]           = useState(() => new Date(initialDate).getMonth())
  const [sugestao, setSugestao]             = useState<SugestaoData | null>(null)
  const [loadingSugestao, setLoadingSugestao] = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const loadedForRef                        = useRef<number | null>(null)

  const [forecastWarning, setForecastWarning] = useState<{ mediaHistorica: number } | null>(null)
  const [loadingForecast, setLoadingForecast] = useState(false)

  const dataPassada = agendamentoExistente && agendamentoExistente.data_agendada < hoje

  useEffect(() => {
    if (!isOpen) return
    const date = agendamentoExistente?.data_agendada ?? amanha
    setDataAgendada(date)
    setValorPrevisto(agendamentoExistente?.valor_previsto != null ? String(agendamentoExistente.valor_previsto) : '')
    setError(null)
    setForecastWarning(null)
    const d = new Date(date)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())

    if (loadedForRef.current === codigoCliente) return
    loadedForRef.current = codigoCliente
    setLoadingSugestao(true)
    calcularSugestaoData(codigoCliente)
      .then(s => setSugestao(s))
      .catch(() => setSugestao(null))
      .finally(() => setLoadingSugestao(false))
  }, [isOpen, codigoCliente, agendamentoExistente, amanha])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function handleDayClick(day: number) {
    const iso = toISO(viewYear, viewMonth, day)
    if (iso <= hoje) return
    setDataAgendada(iso)
  }

  const handleSugestaoClick = () => {
    if (!sugestao) return
    const iso = sugestao.data.toISOString().split('T')[0]
    if (iso > hoje) {
      setDataAgendada(iso)
      const d = new Date(iso)
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }

  const handleValorBlur = async () => {
    if (!valorPrevisto) { setForecastWarning(null); return }
    const valor = parseFloat(valorPrevisto.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) { setForecastWarning(null); return }
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
        await editarAgendamento(agendamentoExistente.id, { dataAgendada, valorPrevisto: valorNum })
      } else {
        await criarAgendamento({ vendedorId, codigoCliente, dataAgendada, valorPrevisto: valorNum })
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
    if (sugestao.fonte === 'historico' && sugestao.mediaIntervaloDias)
      return `Sugestão: ${d} (média de ${sugestao.mediaIntervaloDias} dias entre visitas)`
    if (sugestao.fonte === 'compras_anuais' && sugestao.mediaIntervaloDias)
      return `Sugestão: ${d} (baseado em frequência de compras)`
    return `Sugestão: ${d} (padrão 45 dias)`
  }

  if (!isOpen) return null

  const titulo = agendamentoExistente ? 'Editar agendamento' : 'Agendar próxima visita'
  const cells   = buildCalendarCells(viewYear, viewMonth)

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl px-5 pt-5 pb-8 max-h-[90vh] overflow-y-auto"
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

        {/* ── Calendário ── */}
        <div className="mb-4 border border-gray-200 rounded-xl overflow-hidden">
          {/* Navegação mês/ano */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <button
              onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {MESES[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Cabeçalho dias da semana */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Células dos dias */}
          <div className="grid grid-cols-7 p-2 gap-y-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />

              const iso       = toISO(viewYear, viewMonth, day)
              const isPast    = iso <= hoje
              const isSelected = iso === dataAgendada
              const isToday   = iso === hoje

              return (
                <button
                  key={iso}
                  onClick={() => handleDayClick(day)}
                  disabled={isPast}
                  className={`
                    mx-auto w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-colors
                    ${isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : isToday
                      ? 'ring-2 ring-blue-400 text-blue-700'
                      : isPast
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-blue-50 active:bg-blue-100 cursor-pointer'
                    }
                  `}
                  aria-label={`${day} de ${MESES[viewMonth]}`}
                  aria-pressed={isSelected}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Data selecionada */}
          {dataAgendada && dataAgendada > hoje && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-blue-50 text-sm text-blue-700 font-medium text-center">
              Selecionado: {new Date(dataAgendada + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          )}
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
            onChange={(e) => { setValorPrevisto(e.target.value); setForecastWarning(null) }}
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
          {loadingForecast && <p className="text-xs text-gray-400 mt-1">Verificando histórico...</p>}
          {!loadingForecast && forecastWarning && (
            <p className="text-orange-600 text-sm mt-1 flex items-start gap-1">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              Sua previsão está acima do dobro da média histórica deste cliente (R${' '}
              {forecastWarning.mediaHistorica.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          disabled={saving || !dataAgendada || dataAgendada <= hoje}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Salvando...' : 'Confirmar agendamento'}
        </button>
      </div>
    </>
  )
}
