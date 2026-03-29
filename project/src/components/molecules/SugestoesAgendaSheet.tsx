/**
 * Copiloto Focco Brasil
 * Molecule: SugestoesAgendaSheet — clientes prioritários sugeridos para a semana (Story 3.9)
 *
 * AC2:  Bottom sheet com lista ordenada por score
 * AC5:  Card: nome, cidade, RFM, DSV, oportunidade, score (barra)
 * AC6:  Tap em cliente → seletor de data inline (fluxo Story 3.8)
 */

import { useState, useCallback } from 'react'
import { X, ChevronLeft, Calendar, DollarSign, AlertTriangle, Plus, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { ClienteSugerido } from '../../hooks/useSugestoesAgenda'
import type { ClienteBusca } from '../../hooks/useBuscaCliente'
import { ClienteBuscaCard } from './ClienteBuscaCard'
import { formatDate, getWeekStart } from '../../hooks/useAgenda'

interface SugestoesAgendaSheetProps {
  isOpen: boolean
  onClose: () => void
  vendedorId: string
  sugestoes: ClienteSugerido[]
  loadingSugestoes: boolean
  onSuccess: (dataAgendada: string) => void
}

const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function SugestoesAgendaSheet({
  isOpen,
  onClose,
  vendedorId,
  sugestoes,
  loadingSugestoes,
  onSuccess,
}: SugestoesAgendaSheetProps) {
  const [step, setStep] = useState<'lista' | 'confirmar'>('lista')
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteSugerido | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState(() => formatDate(new Date()))
  const [valorPrevisto, setValorPrevisto] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [isDuplicata, setIsDuplicata] = useState(false)
  const [loadingInsert, setLoadingInsert] = useState(false)

  function handleSelectCliente(cliente: ClienteSugerido) {
    setClienteSelecionado(cliente)
    setDataSelecionada(formatDate(new Date()))
    setValorPrevisto('')
    setAviso(null)
    setIsDuplicata(false)
    setStep('confirmar')
  }

  function handleVoltar() {
    setStep('lista')
    setClienteSelecionado(null)
    setAviso(null)
    setIsDuplicata(false)
  }

  function handleClose() {
    setStep('lista')
    setClienteSelecionado(null)
    setAviso(null)
    setIsDuplicata(false)
    setValorPrevisto('')
    onClose()
  }

  const handleDataChange = useCallback((novaData: string) => {
    setDataSelecionada(novaData)
    setAviso(null)
    setIsDuplicata(false)
  }, [])

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const weekStart = getWeekStart(hoje)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  async function handleConfirmar(forcarInsert = false) {
    if (!clienteSelecionado) return
    setLoadingInsert(true)
    setAviso(null)

    try {
      if (!forcarInsert) {
        const { data: existente } = await supabase
          .from('agendamentos')
          .select('id')
          .eq('vendedor_id', vendedorId)
          .eq('codigo_cliente', clienteSelecionado.codigo_cliente)
          .eq('data_agendada', dataSelecionada)
          .eq('status', 'pendente')
          .maybeSingle()

        if (existente) {
          setAviso('Já existe agendamento para este cliente nesta data. Deseja criar mesmo assim?')
          setIsDuplicata(true)
          setLoadingInsert(false)
          return
        }
      }

      const valorStr = valorPrevisto.trim().replace(',', '.')
      const valorNum = valorStr ? parseFloat(valorStr) : null

      const { error } = await supabase.from('agendamentos').insert({
        vendedor_id: vendedorId,
        codigo_cliente: clienteSelecionado.codigo_cliente,
        data_agendada: dataSelecionada,
        status: 'pendente',
        valor_previsto: valorNum && !isNaN(valorNum) ? valorNum : null,
      })

      if (error) throw error

      onSuccess(dataSelecionada)
      handleClose()
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'Erro ao criar agendamento')
      setIsDuplicata(false)
    } finally {
      setLoadingInsert(false)
    }
  }

  // Converte ClienteSugerido para ClienteBusca (para reutilizar ClienteBuscaCard)
  function toClienteBusca(c: ClienteSugerido): ClienteBusca {
    return {
      codigo_cliente: c.codigo_cliente,
      nome_fantasia: c.nome_fantasia,
      razao_social: c.razao_social,
      cidade: c.cidade,
      perfil_rfm: c.perfil_rfm,
      dsv: c.dias_sem_comprar,
      oportunidade_rfm: c.previsao_pedido,
      score: c.score,
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet — bottom sheet não fullscreen */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 flex-shrink-0">
          {step === 'confirmar' ? (
            <>
              <button
                onClick={handleVoltar}
                className="p-1 -ml-1 text-gray-500 cursor-pointer"
                aria-label="Voltar para lista"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {clienteSelecionado?.nome_fantasia ?? clienteSelecionado?.razao_social}
                </p>
                <p className="text-xs text-gray-400">Selecione a data</p>
              </div>
            </>
          ) : (
            <>
              <Star className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Sugestões da semana</p>
                {sugestoes.length > 0 && (
                  <p className="text-xs text-gray-400">{sugestoes.length} clientes prioritários</p>
                )}
              </div>
            </>
          )}
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">

          {/* ═══ LISTA ═══ */}
          {step === 'lista' && (
            <div className="px-4 py-3 flex flex-col gap-2">
              {loadingSugestoes ? (
                <div className="flex justify-center py-12">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : sugestoes.length === 0 ? (
                <div className="py-12 text-center">
                  <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Nenhuma sugestão no momento</p>
                  <p className="text-xs text-gray-300 mt-1">
                    Todos os clientes prioritários já têm visita agendada
                  </p>
                </div>
              ) : (
                sugestoes.map((c) => (
                  <div key={c.codigo_cliente} className="flex flex-col gap-1">
                    <ClienteBuscaCard
                      cliente={toClienteBusca(c)}
                      onClick={() => handleSelectCliente(c)}
                    />
                    {/* Barra de score (AC5) */}
                    <div className="flex items-center gap-2 px-1">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.round(c.score * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium w-8 text-right tabular-nums">
                        {Math.round(c.score * 100)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ═══ CONFIRMAR ═══ */}
          {step === 'confirmar' && clienteSelecionado && (
            <div className="px-4 py-4 flex flex-col gap-5">
              {/* Seletor de data — semana corrente */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Data da visita
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
                  {weekDays.map((d) => {
                    const dateStr = formatDate(d)
                    const isPast = d < hoje
                    const isSelected = dateStr === dataSelecionada
                    return (
                      <button
                        key={dateStr}
                        disabled={isPast}
                        onClick={() => handleDataChange(dateStr)}
                        className={[
                          'flex flex-col items-center min-w-[44px] py-2 px-1 rounded-xl text-xs font-medium transition-colors',
                          isPast
                            ? 'opacity-30 cursor-not-allowed'
                            : isSelected
                            ? 'bg-primary text-white cursor-pointer'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer',
                        ].join(' ')}
                      >
                        <span className="text-[10px] opacity-70">{DIAS_ABREV[d.getDay()]}</span>
                        <span className="text-sm font-bold mt-0.5">{d.getDate()}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-400 block mb-1">Ou escolha outra data</label>
                  <input
                    type="date"
                    value={dataSelecionada}
                    min={formatDate(hoje)}
                    onChange={(e) => e.target.value && handleDataChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Valor previsto (opcional) */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  Valor previsto (opcional)
                </label>
                <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-primary transition-colors">
                  <span className="text-sm text-gray-400 mr-1">R$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={valorPrevisto}
                    onChange={(e) => setValorPrevisto(e.target.value)}
                    placeholder="0,00"
                    className="flex-1 text-sm text-gray-900 bg-transparent outline-none"
                  />
                </div>
              </div>

              {/* Aviso de duplicata ou erro */}
              {aviso && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800">{aviso}</p>
                  </div>
                  {isDuplicata && (
                    <button
                      onClick={() => handleConfirmar(true)}
                      disabled={loadingInsert}
                      className="text-xs font-semibold text-yellow-700 underline self-start cursor-pointer disabled:opacity-50"
                    >
                      Criar mesmo assim
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botão confirmar — somente na etapa de confirmação */}
        {step === 'confirmar' && (
          <div className="px-4 py-4 border-t border-gray-100 bg-white flex-shrink-0">
            <button
              onClick={() => handleConfirmar(false)}
              disabled={loadingInsert}
              className="w-full bg-primary text-white font-semibold text-sm py-3.5 rounded-xl disabled:opacity-50 active:opacity-80 transition-opacity cursor-pointer flex items-center justify-center gap-2"
            >
              {loadingInsert ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Agendando…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Confirmar agendamento
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
