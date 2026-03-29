/**
 * Copiloto Focco Brasil
 * Molecule: RegistrarVisitaSheet — bottom sheet de registro de visita (Story 3.2 + 3.10)
 *
 * Story 3.10: após confirmar resultado, se não há agendamento futuro,
 * exibe prompt "Agendar próxima visita?" com data sugerida e toast de confirmação.
 */

import React, { useState, useEffect } from 'react'
import { X, Check, XCircle, UserX, CalendarPlus } from 'lucide-react'
import { MotivoNaoVenda, Visita, RegistrarVisitaParams } from '../../hooks/useVisitas'
import { supabase } from '../../lib/supabase'
import { calcularSugestaoData, SugestaoData } from '../../utils/agendaUtils'

type ResultadoType = 'vendeu' | 'nao_vendeu' | 'ausente'
type StepType = 'resultado' | 'detalhe' | 'proximavisita'

interface RegistrarVisitaSheetProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (visita: Visita) => void
  codigoCliente: number
  vendedorId: string
  rfmPerfil?: string | null
  rfmOportunidade?: number | null
  rfmDsv?: number | null
  motivos: MotivoNaoVenda[]
  loadingMotivos: boolean
  carregarMotivos: () => Promise<void>
  registrarVisita: (params: RegistrarVisitaParams) => Promise<Visita>
}

function diasAte(d: Date): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

