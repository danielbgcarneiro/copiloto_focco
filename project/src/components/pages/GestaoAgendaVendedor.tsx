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
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useKpisDetalhadosVendedor, PeriodoAgendaDetalhe } from '../../hooks/useGestaoAgenda'
import { useSetPage } from '../../contexts'
import { KpiAtividadeCard } from '../molecules/KpiAtividadeCard'
import { KpiForecastCard } from '../molecules/KpiForecastCard'
import { KpiQualidadeCard } from '../molecules/KpiQualidadeCard'
import { CoberturaCarteiraSummary } from '../molecules/CoberturaCarteiraSummary'
import { AgendaTotalizacaoCard } from '../molecules/AgendaTotalizacaoCard'
import { getAllVendedores, VendedorProfile } from '../../lib/queries/vendedores'

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
        <div className="ml-auto relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer max-w-[140px]"
          >
            <span className="text-xs font-semibold text-gray-700 truncate">
              {data?.nomeVendedor ?? '…'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          </button>

          {showDropdown && vendedores.length > 0 && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
              {vendedores.map((v) => {
                const isCurrent = v.id === vendedorId
                const nome = v.apelido || v.nome_completo
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      setShowDropdown(false)
                      if (!isCurrent) navigate(`/gestao/agenda/vendedor/${v.id}`)
                    }}
                    className={[
                      'w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-xs transition-colors cursor-pointer',
                      isCurrent
                        ? 'bg-primary/8 text-primary font-semibold'
                        : 'text-gray-700 hover:bg-gray-50',
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
              <div className="px-4 py-4">
                <p className="text-xs font-semibold text-gray-500 mb-3">
                  Últimas {data.ultimasVisitas.length} visitas
                </p>
                {data.ultimasVisitas.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Nenhuma visita no período</p>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
                    {data.ultimasVisitas.map((v, i) => {
                      const badge = RESULTADO_LABELS[v.resultado] ?? { label: v.resultado, color: 'bg-gray-100 text-gray-600' }
                      return (
                        <div key={i} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{v.nomeCliente}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">{v.data}</p>
                            </div>
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
            )}
          </>
        )}
      </div>
    </div>
  )
}
