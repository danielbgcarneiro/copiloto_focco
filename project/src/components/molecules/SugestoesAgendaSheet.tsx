/**
 * Copiloto Focco Brasil
 * Molecule: SugestoesAgendaSheet — sugestões hierárquicas por rota (Story 3.9 / Story 006 AC-1)
 *
 * Navegação: Rotas → Clientes da cidade → Confirmar agendamento
 * AC-1:  Hierarquia rota → cidade → clientes
 * AC-5:  Card com nome, DSV, oportunidade, score
 * AC-9:  Aviso de duplicata com opção de prosseguir
 */

import { useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Calendar, DollarSign, AlertTriangle, Plus, Star, TrendingUp, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { RotaSugestao, ClienteSugeridoHierarquia } from '../../hooks/useSugestoesAgenda'
import { formatDate, getWeekStart } from '../../hooks/useAgenda'

interface SugestoesAgendaSheetProps {
  isOpen: boolean
  onClose: () => void
  vendedorId: string
  sugestoes: { length: number }        // usado apenas para contagem no banner
  loadingSugestoes: boolean
  rotasSugestoes: RotaSugestao[]
  onSuccess: (dataAgendada: string) => void
}

const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatCur(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export function SugestoesAgendaSheet({
  isOpen,
  onClose,
  vendedorId,
  loadingSugestoes,
  rotasSugestoes,
  onSuccess,
}: SugestoesAgendaSheetProps) {
  type Step = 'rotas' | 'clientes' | 'confirmar'
  const [step, setStep] = useState<Step>('rotas')
  const [rotaSelecionada, setRotaSelecionada] = useState<RotaSugestao | null>(null)
  const [cidadeSelecionada, setCidadeSelecionada] = useState<string | null>(null)
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteSugeridoHierarquia | null>(null)
  const [expandedRota, setExpandedRota] = useState<string | null>(null)

  // Confirmar agendamento
  const [dataSelecionada, setDataSelecionada] = useState(() => formatDate(new Date()))
  const [valorPrevisto, setValorPrevisto] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [isDuplicata, setIsDuplicata] = useState(false)
  const [loadingInsert, setLoadingInsert] = useState(false)

  function handleSelectCidade(rota: RotaSugestao, cidade: string) {
    setRotaSelecionada(rota)
    setCidadeSelecionada(cidade)
    setStep('clientes')
  }

  function handleSelectCliente(cliente: ClienteSugeridoHierarquia) {
    setClienteSelecionado(cliente)
    setDataSelecionada(formatDate(new Date()))
    setValorPrevisto('')
    setAviso(null)
    setIsDuplicata(false)
    setStep('confirmar')
  }

  function handleVoltarRotas() {
    setStep('rotas')
    setRotaSelecionada(null)
    setCidadeSelecionada(null)
  }

  function handleVoltarClientes() {
    setStep('clientes')
    setClienteSelecionado(null)
    setAviso(null)
    setIsDuplicata(false)
    setValorPrevisto('')
  }

  function handleClose() {
    setStep('rotas')
    setRotaSelecionada(null)
    setCidadeSelecionada(null)
    setClienteSelecionado(null)
    setExpandedRota(null)
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
      // Retorna para a lista de clientes da cidade (não fecha o sheet)
      handleVoltarClientes()
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'Erro ao criar agendamento')
      setIsDuplicata(false)
    } finally {
      setLoadingInsert(false)
    }
  }

  if (!isOpen) return null

  // Clientes da cidade selecionada
  const clientesCidade =
    rotaSelecionada?.cidades.find((c) => c.cidade === cidadeSelecionada)?.clientes ?? []

  return (
    <>
      {/* Scrim */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={handleClose} aria-hidden="true" />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 flex-shrink-0">
          {step === 'clientes' ? (
            <>
              <button onClick={handleVoltarRotas} className="p-1 -ml-1 text-gray-500 cursor-pointer" aria-label="Voltar">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{cidadeSelecionada}</p>
                <p className="text-xs text-gray-400">{rotaSelecionada?.rota} · {clientesCidade.length} clientes</p>
              </div>
            </>
          ) : step === 'confirmar' ? (
            <>
              <button onClick={handleVoltarClientes} className="p-1 -ml-1 text-gray-500 cursor-pointer" aria-label="Voltar">
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
                {rotasSugestoes.length > 0 && (
                  <p className="text-xs text-gray-400">{rotasSugestoes.length} rota{rotasSugestoes.length > 1 ? 's' : ''} prioritária{rotasSugestoes.length > 1 ? 's' : ''}</p>
                )}
              </div>
            </>
          )}
          <button onClick={handleClose} className="p-1 text-gray-400 cursor-pointer" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">

          {/* ═══ ROTAS ═══ */}
          {step === 'rotas' && (
            <div className="px-4 py-3 flex flex-col gap-3">
              {loadingSugestoes ? (
                <div className="flex justify-center py-12">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : rotasSugestoes.length === 0 ? (
                <div className="py-12 text-center">
                  <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Nenhuma sugestão no momento</p>
                  <p className="text-xs text-gray-300 mt-1">Todos os clientes prioritários já têm visita agendada</p>
                </div>
              ) : (
                rotasSugestoes.map((rota) => (
                  <div key={rota.rota} className="rounded-xl border border-gray-100 overflow-hidden">
                    {/* Header da rota */}
                    <button
                      onClick={() => setExpandedRota(expandedRota === rota.rota ? null : rota.rota)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-primary/5 active:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900">{rota.rota}</p>
                        <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                          <TrendingUp className="w-3 h-3" />
                          {formatCur(rota.somaOportunidade)} oportunidade
                        </p>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-gray-400 transition-transform ${expandedRota === rota.rota ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {/* Cidades expandidas */}
                    {expandedRota === rota.rota && (
                      <div className="divide-y divide-gray-50 bg-white">
                        {rota.cidades.map((cidade) => (
                          <button
                            key={cidade.cidade}
                            onClick={() => handleSelectCidade(rota, cidade.cidade)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
                          >
                            <div className="text-left">
                              <p className="text-sm text-gray-800 font-medium">{cidade.cidade}</p>
                              <p className="text-xs text-gray-400">{cidade.clientes.length} clientes · <span className="text-emerald-600">{formatCur(cidade.somaOportunidade)}</span></p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ═══ CLIENTES DA CIDADE ═══ */}
          {step === 'clientes' && (
            <div className="px-4 py-3 flex flex-col gap-2">
              {clientesCidade.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nenhum cliente com oportunidade</p>
              ) : (
                clientesCidade.map((c) => {
                  const nomeExibido = c.nome_fantasia || c.razao_social
                  const oportunidadeFmt = formatCur(c.previsao_pedido)
                  const dsvColor = c.dias_sem_comprar > 90 ? 'text-red-600' : c.dias_sem_comprar > 60 ? 'text-yellow-600' : 'text-gray-500'
                  return (
                    <div key={c.codigo_cliente} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate flex-1">{nomeExibido}</p>
                        {c.agendado && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />Agendado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {c.dias_sem_comprar > 0 && (
                          <span className={`font-medium ${dsvColor}`}>{c.dias_sem_comprar}d s/ comprar</span>
                        )}
                        <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
                          <TrendingUp className="w-3 h-3" />{oportunidadeFmt}
                        </span>
                      </div>
                      {/* Barra de score */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.round(c.score * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 w-6 text-right tabular-nums">{Math.round(c.score * 100)}</span>
                        <button
                          onClick={() => handleSelectCliente(c)}
                          className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1 active:bg-primary/20 transition-colors cursor-pointer flex-shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                          Agendar
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ═══ CONFIRMAR ═══ */}
          {step === 'confirmar' && clienteSelecionado && (
            <div className="px-4 py-4 flex flex-col gap-5">
              {/* Seletor de data */}
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
                          isPast ? 'opacity-30 cursor-not-allowed'
                            : isSelected ? 'bg-primary text-white cursor-pointer'
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

        {/* Botão confirmar */}
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
