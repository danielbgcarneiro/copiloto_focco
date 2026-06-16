/**
 * Copiloto Focco Brasil
 * Page: GestaoAgendaVendedor — drilldown por vendedor (Story 3.14)
 *
 * AC1:  Rota /gestao/agenda/vendedor/:vendedorId
 * AC2:  Header com nome + filtro período (semana/mês/trimestre) + voltar
 * AC3:  KPIs de atividade
 * AC4:  KPIs de forecast
 * AC5:  KPIs de qualidade
 * AC6:  Cobertura de carteira
 * AC7:  Últimas 10 visitas
 * AC8:  useSetPage(nomeVendedor, () => navigate('/gestao/agenda'))
 */

import { useNavigate, useParams } from 'react-router-dom'
import { useState, useRef, useEffect, useCallback, type RefObject } from 'react'
import { ChevronDown, Check, X, AlertTriangle } from 'lucide-react'
import { useKpisDetalhadosVendedor, PeriodoAgendaDetalhe, UltimaVisita } from '../../hooks/useGestaoAgenda'
import { useSetPage } from '../../contexts'
import { KpiAtividadeCard } from '../molecules/KpiAtividadeCard'
import { KpiForecastCard } from '../molecules/KpiForecastCard'
import { KpiQualidadeCard } from '../molecules/KpiQualidadeCard'
import { CoberturaCarteiraSummary } from '../molecules/CoberturaCarteiraSummary'
import { AgendaTotalizacaoCard } from '../molecules/AgendaTotalizacaoCard'
import { getAllVendedores, VendedorProfile } from '../../lib/queries/vendedores'
import { supabase } from '../../lib/supabase'

type Tab = 'resumo' | 'agenda' | 'cobertura' | 'visitas'

const RESULTADO_LABELS: Record<string, { label: string; color: string }> = {
  vendeu: { label: 'Vendeu', color: 'bg-green-100 text-green-700' },
  nao_vendeu: { label: 'Não vendeu', color: 'bg-red-100 text-red-600' },
  ausente: { label: 'Ausente', color: 'bg-gray-100 text-gray-600' },
  reagendou: { label: 'Reagendou', color: 'bg-blue-100 text-blue-600' },
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      <div className="h-24 bg-gray-100 rounded-xl" />
      <div className="h-24 bg-gray-100 rounded-xl" />
      <div className="h-32 bg-gray-100 rounded-xl" />
    </div>
  )
}

type InativadoState = Record<string, { inativado: boolean; inativadoEm: string | null }>

