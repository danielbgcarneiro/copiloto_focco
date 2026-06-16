/**
 * Copiloto Focco Brasil
 * Seções de apresentação de DetalhesClienteV2 — extraídas para reduzir a
 * complexidade do container. Apenas UI; sem fetch/estado próprio.
 */

import React from 'react'
import { AlertTriangle, CheckCircle, ChevronRight, Calendar, Plus, Pencil, X as XIcon } from 'lucide-react'
import { formatCurrency } from '../../utils'
import { Agendamento } from '../../hooks/useVisitas'
import { VisitaRegistradaCard, TelefoneCard } from '../molecules'

// ─── helpers ────────────────────────────────────────────────────────────────

export const getPerfilColors = (perfil: string) => {
  const p = perfil?.toLowerCase() || ''
  if (p.includes('ouro'))   return 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
  if (p.includes('prata'))  return 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 border border-gray-300'
  if (p.includes('bronze')) return 'bg-gradient-to-br from-orange-200 to-orange-300 text-orange-900 border border-orange-400'
  return 'bg-blue-50 text-primary border border-blue-200'
}

export const getStatusInadimplenciaColors = (tem: boolean, dias?: number) => {
  if (!tem) return { status: 'Adimplente', color: 'bg-gradient-to-br from-green-100 to-green-200 text-green-800 border border-green-400' }
  const d = dias || 0
  if (d > 90) return { status: 'Crítico',    color: 'bg-gradient-to-br from-red-100 to-red-200 text-red-800 border border-red-400' }
  if (d > 60) return { status: 'Alto Risco', color: 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-800 border border-orange-400' }
  if (d > 30) return { status: 'Médio',      color: 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-400' }
  return       { status: 'Baixo',            color: 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border border-blue-400' }
}

export function processarMetricasCategoria(cliente: any) {
  if (!cliente) return { categorias: [], totais: { ob: 0, pw: 0, core: 0 } }
  const categorias = [
    { nome: 'RX Feminino',   ob: cliente.rx_fem_ob  || 0, pw: cliente.rx_fem_pw  || 0, core: 0 },
    { nome: 'RX Masculino',  ob: cliente.rx_mas_ob  || 0, pw: cliente.rx_mas_pw  || 0, core: 0 },
    { nome: 'SOL Feminino',  ob: cliente.sol_fem_ob || 0, pw: cliente.sol_fem_pw || 0, core: 0 },
    { nome: 'SOL Masculino', ob: cliente.sol_mas_ob || 0, pw: cliente.sol_mas_pw || 0, core: 0 },
  ]
  return {
    categorias,
    totais: {
      ob:   categorias.reduce((s,c) => s+c.ob,   0),
      pw:   categorias.reduce((s,c) => s+c.pw,   0),
      core: categorias.reduce((s,c) => s+c.core, 0),
    },
  }
}

/** Mapeia o registro bruto do cliente para a view usada na tela. */
export function mapClienteView(cliente: any) {
  return {
    nome:            cliente.nome_fantasia,
    codigo:          cliente.codigo_cliente,
    dsv:             cliente.dias_sem_comprar,
    meta:            cliente.meta_ano_atual,
    vendasAtual:     cliente.valor_ano_atual,
    vendasAnterior:  cliente.valor_ano_anterior,
    qtdAtual:        cliente.qtd_compras_ano_atual  ?? 0,
    qtdAnterior:     cliente.qtd_compras_ano_anterior ?? 0,
    percentualMeta:  cliente.percentual_atingimento  ?? 0,
    oportunidade:    cliente.previsao_pedido,
    acaoRecomendada: cliente.acao_recomendada,
    // multi-marca
    valorObAnoAtual:    cliente.valor_ob_ano_atual   ?? 0,
    valorPwAnoAtual:    cliente.valor_pw_ano_atual   ?? 0,
    valorCoreAnoAtual:  cliente.valor_core_ano_atual ?? 0,
    pecasObAnoAtual:    cliente.pecas_ob_ano_atual   ?? 0,
    pecasPwAnoAtual:    cliente.pecas_pw_ano_atual   ?? 0,
    pecasCoreAnoAtual:  cliente.pecas_core_ano_atual ?? 0,
    metaCorePecas:      cliente.meta_core_pecas      ?? 0,
  }
}

function formatarDataAgendamento(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

/** Cores do badge/barra de progresso por faixa de atingimento. */
function getProgressColors(progresso: number) {
  if (progresso >= 100) return { badge: 'bg-green-100 text-green-700', bar: 'bg-green-500' }
  if (progresso >= 70)  return { badge: 'bg-blue-100 text-blue-700',  bar: 'bg-blue-500'  }
  if (progresso >= 40)  return { badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400' }
  return                       { badge: 'bg-red-100 text-red-700',    bar: 'bg-red-400'   }
}

// ─── SectionHeader ───────────────────────────────────────────────────────────

export const SectionHeader = ({
  label, badge, action,
}: {
  label: React.ReactNode
  badge?: React.ReactNode
  action?: React.ReactNode
}) => (
  <div className="flex items-center justify-between bg-gray-50 border-t-2 border-gray-200 px-4 py-2.5">
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      {badge}
    </div>
    {action}
  </div>
)

// ─── Breadcrumb ──────────────────────────────────────────────────────────────

export function Breadcrumb({
  rotaNome, cidadeDecodificada, nome,
}: {
  rotaNome: string | null
  cidadeDecodificada: string | null
  nome: React.ReactNode
}) {
  if (!rotaNome && !cidadeDecodificada) return null
  return (
    <div className="flex items-center gap-1 text-xs text-gray-500 flex-wrap">
      {rotaNome && <span className="font-medium text-primary">{rotaNome}</span>}
      {rotaNome && cidadeDecodificada && <ChevronRight className="h-3 w-3 text-gray-400" />}
      {cidadeDecodificada && <span className="font-medium text-primary">{cidadeDecodificada}</span>}
      <ChevronRight className="h-3 w-3 text-gray-400" />
      <span className="font-medium text-gray-700 truncate max-w-[160px]">{nome}</span>
    </div>
  )
}

// ─── 1. Header ───────────────────────────────────────────────────────────────

export function ClienteHeaderCard({
  d, perfil, inadStatus,
}: {
  d: any
  perfil?: string
  inadStatus: { status: string; color: string }
}) {
  return (
    <div className="px-4 pt-4 pb-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex-1 min-w-0 leading-tight">
          {d.nome}
        </h2>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-md whitespace-nowrap ${inadStatus.color}`}>
            {inadStatus.status}
          </span>
          {perfil && (
            <span className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-md whitespace-nowrap ${getPerfilColors(perfil)}`}>
              {perfil}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">Cód: {d.codigo}</p>
        {d.dsv != null && d.dsv > 60 && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            d.dsv > 90 ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-amber-100 text-amber-700 border border-amber-300'
          }`}>
            ⚠ {d.dsv}d s/ comprar
          </span>
        )}
      </div>
    </div>
  )
}

// ─── 3. Financeiro ───────────────────────────────────────────────────────────

export function FinanceiroSection({
  d, anoAtual, anoAnterior, progresso,
}: {
  d: any
  anoAtual: number
  anoAnterior: number
  progresso: number
}) {
  const pc = getProgressColors(progresso)
  return (
    <>
      <SectionHeader label="Financeiro" />
      <div className="px-4 py-3">
        {/* Obj OB+PW + barra de progresso */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-700">Obj OB+PW {anoAtual}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900">{formatCurrency(d.meta)}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${pc.badge}`}>{progresso.toFixed(1)}%</span>
            </div>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pc.bar}`}
              style={{ width: `${progresso}%` }}
            />
          </div>
          {d.valorCoreAnoAtual > 0 && (
            <p className="text-[10px] text-blue-600 mt-1 font-medium">
              Core: {formatCurrency(d.valorCoreAnoAtual)} · {d.pecasCoreAnoAtual} pç
            </p>
          )}
        </div>
        {/* Vendas: 2 colunas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-500 mb-0.5">{anoAtual}</p>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(d.vendasAtual)}</p>
            <p className="text-[10px] text-gray-400">{d.qtdAtual} pedido{d.qtdAtual !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-500 mb-0.5">{anoAnterior}</p>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(d.vendasAnterior)}</p>
            <p className="text-[10px] text-gray-400">{d.qtdAnterior} pedido{d.qtdAnterior !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── 4. Visitas ──────────────────────────────────────────────────────────────

export function VisitasSection({
  loadingVisita, visitaHoje, agendamentosFuturos, loadingAgendamentos,
  cancelandoId, dsv, prazoAlertaDias,
  onRegistrar, onAgendarNovo, onEditarAgendamento, onCancelarAgendamento,
}: {
  loadingVisita: boolean
  visitaHoje: any
  agendamentosFuturos: Agendamento[]
  loadingAgendamentos: boolean
  cancelandoId: string | null
  dsv: number | null | undefined
  prazoAlertaDias: number
  onRegistrar: () => void
  onAgendarNovo: () => void
  onEditarAgendamento: (ag: Agendamento) => void
  onCancelarAgendamento: (id: string) => void
}) {
  return (
    <>
      {/* — Header único + 2 CTAs lado a lado — */}
      <SectionHeader
        label={
          <>
            Visitas
            {agendamentosFuturos.length > 0 && (
              <span className="ml-1.5 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {agendamentosFuturos.length}
              </span>
            )}
          </>
        }
      />
      <div className="px-4 pt-3 pb-2">
        {loadingVisita ? (
          <div className="flex items-center gap-2 py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span className="text-xs text-gray-400">Carregando…</span>
          </div>
        ) : visitaHoje ? (
          <VisitaRegistradaCard visita={visitaHoje} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onRegistrar}
              className="py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-sm hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Registrar visita
            </button>
            <button
              onClick={onAgendarNovo}
              className="py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm shadow-sm hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Calendar className="h-4 w-4 shrink-0" />
              Agendar visita
            </button>
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        {loadingAgendamentos ? (
          <div className="flex items-center gap-2 py-1">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span className="text-xs text-gray-400">Carregando…</span>
          </div>
        ) : agendamentosFuturos.length > 0 ? (
          <div className="space-y-2">
            {agendamentosFuturos.map(ag => (
              <div
                key={ag.id}
                className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-blue-900">
                      {formatarDataAgendamento(ag.data_agendada)}
                    </span>
                    {ag.valor_previsto != null && ag.valor_previsto > 0 && (
                      <span className="text-xs text-blue-700 ml-2">
                        {formatCurrency(ag.valor_previsto)}
                      </span>
                    )}
                    {ag.observacoes && (
                      <p className="text-[10px] text-blue-500 truncate mt-0.5">{ag.observacoes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onEditarAgendamento(ag)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 active:bg-blue-200 transition-colors"
                    aria-label="Editar agendamento"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onCancelarAgendamento(ag.id)}
                    disabled={cancelandoId === ag.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 active:bg-red-100 transition-colors disabled:opacity-40"
                    aria-label="Cancelar agendamento"
                  >
                    {cancelandoId === ag.id
                      ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-red-400" />
                      : <XIcon className="h-3.5 w-3.5" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-1">Nenhuma visita agendada</p>
        )}

        {/* Alerta DSV sem agendamento */}
        {agendamentosFuturos.length === 0 && (dsv ?? 0) > prazoAlertaDias && (
          <div className="mt-2 flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <span className="text-xs text-red-700 font-semibold">{dsv}d sem comprar — agendar visita</span>
          </div>
        )}
      </div>
    </>
  )
}

// ─── 5. Contatos ─────────────────────────────────────────────────────────────

export function ContatosSection({
  loadingTelefones, telefones, currentUserId, onAdicionar, onDesativar,
}: {
  loadingTelefones: boolean
  telefones: any[]
  currentUserId: string | null | undefined
  onAdicionar: () => void
  onDesativar: (id: string) => Promise<void>
}) {
  return (
    <>
      <SectionHeader
        label="Contatos"
        action={
          <button
            onClick={onAdicionar}
            className="flex items-center gap-1.5 text-xs font-semibold border border-primary/40 text-primary bg-white px-3 py-1.5 rounded-lg hover:bg-primary/5 active:bg-primary/10 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Adicionar
          </button>
        }
      />
      <div className="px-4 py-3">
        {loadingTelefones ? (
          <div className="flex items-center gap-2 py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span className="text-xs text-gray-400">Carregando…</span>
          </div>
        ) : telefones.length > 0 ? (
          <div className="space-y-2">
            {telefones.map(tel => (
              <TelefoneCard
                key={tel.id}
                telefone={tel}
                isProprietario={tel.adicionado_por === currentUserId}
                onDesativar={onDesativar}
              />
            ))}
          </div>
        ) : (
          <div className="py-3 text-center">
            <p className="text-xs text-gray-400 mb-2">Nenhum telefone cadastrado</p>
            <button
              onClick={onAdicionar}
              className="text-xs text-primary font-semibold hover:underline"
            >
              + Adicionar primeiro telefone
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── 6. Mix últimos 12 meses ────────────────────────────────────────────────

export function MixCategoriaTable({
  metricasCategoria,
}: {
  metricasCategoria: ReturnType<typeof processarMetricasCategoria>
}) {
  return (
    <>
      <SectionHeader label="Mix últimos 12 meses" />
      <div className="px-4 py-3">
        {metricasCategoria.categorias.length > 0 ? (
          <div className="rounded-lg overflow-hidden border border-gray-300">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700 text-white">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider">Categoria</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">OB</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">PW</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">Core</th>
                </tr>
              </thead>
              <tbody>
                {metricasCategoria.categorias.map((c, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-xs font-medium text-gray-700 border-t border-gray-200">{c.nome}</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900 border-t border-gray-200">{c.ob}</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900 border-t border-gray-200">{c.pw}</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900 border-t border-gray-200">{c.core}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 border-t-2 border-gray-400">
                  <td className="px-3 py-2 text-xs font-bold text-gray-900">TOTAL</td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-gray-900">{metricasCategoria.totais.ob}</td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-gray-900">{metricasCategoria.totais.pw}</td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-gray-900">{metricasCategoria.totais.core}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-3">Nenhum produto encontrado</p>
        )}
      </div>
    </>
  )
}

// ─── 7. Títulos abertos ──────────────────────────────────────────────────────

export function TitulosAbertosSection({
  loadingTitulos, titulosData, totalTitulos,
}: {
  loadingTitulos: boolean
  titulosData: any[]
  totalTitulos: number
}) {
  return (
    <>
      <SectionHeader
        label={
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Títulos Abertos
          </span>
        }
        badge={
          titulosData.length > 0
            ? <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                {formatCurrency(totalTitulos)}
              </span>
            : undefined
        }
      />
      <div className="px-4 py-3">
        {loadingTitulos ? (
          <div className="flex items-center gap-2 py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span className="text-xs text-gray-400">Carregando…</span>
          </div>
        ) : titulosData.length > 0 ? (
          <div className="rounded-lg overflow-hidden border border-gray-300">
            <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-white uppercase tracking-wider bg-gray-700 px-3 py-2">
              <span>Vencimento</span>
              <span className="text-center">Atraso</span>
              <span className="text-right">Valor</span>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-gray-200">
              {titulosData.map((titulo, i) => {
                const vencido = titulo.dias_atraso > 0
                const dt = new Date(titulo.data_vencimento)
                const dataFmt = `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear().toString().slice(-2)}`
                return (
                  <div key={i} className={`grid grid-cols-3 gap-2 items-center px-3 py-2 text-xs ${vencido ? 'bg-red-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <span className={`font-semibold ${vencido ? 'text-red-700' : 'text-gray-800'}`}>{dataFmt}</span>
                    <span className={`text-center font-bold ${vencido ? 'text-red-600' : 'text-green-600'}`}>
                      {titulo.dias_atraso > 0 ? `${titulo.dias_atraso}d` : `em ${Math.abs(titulo.dias_atraso)}d`}
                    </span>
                    <span className={`text-right font-semibold ${vencido ? 'text-red-700' : 'text-gray-800'}`}>
                      {formatCurrency(titulo.valor_titulo)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-green-600 font-semibold py-1 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Sem títulos em aberto
          </p>
        )}
      </div>
    </>
  )
}

// ─── 8. Histórico de visitas ─────────────────────────────────────────────────

export function HistoricoVisitasSection({
  loadingVisitas, historicoVisitas,
}: {
  loadingVisitas: boolean
  historicoVisitas: any[]
}) {
  return (
    <>
      <SectionHeader label="Histórico de Visitas" />
      <div className="px-4 py-3">
        {loadingVisitas ? (
          <div className="flex items-center gap-2 py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span className="text-xs text-gray-400">Carregando…</span>
          </div>
        ) : historicoVisitas.length > 0 ? (
          <div className="rounded-lg overflow-hidden border border-gray-300">
            <div className="grid grid-cols-3 text-[10px] font-semibold text-white uppercase tracking-wider bg-gray-700 px-3 py-2">
              <span>Data</span>
              <span className="text-center">Resultado</span>
              <span className="text-right">Vendeu?</span>
            </div>
            <div className="divide-y divide-gray-200">
              {historicoVisitas.slice(0, 5).map((v, i) => {
                const dt = new Date(v.data_visita)
                const resultado = v.resultado as string | undefined
                const vendeu    = resultado === 'vendeu'
                const ausente   = resultado === 'ausente'
                const reagendou = resultado === 'reagendou'

                const resultadoLabel = {
                  vendeu:     '✓ Realizada',
                  nao_vendeu: '✓ Realizada',
                  ausente:    'Ausente',
                  reagendou:  'Reagendado',
                }[resultado ?? ''] ?? '✓ Realizada'

                const resultadoColor = (ausente || reagendou)
                  ? 'text-amber-600'
                  : 'text-green-700'

                return (
                  <div key={i} className={`grid grid-cols-3 items-center px-3 py-2 text-xs ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <span className="text-gray-700 font-medium">
                      {dt.toLocaleDateString('pt-BR')}
                    </span>
                    <span className={`text-center font-semibold ${resultadoColor}`}>
                      {resultadoLabel}
                    </span>
                    <span className={`text-right font-bold ${vendeu ? 'text-green-700' : 'text-gray-400'}`}>
                      {ausente || reagendou ? '—' : vendeu ? 'Sim' : 'Não'}
                    </span>
                  </div>
                )
              })}
            </div>
            {historicoVisitas.length > 5 && (
              <p className="text-[10px] text-gray-400 text-center py-2 bg-gray-50 border-t border-gray-200">
                + {historicoVisitas.length - 5} anteriores
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-1">Nenhuma visita registrada</p>
        )}
      </div>
    </>
  )
}
