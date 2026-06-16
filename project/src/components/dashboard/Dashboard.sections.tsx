/**
 * Copiloto Focco Brasil
 * Seções de apresentação do Dashboard — extraídas para reduzir complexidade.
 */

import { TrendingUp, Target, Map as MapIcon, Building, AlertTriangle, ClipboardList, Search, X as XIcon } from 'lucide-react'
import type { DashboardData } from '../../lib/queries/dashboard'
import type { VendedorRanking } from '../../lib/queries/vendedores'
import TabelaPerfil from './TabelaPerfil'
import { Card } from '../atoms'
import { formatCurrency } from '../../utils'

export interface AgendamentoLembrete {
  id: string
  codigo_cliente: number
  nome_fantasia: string
  valor_previsto: number | null
}

type ObjAnualData = {
  total_vendas_ano?: number
  total_metas_ano?: number
  percentual_anual?: number
  clientes_atendidos_ano: number
} | null

// ─── Popup lembrete do dia ────────────────────────────────────────────────────

export function LembreteHoje({
  open, agendamentos, onClose, onVerAgenda,
}: {
  open: boolean
  agendamentos: AgendamentoLembrete[]
  onClose: () => void
  onVerAgenda: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl shadow-xl p-4 pb-6"
        style={{ animation: 'slideUp 0.25s ease-out' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-gray-800">Agenda de Hoje</h3>
            <p className="text-xs text-gray-500">
              {agendamentos.length} agendamento{agendamentos.length !== 1 ? 's' : ''} pendente{agendamentos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500" aria-label="Fechar">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <ul className="space-y-2 max-h-56 overflow-y-auto">
          {agendamentos.map(ag => (
            <li key={ag.id} className="flex items-center justify-between rounded-lg bg-sky-50 border border-sky-100 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-gray-800 truncate max-w-[220px]">{ag.nome_fantasia}</p>
                <p className="text-xs text-gray-500">Cód. {ag.codigo_cliente}</p>
              </div>
              {ag.valor_previsto != null && ag.valor_previsto > 0 && (
                <span className="text-xs font-semibold text-sky-700 ml-2 flex-shrink-0">
                  {formatCurrency(ag.valor_previsto, true)}
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onVerAgenda}
            className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
          >
            Ver Agenda
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Cards de métricas ────────────────────────────────────────────────────────

function MetricasSkeleton() {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-8">
      <Card variant="default" padding="none" className="col-span-3 md:col-span-1 p-4">
        <div className="animate-pulse">
          <div className="h-3 bg-gray-200 rounded mb-2 w-1/2"></div>
          <div className="h-7 bg-gray-200 rounded mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-3/4"></div>
        </div>
      </Card>
      {[...Array(3)].map((_, i) => (
        <Card key={i} variant="default" padding="none" className="p-3">
          <div className="animate-pulse">
            <div className="h-2 bg-gray-200 rounded mb-2"></div>
            <div className="h-5 bg-gray-200 rounded"></div>
          </div>
        </Card>
      ))}
    </div>
  )
}

type Metricas = NonNullable<DashboardData['metricas']>

function VendasMesCard({ metricas, metaCorePecas }: { metricas: Metricas | undefined; metaCorePecas: number }) {
  const vendas = metricas ? formatCurrency(metricas.vendas_mes || 0) : 'N/A'
  const meta = metricas ? formatCurrency(metricas.meta_mes || 0) : 'N/A'
  const pct = metricas ? `${(metricas.percentual_meta || 0).toFixed(1)}%` : 'N/A'
  return (
    <Card variant="default" padding="none" className="col-span-3 md:col-span-1 p-4 relative">
      <div className="absolute top-3 right-3">
        <div className="bg-blue-50 p-2 rounded-full">
          <TrendingUp className="h-5 w-5 text-blue-600" />
        </div>
      </div>
      <div className="pr-12">
        <p className="text-xs font-medium text-gray-600">Vendas do Mês</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{vendas}</p>
        <p className="text-xs text-gray-500 mt-1">Obj OB+PW: {meta} | {pct}</p>
        {metaCorePecas > 0 && (
          <p className="text-xs text-blue-600 mt-0.5">Core: {metaCorePecas} pç (obj mês)</p>
        )}
      </div>
    </Card>
  )
}

function PositivadasCard({ metricas }: { metricas: Metricas | undefined }) {
  return (
    <Card variant="default" padding="none" className="p-3">
      <div className="flex items-center gap-1 mb-1">
        <Building className="h-3 w-3 text-green-600 flex-shrink-0" />
        <p className="text-[10px] font-medium text-gray-600 leading-tight">Positivadas</p>
      </div>
      <p className="text-lg font-bold text-gray-900">{metricas?.oticas_positivadas || 0}</p>
      <p className="text-[10px] text-gray-400">óticas</p>
    </Card>
  )
}

function ObjAnualCard({ objAnualData }: { objAnualData: ObjAnualData }) {
  return (
    <Card variant="default" padding="none" className="p-3">
      <div className="flex items-center gap-1 mb-1">
        <Target className="h-3 w-3 text-yellow-600 flex-shrink-0" />
        <p className="text-[10px] font-medium text-gray-600 leading-tight">Obj Anual</p>
      </div>
      <p className="text-lg font-bold text-gray-900">
        {objAnualData?.percentual_anual ? `${objAnualData.percentual_anual.toFixed(1)}%` : 'N/A'}
      </p>
      <p className="text-[10px] text-gray-400 hidden md:block">
        {objAnualData?.total_metas_ano ? formatCurrency(objAnualData.total_metas_ano) : ''}
      </p>
    </Card>
  )
}

function SemVendas180Card({ oticasSemVendas180d, vendedorRanking }: { oticasSemVendas180d: number | null; vendedorRanking: VendedorRanking | null }) {
  return (
    <Card variant="default" padding="none" className="p-3">
      <div className="flex items-center gap-1 mb-1">
        <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
        <p className="text-[10px] font-medium text-gray-600 leading-tight">+180-DSV</p>
      </div>
      <p className="text-lg font-bold text-red-600">{oticasSemVendas180d || 0}</p>
      <p className="text-[10px] text-gray-400 hidden md:block">
        De {vendedorRanking?.total_clientes || 0} clientes
      </p>
      <p className="text-[10px] text-gray-400 md:hidden">óticas</p>
    </Card>
  )
}

export function MetricasCards({
  loading, error, dashboardData, objAnualData, oticasSemVendas180d, vendedorRanking, metaCorePecas,
}: {
  loading: boolean
  error: string | null
  dashboardData: DashboardData | null
  objAnualData: ObjAnualData
  oticasSemVendas180d: number | null
  vendedorRanking: VendedorRanking | null
  metaCorePecas: number
}) {
  if (loading) return <MetricasSkeleton />
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
      <p className="text-red-600 text-sm">Erro ao carregar métricas: {error}</p>
    </div>
  )

  const metricas = dashboardData?.metricas
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-8">
      <VendasMesCard metricas={metricas} metaCorePecas={metaCorePecas} />
      <PositivadasCard metricas={metricas} />
      <ObjAnualCard objAnualData={objAnualData} />
      <SemVendas180Card oticasSemVendas180d={oticasSemVendas180d} vendedorRanking={vendedorRanking} />
    </div>
  )
}

// ─── Ações rápidas (navegação) ────────────────────────────────────────────────

export function AcoesRapidas({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      <button
        onClick={() => onNavigate('/meus-pedidos')}
        className="bg-green-600 text-white p-2 sm:px-4 sm:py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
      >
        <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
        <span>Pedidos</span>
      </button>
      <button
        onClick={() => onNavigate('/rotas')}
        className="bg-primary text-white p-2 sm:px-4 sm:py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center"
      >
        <MapIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
        <span>Rotas</span>
      </button>
      <button
        onClick={() => onNavigate('/inadimplentes')}
        className="bg-red-600 text-white p-2 sm:px-4 sm:py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
      >
        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
        <span>Inadimplentes</span>
      </button>
    </div>
  )
}

// ─── Tabelas de perfil (Ouro/Prata/Bronze) com filtro ─────────────────────────

export function TabelasPerfilSection({
  loading, dashboardData, filtroCidade, onFiltroChange,
}: {
  loading: boolean
  dashboardData: DashboardData | null
  filtroCidade: string
  onFiltroChange: (value: string) => void
}) {
  if (loading || !dashboardData?.tabelasPerfil) return null
  return (
    <div className="space-y-6 mt-12">
      <div className="my-4">
        <div className="relative">
          <input
            type="text"
            aria-label="Filtrar tabelas de perfil por cidade ou UF"
            placeholder="Filtrar por Cidade/UF..."
            value={filtroCidade}
            onChange={(e) => onFiltroChange(e.target.value)}
            className="w-full pl-10 pr-4 py-1 border rounded-lg text-sm shadow-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        {dashboardData.tabelasPerfil.map((tabela) => (
          <TabelaPerfil key={tabela.perfil} dados={tabela} filtroCidade={filtroCidade} />
        ))}
      </div>
    </div>
  )
}