function formatarDataBRDate(d: Date): string {
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}`
}

export const RegistrarVisitaSheet: React.FC<RegistrarVisitaSheetProps> = ({
  isOpen,
  onClose,
  onSuccess,
  codigoCliente,
  vendedorId,
  rfmPerfil,
  rfmOportunidade,
  rfmDsv,
  motivos,
  loadingMotivos,
  carregarMotivos,
  registrarVisita,
}) => {
  const [step, setStep] = useState<StepType>('resultado')
  const [resultado, setResultado] = useState<ResultadoType | null>(null)
  const [motivoId, setMotivoId] = useState<number | null>(null)
  const [observacoes, setObservacoes] = useState('')
  const [valorRealizado, setValorRealizado] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // States para o passo de sugestão de próxima visita (Story 3.10)
  const [sugestaoProxima, setSugestaoProxima] = useState<SugestaoData | null>(null)
  const [loadingSugestaoProxima, setLoadingSugestaoProxima] = useState(false)
  const [loadingAgendar, setLoadingAgendar] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      carregarMotivos()
      setStep('resultado')
      setResultado(null)
      setMotivoId(null)
      setObservacoes('')
      setValorRealizado('')
      setError(null)
      setSugestaoProxima(null)
      setLoadingSugestaoProxima(false)
      setLoadingAgendar(false)
    }
  }, [isOpen, carregarMotivos])

  const handleResultado = (r: ResultadoType) => {
    setResultado(r)
    setStep('detalhe')
  }

  const handleConfirmar = async () => {
    if (!resultado) return
    setLoading(true)
    setError(null)
    try {
      const visita = await registrarVisita({
        vendedorId,
        codigoCliente,
        resultado,
        motivoNaoVendaId: resultado === 'nao_vendeu' ? motivoId : null,
        observacoes: observacoes.trim() || null,
        valorRealizado:
          resultado === 'vendeu' && valorRealizado
            ? parseFloat(valorRealizado.replace(',', '.'))
            : null,
        rfmPerfilSnapshot: rfmPerfil ?? null,
        rfmOportunidadeSnapshot: rfmOportunidade ?? null,
        rfmDsvSnapshot: rfmDsv ?? null,
      })
      onSuccess(visita)

      // Verificar se há agendamento futuro para este cliente (Story 3.10)
      const hoje = new Date().toISOString().split('T')[0]
      const { data: agFuturo } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('codigo_cliente', codigoCliente)
        .eq('status', 'pendente')
        .gt('data_agendada', hoje)
        .limit(1)
        .maybeSingle()

      if (!agFuturo) {
        // Sem agendamento futuro — exibir prompt de sugestão
        setStep('proximavisita')
        setLoadingSugestaoProxima(true)
        calcularSugestaoData(codigoCliente)
          .then((s) => setSugestaoProxima(s))
          .catch(() => setSugestaoProxima(null))
          .finally(() => setLoadingSugestaoProxima(false))
      } else {
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar visita')
    } finally {
      setLoading(false)
    }
  }

  const handleAgendarProxima = async () => {
    if (!sugestaoProxima) return
    setLoadingAgendar(true)
    try {
      const dataISO = sugestaoProxima.data.toISOString().split('T')[0]
      const { error: insertError } = await supabase.from('agendamentos').insert({
        vendedor_id: vendedorId,
        codigo_cliente: codigoCliente,
        data_agendada: dataISO,
        status: 'pendente',
      })
      if (insertError) throw insertError
      const dataBR = formatarDataBRDate(sugestaoProxima.data)
      setToast(`Próxima visita agendada para ${dataBR}`)
      setTimeout(() => setToast(null), 3000)
    } catch {
      // Silently ignore — toast não aparece, mas fechamos normalmente
    } finally {
      setLoadingAgendar(false)
      onClose()
    }
  }

  const confirmarDesabilitado =
    loading || (resultado === 'nao_vendeu' && !motivoId)

  return (
    <>
      {/* Toast de confirmação (persiste mesmo após fechar o sheet) */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}

      {isOpen && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

          {/* Sheet */}
          <div className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl max-w-lg mx-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2">
              <h2 className="text-base font-semibold text-gray-900">
                {step === 'resultado'
                  ? 'Como foi a visita?'
                  : step === 'detalhe'
                  ? 'Detalhes da visita'
                  : 'Próxima visita'}
              </h2>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 pb-10">
              {/* Passo 1: Resultado */}
              {step === 'resultado' && (
                <div className="space-y-3 mt-2">
                  <button
                    onClick={() => handleResultado('vendeu')}
                    className="w-full py-4 rounded-xl bg-green-50 border-2 border-green-200 text-green-800 font-semibold text-sm flex items-center justify-center gap-3 hover:bg-green-100 active:scale-95 transition-all cursor-pointer"
                  >
                    <Check className="h-5 w-5 text-green-600" />
                    ✅ Vendeu
                  </button>
                  <button
                    onClick={() => handleResultado('nao_vendeu')}
                    className="w-full py-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-800 font-semibold text-sm flex items-center justify-center gap-3 hover:bg-red-100 active:scale-95 transition-all cursor-pointer"
                  >
                    <XCircle className="h-5 w-5 text-red-600" />
                    ❌ Não vendeu
                  </button>
                  <button
                    onClick={() => handleResultado('ausente')}
                    className="w-full py-4 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-700 font-semibold text-sm flex items-center justify-center gap-3 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                  >
                    <UserX className="h-5 w-5 text-gray-500" />
                    👻 Ausente
                  </button>
                </div>
              )}

              {/* Passo 2: Detalhe */}
              {step === 'detalhe' && resultado && (
                <div className="mt-2 space-y-4">
                  {/* Vendeu: valor opcional */}
                  {resultado === 'vendeu' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor realizado (opcional)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={valorRealizado}
                        onChange={(e) => setValorRealizado(e.target.value)}
                        placeholder="0,00"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}

                  {/* Não vendeu: motivo obrigatório */}
                  {resultado === 'nao_vendeu' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Motivo <span className="text-red-500">*</span>
                      </label>
                      {loadingMotivos ? (
                        <p className="text-sm text-gray-500 py-2">Carregando motivos...</p>
                      ) : (
                        <select
                          value={motivoId ?? ''}
                          onChange={(e) =>
                            setMotivoId(e.target.value ? Number(e.target.value) : null)
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                        >
                          <option value="">Selecione um motivo...</option>
                          {motivos.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.descricao}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Observação (não vendeu e ausente) */}
                  {(resultado === 'nao_vendeu' || resultado === 'ausente') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observação (opcional)
                      </label>
                      <textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Anote algo relevante..."
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>
                  )}

                  {/* Erro */}
                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  {/* Ações */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setStep('resultado')}
                      disabled={loading}
                      className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleConfirmar}
                      disabled={confirmarDesabilitado}
                      className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? 'Salvando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Passo 3: Sugestão de próxima visita (Story 3.10) */}
              {step === 'proximavisita' && (
                <div className="mt-4 space-y-5">
                  <div className="flex flex-col items-center text-center gap-2 py-2">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <CalendarPlus className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      Agendar próxima visita?
                    </p>
                    {loadingSugestaoProxima ? (
                      <p className="text-xs text-gray-400">Calculando data sugerida...</p>
                    ) : sugestaoProxima ? (
                      <p className="text-sm text-blue-600 font-medium">
                        Daqui {diasAte(sugestaoProxima.data)} dias —{' '}
                        {formatarDataBRDate(sugestaoProxima.data)}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">Data sugerida indisponível</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      disabled={loadingAgendar}
                      className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                    >
                      Depois
                    </button>
                    <button
                      onClick={handleAgendarProxima}
                      disabled={loadingAgendar || loadingSugestaoProxima || !sugestaoProxima}
                      className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loadingAgendar ? 'Agendando...' : 'Sim, agendar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
