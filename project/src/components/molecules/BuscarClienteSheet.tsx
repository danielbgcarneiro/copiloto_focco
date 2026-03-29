/**
 * Copiloto Focco Brasil
 * Molecule: BuscarClienteSheet — busca + agendamento de cliente (Story 3.8)
 *
 * AC1:  Abre via botão "+" na Agenda e AgendaDia
 * AC2:  Campo de busca com placeholder
 * AC3:  Busca em tempo real (debounce 300ms via useBuscaCliente)
 * AC4:  Resultados: nome, cidade, RFM badge, DSV, oportunidade
 * AC5:  Ordem por score de prioridade
 * AC6:  Seletor de data após tap no resultado
 * AC7:  Campo valor previsto opcional
 * AC8:  INSERT em agendamentos + onSuccess callback
 * AC9:  Aviso de duplicata com opção de prosseguir
 * AC10: "Nenhum cliente encontrado"
 * AC11: Mínimo 2 caracteres
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Search,
  X,
  ChevronLeft,
  Calendar,
  DollarSign,
  AlertTriangle,
  Plus,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useBuscaCliente, ClienteBusca } from '../../hooks/useBuscaCliente'
import { ClienteBuscaCard } from './ClienteBuscaCard'
import { formatDate, getWeekStart } from '../../hooks/useAgenda'

interface BuscarClienteSheetProps {
  isOpen: boolean
  onClose: () => void
  vendedorId: string
  onSuccess: (dataAgendada: string) => void
  dataPreSelecionada?: string
}

const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function BuscarClienteSheet({
  isOpen,
  onClose,
  vendedorId,
  onSuccess,
  dataPreSelecionada,
}: BuscarClienteSheetProps) {
  const { resultados, loading, buscar, limpar } = useBuscaCliente(vendedorId)
  const [query, setQuery] = useState('')
  const [step, setStep] = useState<'busca' | 'confirmar'>('busca')
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteBusca | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState<string>(
    () => dataPreSelecionada ?? formatDate(new Date())
  )
  const [valorPrevisto, setValorPrevisto] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [isDuplicata, setIsDuplicata] = useState(false)
  const [loadingInsert, setLoadingInsert] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset quando fechar
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setStep('busca')
      setClienteSelecionado(null)
      setDataSelecionada(dataPreSelecionada ?? formatDate(new Date()))
      setValorPrevisto('')
      setAviso(null)
      setIsDuplicata(false)
      limpar()
    } else {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, dataPreSelecionada, limpar])

  // Atualizar data pré-selecionada quando prop mudar
  useEffect(() => {
    if (dataPreSelecionada) setDataSelecionada(dataPreSelecionada)
  }, [dataPreSelecionada])

  function handleQuery(value: string) {
    setQuery(value)
    buscar(value)
  }

  function handleSelectCliente(cliente: ClienteBusca) {
    setClienteSelecionado(cliente)
    setAviso(null)
    setIsDuplicata(false)
    setStep('confirmar')
  }

  function handleVoltarBusca() {
    setStep('busca')
    setClienteSelecionado(null)
    setAviso(null)
    setIsDuplicata(false)
  }

  // Limpar aviso ao mudar data
  const handleDataChange = useCallback((novaData: string) => {
    setDataSelecionada(novaData)
    setAviso(null)
    setIsDuplicata(false)
  }, [])

  // Dias da semana corrente para o seletor
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
      // AC9: verificar duplicata
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

      // AC8: INSERT agendamento
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
      onClose()
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'Erro ao criar agendamento')
      setIsDuplicata(false)
    } finally {
      setLoadingInsert(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white safe-area-top">
        {step === 'confirmar' ? (
          <>
            <button
              onClick={handleVoltarBusca}
              className="p-1 -ml-1 text-gray-500 cursor-pointer"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {clienteSelecionado?.nome_fantasia ?? clienteSelecionado?.razao_social}
              </p>
              <p className="text-xs text-gray-400">Selecione a data e confirme</p>
            </div>
            <button
              onClick={onClose}
              className="text-xs font-medium text-gray-500 cursor-pointer"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleQuery(e.target.value)}
                placeholder="Buscar por nome, cidade ou código"
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
              {query && (
                <button onClick={() => handleQuery('')} aria-label="Limpar busca">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-xs font-medium text-gray-500 cursor-pointer whitespace-nowrap"
            >
              Cancelar
            </button>
          </>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        {/* ═══ BUSCA ═══ */}
        {step === 'busca' && (
          <div className="px-4 py-3">
            {query.trim().length < 2 ? (
              <div className="py-16 text-center">
                <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Digite ao menos 2 caracteres para buscar</p>
                <p className="text-xs text-gray-300 mt-1">nome, cidade ou código do cliente</p>
              </div>
            ) : loading ? (
              <div className="flex justify-center py-12">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : resultados.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-400">Nenhum cliente encontrado</p>
                <p className="text-xs text-gray-300 mt-1">Tente outro nome ou código</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {resultados.map((c) => (
                  <ClienteBuscaCard
                    key={c.codigo_cliente}
                    cliente={c}
                    onClick={() => handleSelectCliente(c)}
                  />
                ))}
              </div>
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

              {/* Dias da semana */}
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

              {/* Input nativo para outras datas */}
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

            {/* Valor previsto */}
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
        <div className="px-4 py-4 border-t border-gray-100 bg-white safe-area-bottom">
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
  )
}