function VendedorDropdown({
  nomeVendedor, vendedores, vendedorId, show, onToggle, onSelect, containerRef,
}: {
  nomeVendedor: string
  vendedores: VendedorProfile[]
  vendedorId: string | undefined
  show: boolean
  onToggle: () => void
  onSelect: (id: string) => void
  containerRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="ml-auto relative" ref={containerRef}>
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer max-w-[140px]"
      >
        <span className="text-xs font-semibold text-gray-700 truncate">{nomeVendedor}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
      </button>

      {show && vendedores.length > 0 && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
          {vendedores.map((v) => {
            const isCurrent = v.id === vendedorId
            const nome = v.apelido || v.nome_completo
            return (
              <button
                key={v.id}
                onClick={() => onSelect(v.id)}
                className={[
                  'w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-xs transition-colors cursor-pointer',
                  isCurrent ? 'bg-primary/8 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50',
                ].join(' ')}
              >
                <span className="truncate">{nome}</span>
                {isCurrent && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function VisitasTab({
  visitas, visitasInativadas, onSelectVisita,
}: {
  visitas: UltimaVisita[]
  visitasInativadas: InativadoState
  onSelectVisita: (v: UltimaVisita) => void
}) {
  return (
    <div className="px-4 py-4">
      <p className="text-xs font-semibold text-gray-500 mb-3">
        {visitas.length} {visitas.length === 1 ? 'visita' : 'visitas'} no período
      </p>
      {visitas.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Nenhuma visita no período</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
          {visitas.map((v, i) => {
            const badge = RESULTADO_LABELS[v.resultado] ?? { label: v.resultado, color: 'bg-gray-100 text-gray-600' }
            const isEncerrou = v.motivoCanonical === 'ENCERROU_ATIVIDADES'
            const estadoInativado = visitasInativadas[v.visitaId]
            const inativado = estadoInativado?.inativado ?? v.inativado
            return (
              <div
                key={i}
                className={`px-4 py-3 ${isEncerrou ? 'cursor-pointer hover:bg-orange-50 active:bg-orange-100 transition-colors' : ''}`}
                onClick={() => isEncerrou ? onSelectVisita({ ...v, inativado, inativadoEm: estadoInativado?.inativadoEm ?? v.inativadoEm }) : undefined}
              >
                <div className="flex items-start gap-2">
                  {/* Col 1 — Nome + Data */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-medium text-gray-900 truncate">{v.nomeCliente}</p>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">#{v.codigoCliente}</span>
                      {inativado && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-gray-200 text-gray-500 flex-shrink-0">
                          Inativado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{v.data}</p>
                  </div>
                  {/* Col 2 — Motivo + Observação */}
                  {v.motivo && (
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-500 font-medium truncate">{v.motivo}</p>
                      {v.observacoes && (
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate italic">&quot;{v.observacoes}&quot;</p>
                      )}
                    </div>
                  )}
                  {/* Col 3 — Badge resultado */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badge.color}`}>
                      {badge.label}
                    </span>
                    {v.valorRealizado != null && v.valorRealizado > 0 && (
                      <span className="text-[11px] text-green-700 font-semibold">
                        {v.valorRealizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function GestaoAgendaVendedor() {
  const { vendedorId } = useParams<{ vendedorId: string }>()
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState<PeriodoAgendaDetalhe>('mes')
  const [tab, setTab] = useState<Tab>('resumo')
  const hoje = useRef(new Date()).current

  const [vendedores, setVendedores] = useState<VendedorProfile[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getAllVendedores().then((v) => setVendedores(v ?? []))
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  const { data, loading, error } = useKpisDetalhadosVendedor(vendedorId ?? '', periodo)
  const [visitaSelecionada, setVisitaSelecionada] = useState<UltimaVisita | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [visitasInativadas, setVisitasInativadas] = useState<Record<string, { inativado: boolean; inativadoEm: string }>>({})

  const confirmarInativacao = useCallback(async (visitaId: string) => {
    setConfirmando(true)
    try {
      const agora = new Date().toISOString()
      await supabase
        .from('visitas')
        .update({ cliente_inativado: true, inativado_em: agora })
        .eq('id', visitaId)
      setVisitasInativadas((prev) => ({ ...prev, [visitaId]: { inativado: true, inativadoEm: agora } }))
      setVisitaSelecionada((prev) => prev ? { ...prev, inativado: true, inativadoEm: agora } : null)
    } finally {
      setConfirmando(false)
    }
  }, [])

  useSetPage(data?.nomeVendedor ?? 'Vendedor', () => navigate('/gestao/agenda'))

  return (
    <div className="flex flex-col min-h-0">
      {/* AC2: Filtro de período + seletor de vendedor */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 bg-white border-b border-gray-100">
        {/* Botões de período */}
        <div className="flex gap-1.5">
          {(['semana', 'mes', 'trimestre'] as PeriodoAgendaDetalhe[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                periodo === p
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Trimestre'}
            </button>
          ))}
        </div>

        {/* Dropdown de vendedor */}
        <VendedorDropdown
          nomeVendedor={data?.nomeVendedor ?? '…'}
          vendedores={vendedores}
          vendedorId={vendedorId}
          show={showDropdown}
          onToggle={() => setShowDropdown((v) => !v)}
          onSelect={(id) => {
            setShowDropdown(false)
            if (id !== vendedorId) navigate(`/gestao/agenda/vendedor/${id}`)
          }}
          containerRef={dropdownRef}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white">
        {(['resumo', 'agenda', 'cobertura', 'visitas'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'flex-1 py-2.5 text-xs font-semibold transition-colors cursor-pointer',
              tab === t
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {t === 'resumo' ? 'Resumo' : t === 'agenda' ? 'Agenda' : t === 'cobertura' ? 'Cobertura' : 'Visitas'}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <Skeleton />
        ) : error ? (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            Erro ao carregar dados: {error}
          </div>
        ) : !data ? null : (
          <>
            {/* Tab Resumo */}
            {tab === 'resumo' && (
              <div className="px-4 py-4">
                <KpiAtividadeCard
                  totalVisitas={data.totalVisitas}
                  visitasAgendadas={data.visitasAgendadas}
                  taxaCumprimento={data.taxaCumprimento}
                  taxaConversao={data.taxaConversao}
                  mediaVisitasPorSemana={data.mediaVisitasPorSemana}
                />
                <KpiForecastCard
                  forecastTotal={data.forecastTotal}
                  realizadoTotal={data.realizadoTotal}
                  forecastAccuracy={data.forecastAccuracy}
                  meta={data.meta}
                  atingimentoMeta={data.atingimentoMeta}
                  somaOportunidade={data.somaOportunidade}
                />
                <KpiQualidadeCard
                  topMotivos={data.topMotivos}
                  pctComObservacao={data.pctComObservacao}
                  clientes30d={data.clientes30d}
                  clientes60d={data.clientes60d}
                  clientes90d={data.clientes90d}
                />
              </div>
            )}

            {/* Tab Agenda */}
            {tab === 'agenda' && (
              <div className="py-4">
                <AgendaTotalizacaoCard
                  items={data.agendaItems}
                  metaMes={data.metaMes}
                  realizadoMes={data.realizadoMes}
                  hoje={hoje}
                  showClienteTable={true}
                  onClienteClick={(codigoCliente) => navigate(`/clientes/detalhes/${codigoCliente}`)}
                />
              </div>
            )}

            {/* Tab Cobertura */}
            {tab === 'cobertura' && (
              <div className="px-4 py-4">
                <CoberturaCarteiraSummary
                  totalClientesCarteira={data.totalClientesCarteira}
                  clientesVisitados={data.clientesVisitados}
                  pctCobertura={data.pctCobertura}
                  clientesNaoVisitados={data.clientesNaoVisitados}
                  onClienteClick={(codigoCliente) => navigate(`/clientes/detalhes/${codigoCliente}`)}
                />
              </div>
            )}

            {/* Tab Visitas */}
            {tab === 'visitas' && (
              <VisitasTab
                visitas={data.ultimasVisitas}
                visitasInativadas={visitasInativadas}
                onSelectVisita={setVisitaSelecionada}
              />
            )}
          </>
        )}
      </div>

      {/* Drawer: Encerrou Atividades */}
      {visitaSelecionada && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setVisitaSelecionada(null)}
          />
          <div className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl max-w-lg mx-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2">
              <h2 className="text-base font-semibold text-gray-900">Encerrou atividades</h2>
              <button
                onClick={() => setVisitaSelecionada(null)}
                className="p-1 text-gray-500 hover:text-gray-600 rounded-full cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 pb-10 space-y-4">
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 space-y-1">
                <p className="text-sm font-semibold text-gray-900">{visitaSelecionada.nomeCliente}</p>
                <p className="text-xs text-gray-500">{visitaSelecionada.data}</p>
                {visitaSelecionada.motivo && (
                  <p className="text-xs text-orange-700 font-medium">{visitaSelecionada.motivo}</p>
                )}
                {visitaSelecionada.observacoes && (
                  <p className="text-xs text-gray-500 italic">&quot;{visitaSelecionada.observacoes}&quot;</p>
                )}
              </div>

              {visitaSelecionada.inativado ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-gray-700 font-medium">
                    Inativado em{' '}
                    {visitaSelecionada.inativadoEm
                      ? new Date(visitaSelecionada.inativadoEm).toLocaleDateString('pt-BR')
                      : '—'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      Realize a inativação manualmente no ERP e confirme aqui para registrar.
                    </p>
                  </div>
                  <button
                    onClick={() => confirmarInativacao(visitaSelecionada.visitaId)}
                    disabled={confirmando}
                    className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    {confirmando ? 'Registrando...' : 'Confirmar inativação no ERP'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
