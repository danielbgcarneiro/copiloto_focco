/**
 * Copiloto Focco Brasil
 * Page: Agenda — visão do dia (lista) + grade semanal (Story 3.6)
 *
 * Story 3.18: totalização dia/semana, molecule AgendamentoCard, RegistrarVisitaSheet
 * Story 3.19: tabela unificada (sem card separado), navegação interna no mês,
 *             totalização mensal, único FAB, sem sobreposição de conteúdo
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, LayoutGrid, CalendarRange, Wifi, WifiOff, Plus, Star, AlertTriangle } from 'lucide-react'
import { useSetPage } from '../../contexts'
import { useAuth } from '../../contexts/AuthContext'
import {
  useAgenda,
  getWeekStart,
  formatDate,
  AgendamentoDia,
  AgendamentoDiaDetalhado,
  getAgendamentosDia,
  getForecastMes,
} from '../../hooks/useAgenda'
import { useVisitas, Visita } from '../../hooks/useVisitas'
import { useSugestoesAgenda } from '../../hooks/useSugestoesAgenda'
import { RegistrarVisitaSheet } from '../molecules/RegistrarVisitaSheet'
import { AgendaTotalizacaoCard, AgendaTotalizacaoItem } from '../molecules/AgendaTotalizacaoCard'
import { SemanaGrid } from '../molecules/SemanaGrid'
import { MesGrid } from '../molecules/MesGrid'
import { BuscarClienteSheet } from '../molecules/BuscarClienteSheet'
import { SugestoesAgendaSheet } from '../molecules/SugestoesAgendaSheet'
import { hasAgendamentosSemResultado } from '../../utils/alertasAgenda'

const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Mini-calendário horizontal de 7 dias (AC4)
function MiniCalendario({
  weekStart,
  selectedDate,
  today,
  agendaCache,
  onSelectDay,
}: {
  weekStart: Date
  selectedDate: Date
  today: Date
  agendaCache: Record<string, AgendamentoDia[]>
  onSelectDay: (d: Date) => void
}) {
  const todayStr = formatDate(today)
  const selectedStr = formatDate(selectedDate)

  return (
    <div className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide">
      {Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + i)
        const dateStr = formatDate(d)
        const hasDots = (agendaCache[dateStr] ?? []).length > 0
        const isToday = dateStr === todayStr
        const isSelected = dateStr === selectedStr

        return (
          <button
            key={i}
            onClick={() => onSelectDay(d)}
            className={[
              'flex flex-col items-center gap-0.5 min-w-[40px] py-1.5 px-1 rounded-xl cursor-pointer transition-colors',
              isSelected ? 'bg-primary text-white' : 'hover:bg-gray-100',
            ].join(' ')}
          >
            <span className={`text-[11px] font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
              {DIAS_SEMANA_ABREV[d.getDay()]}
            </span>
            <span
              className={[
                'w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold',
                isSelected ? 'text-white' : isToday ? 'text-primary' : 'text-gray-800',
              ].join(' ')}
            >
              {d.getDate()}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hasDots ? (isSelected ? 'bg-white/70' : 'bg-primary') : 'bg-transparent'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}

export default function Agenda() {
  useSetPage('Agenda')
  const { user } = useAuth()
  const navigate = useNavigate()
  const vendedorId = user?.id

  const today = useRef(new Date()).current
  today.setHours(0, 0, 0, 0)

  const [view, setView] = useState<'dia' | 'semana' | 'mes'>('dia')
  const [viewMonth, setViewMonth] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }))
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(today))

  const { prefetchAroundDate, fetchMonth, invalidateWeek, loading, error, isOffline, cache } =
    useAgenda(vendedorId)

  // View dia: dados detalhados
  const [agsDia, setAgsDia] = useState<AgendamentoDiaDetalhado[]>([])
  const [loadingDia, setLoadingDia] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Sheet de registro de visita
  const [sheetAg, setSheetAg] = useState<AgendamentoDiaDetalhado | null>(null)
  const { motivos, loadingMotivos, carregarMotivos, registrarVisita } = useVisitas(
    sheetAg?.codigo_cliente ?? 0
  )

  // Meta/realizado do mês
  const [metaMes, setMetaMes] = useState(0)
  const [realizadoMes, setRealizadoMes] = useState(0)

  const [showBusca, setShowBusca] = useState(false)
  const [showSugestoes, setShowSugestoes] = useState(false)

  const { sugestoes, loading: loadingSugestoes, carregar: carregarSugestoes } = useSugestoesAgenda(vendedorId)

  const visitasSemResultado = useMemo(
    () => hasAgendamentosSemResultado(cache, formatDate(today)),
    [cache, today]
  )

  const agendamentosThisWeek = useMemo(() => {
    let count = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      count += (cache[formatDate(d)] ?? []).length
    }
    return count
  }, [weekStart, cache])

  // Prefetch ao montar e quando selectedDate mudar de semana
  useEffect(() => {
    prefetchAroundDate(selectedDate)
  }, [prefetchAroundDate, selectedDate])

  // Sincronizar weekStart com selectedDate
  useEffect(() => {
    const newWeekStart = getWeekStart(selectedDate)
    if (formatDate(newWeekStart) !== formatDate(weekStart)) {
      setWeekStart(newWeekStart)
    }
  }, [selectedDate, weekStart])

  // Sugestões quando semana tem menos de 5 agendamentos
  useEffect(() => {
    if (agendamentosThisWeek < 5) carregarSugestoes(weekStart)
  }, [weekStart, agendamentosThisWeek, carregarSugestoes])

  // Carregar mês quando view === 'mes'
  useEffect(() => {
    if (view === 'mes') fetchMonth(viewMonth.year, viewMonth.month)
  }, [view, viewMonth.year, viewMonth.month, fetchMonth])

  // Dados detalhados do dia selecionado
  useEffect(() => {
    if (!vendedorId) return
    setLoadingDia(true)
    getAgendamentosDia(formatDate(selectedDate), vendedorId)
      .then((ags) => {
        const pending = ags.filter((a) => !a.visita_resultado)
        const done = ags.filter((a) => a.visita_resultado)
        const byDsv = (list: AgendamentoDiaDetalhado[]) =>
          [...list].sort((a, b) => (b.dsv ?? 0) - (a.dsv ?? 0))
        setAgsDia([...byDsv(pending), ...byDsv(done)])
      })
      .catch(() => setAgsDia([]))
      .finally(() => setLoadingDia(false))
  }, [vendedorId, selectedDate, refreshKey])

  // Meta e realizado do mês corrente
  useEffect(() => {
    if (!vendedorId) return
    const now = new Date()
    getForecastMes(now.getFullYear(), now.getMonth() + 1, vendedorId)
      .then(({ metaMes: m, realizadoMes: r }) => {
        setMetaMes(m)
        setRealizadoMes(r)
      })
      .catch(() => {})
  }, [vendedorId])

  // Swipe entre dias (AC3)
  const touchStartX = useRef<number | null>(null)
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      const newDate = new Date(selectedDate)
      newDate.setDate(newDate.getDate() + (diff > 0 ? 1 : -1))
      setSelectedDate(newDate)
    }
    touchStartX.current = null
  }

  function handleSelectDay(date: Date) {
    setSelectedDate(date)
    if (view === 'semana' || view === 'mes') setView('dia')
  }

  function handleWeekChange(newWeekStart: Date) {
    setWeekStart(newWeekStart)
    const newWeekEnd = new Date(newWeekStart)
    newWeekEnd.setDate(newWeekEnd.getDate() + 6)
    if (selectedDate < newWeekStart || selectedDate > newWeekEnd) {
      setSelectedDate(new Date(newWeekStart))
    }
  }

  function handleVisitaSuccess(visita: Visita) {
    setAgsDia((prev) =>
      prev.map((ag) =>
        ag.id === sheetAg?.id
          ? {
              ...ag,
              visita_resultado: visita.resultado,
              visita_valor_realizado: visita.valor_realizado,
              visita_id: visita.id,
            }
          : ag
      )
    )
    // Invalida o cache da semana para atualizar o banner de visitas sem resultado
    invalidateWeek(selectedDate)
    setSheetAg(null)
  }

  const isToday = formatDate(selectedDate) === formatDate(today)

  const diaLabel = selectedDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Itens totalização — view dia (detalhado: tem cidade + visita_resultado)
  const itemsDia = useMemo<AgendaTotalizacaoItem[]>(
    () =>
      agsDia.map((ag) => ({
        id: ag.id,
        codigo_cliente: ag.codigo_cliente,
        nome: ag.nome_fantasia || ag.razao_social,
        cidade: ag.cidade,
        perfil_rfm: ag.perfil_rfm,
        valor_previsto: ag.valor_previsto,
        oportunidade: ag.oportunidade_rfm,
        meta_ano_atual: ag.meta_ano_atual,
        visita_resultado: ag.visita_resultado,
        visita_valor_realizado: ag.visita_valor_realizado,
      })),
    [agsDia]
  )

  // Itens totalização — view semana (cache: sem cidade nem visita_resultado)
  const itemsSemana = useMemo<AgendaTotalizacaoItem[]>(() => {
    const result: AgendaTotalizacaoItem[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      for (const ag of cache[formatDate(d)] ?? []) {
        result.push({
          id: ag.id,
          codigo_cliente: ag.codigo_cliente,
          nome: ag.nome_fantasia || ag.razao_social,
          cidade: null,
          perfil_rfm: ag.perfil_rfm,
          valor_previsto: ag.valor_previsto,
          oportunidade: ag.previsao_pedido,
          meta_ano_atual: ag.meta_ano_atual,
          visita_resultado: null,
        })
      }
    }
    return result
  }, [weekStart, cache])

  // Itens totalização — view mês (agrega todos os dias do mês no cache)
  const itemsMes = useMemo<AgendaTotalizacaoItem[]>(() => {
    if (view !== 'mes') return []
    const { year, month } = viewMonth
    const lastDay = new Date(year, month + 1, 0).getDate()
    const result: AgendaTotalizacaoItem[] = []
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = formatDate(new Date(year, month, d))
      for (const ag of cache[dateStr] ?? []) {
        result.push({
          id: ag.id,
          codigo_cliente: ag.codigo_cliente,
          nome: ag.nome_fantasia || ag.razao_social,
          cidade: null,
          perfil_rfm: ag.perfil_rfm,
          valor_previsto: ag.valor_previsto,
          oportunidade: ag.previsao_pedido,
          meta_ano_atual: ag.meta_ano_atual,
          visita_resultado: null,
        })
      }
    }
    return result
  }, [view, viewMonth, cache])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Barra de status */}
      {isOffline && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span className="text-xs text-orange-700">Modo offline — exibindo dados salvos</span>
        </div>
      )}
      {!isOffline && loading && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-1.5 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="text-xs text-blue-600">Atualizando agenda…</span>
        </div>
      )}

      {/* Toggle de view + botão Hoje */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['dia', 'semana', 'mes'] as const).map((v) => {
            const Icon = v === 'dia' ? CalendarDays : v === 'semana' ? LayoutGrid : CalendarRange
            const label = v === 'dia' ? 'Dia' : v === 'semana' ? 'Semana' : 'Mês'
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                  view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            )
          })}
        </div>

        {!isToday && (
          <button
            onClick={() => {
              const d = new Date()
              d.setHours(0, 0, 0, 0)
              setSelectedDate(d)
              setWeekStart(getWeekStart(d))
              setView('dia')
            }}
            className="text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors"
          >
            Hoje
          </button>
        )}
      </div>

      {/* Banner sugestões */}
      {agendamentosThisWeek < 5 && sugestoes.length > 0 && (
        <button
          onClick={() => setShowSugestoes(true)}
          className="mx-4 mt-3 flex items-center gap-2.5 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 w-[calc(100%-2rem)] text-left active:bg-primary/10 transition-colors cursor-pointer"
        >
          <Star className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">
              {sugestoes.length}{' '}
              {sugestoes.length === 1 ? 'cliente prioritário' : 'clientes prioritários'} sem visita esta semana
            </p>
            <p className="text-[11px] text-primary/70">Ver sugestões</p>
          </div>
        </button>
      )}

      {/* Banner visitas sem resultado */}
      {visitasSemResultado > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2.5 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <p className="text-xs font-medium text-orange-700">
            {visitasSemResultado}{' '}
            {visitasSemResultado === 1 ? 'visita sem resultado registrado' : 'visitas sem resultado registrado'}
          </p>
        </div>
      )}

      {/* ─── View: Dia ─────────────────────────────────────────────── */}
      {view === 'dia' && (
        <>
          <div className="bg-white border-b border-gray-100">
            <MiniCalendario
              weekStart={weekStart}
              selectedDate={selectedDate}
              today={today}
              agendaCache={cache}
              onSelectDay={handleSelectDay}
            />
          </div>

          <div
            className="flex-1 overflow-y-auto pb-24"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="px-4 pt-4 pb-2">
              <p className="text-base font-semibold text-gray-900 capitalize">{diaLabel}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {loadingDia
                  ? 'Carregando…'
                  : agsDia.length > 0
                  ? `${agsDia.length} agendamento${agsDia.length > 1 ? 's' : ''}`
                  : 'Nenhum agendamento'}
              </p>
            </div>

            {error && (
              <div className="mx-4 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                Erro ao carregar dados: {error}
              </div>
            )}

            {loadingDia ? (
              <div className="flex items-center justify-center h-20">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : agsDia.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-center px-4">
                <CalendarDays className="w-10 h-10 text-gray-200" />
                <p className="text-sm text-gray-400">Nenhuma visita agendada para este dia</p>
                <p className="text-xs text-gray-300">Use o botão + para agendar</p>
              </div>
            ) : null}

            {/* Tabela unificada: lista + totais */}
            <AgendaTotalizacaoCard
              items={itemsDia}
              metaMes={metaMes}
              realizadoMes={realizadoMes}
              hoje={today}
              showClienteTable={!loadingDia}
              onRegistrar={(id) => {
                const ag = agsDia.find((a) => a.id === id)
                if (ag) setSheetAg(ag)
              }}
              onClienteClick={(codigoCliente) =>
                navigate(`/clientes/detalhes/${codigoCliente}`)
              }
            />
          </div>
        </>
      )}

      {/* ─── View: Semana ──────────────────────────────────────────── */}
      {view === 'semana' && (
        <div className="flex-1 overflow-y-auto bg-white pb-24">
          <SemanaGrid
            weekStart={weekStart}
            agendaCache={cache}
            selectedDate={selectedDate}
            today={today}
            onSelectDay={handleSelectDay}
            onWeekChange={handleWeekChange}
          />

          <div className="px-4 pt-2 pb-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2 font-medium">Perfil do cliente</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Ouro', color: 'bg-yellow-400' },
                { label: 'Prata', color: 'bg-gray-400' },
                { label: 'Bronze', color: 'bg-orange-500' },
                { label: 'Sem dados', color: 'bg-blue-400' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} aria-hidden="true" />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <AgendaTotalizacaoCard
            items={itemsSemana}
            metaMes={metaMes}
            realizadoMes={realizadoMes}
            hoje={today}
            onClienteClick={(codigoCliente) =>
              navigate(`/clientes/detalhes/${codigoCliente}`)
            }
          />
        </div>
      )}

      {/* ─── View: Mês ─────────────────────────────────────────────── */}
      {view === 'mes' && (
        <div className="flex-1 overflow-y-auto bg-white pb-24">
          <MesGrid
            year={viewMonth.year}
            month={viewMonth.month}
            agendaCache={cache}
            today={today}
            onSelectDay={handleSelectDay}
            onMonthChange={(year, month) => setViewMonth({ year, month })}
          />

          <AgendaTotalizacaoCard
            items={itemsMes}
            metaMes={metaMes}
            realizadoMes={realizadoMes}
            hoje={today}
            showClienteTable={false}
          />
        </div>
      )}

      {/* FAB único para adicionar agendamento */}
      <button
        onClick={() => setShowBusca(true)}
        className="fixed bottom-6 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center z-30 active:opacity-80 transition-opacity cursor-pointer"
        aria-label="Adicionar agendamento"
      >
        <Plus className="w-6 h-6" />
      </button>

      {vendedorId && (
        <BuscarClienteSheet
          isOpen={showBusca}
          onClose={() => setShowBusca(false)}
          vendedorId={vendedorId}
          onSuccess={(dataAgendada) => {
            setShowBusca(false)
            invalidateWeek(new Date(dataAgendada + 'T00:00:00'))
            setRefreshKey((k) => k + 1)
          }}
        />
      )}

      {vendedorId && (
        <SugestoesAgendaSheet
          isOpen={showSugestoes}
          onClose={() => setShowSugestoes(false)}
          vendedorId={vendedorId}
          sugestoes={sugestoes}
          loadingSugestoes={loadingSugestoes}
          onSuccess={(dataAgendada) => {
            setShowSugestoes(false)
            invalidateWeek(new Date(dataAgendada + 'T00:00:00'))
            carregarSugestoes(weekStart)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}

      {sheetAg && vendedorId && (
        <RegistrarVisitaSheet
          isOpen={!!sheetAg}
          onClose={() => setSheetAg(null)}
          onSuccess={handleVisitaSuccess}
          codigoCliente={sheetAg.codigo_cliente}
          vendedorId={vendedorId}
          agendamentoId={sheetAg.id}
          rfmPerfil={sheetAg.perfil_rfm}
          rfmOportunidade={sheetAg.oportunidade_rfm}
          rfmDsv={sheetAg.dsv}
          motivos={motivos}
          loadingMotivos={loadingMotivos}
          carregarMotivos={carregarMotivos}
          registrarVisita={registrarVisita}
        />
      )}
    </div>
  )
}
