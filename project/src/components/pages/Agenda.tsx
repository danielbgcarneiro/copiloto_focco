/**
 * Copiloto Focco Brasil
 * Page: Agenda — visão do dia (lista) + grade semanal (Story 3.6)
 *
 * AC1:  Rota /agenda, apenas vendedor
 * AC2:  View padrão = lista vertical do dia atual
 * AC3:  Swipe entre dias na view de lista
 * AC4:  Mini-calendário horizontal de 7 dias
 * AC5:  Tap no mini-calendário muda o dia exibido
 * AC6:  Toggle "Semana" alterna para SemanaGrid
 * AC7:  Botão "Hoje" retorna ao dia atual
 * AC15: useSetPage('Agenda'), sem botão voltar
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, LayoutGrid, CalendarRange, Wifi, WifiOff, Plus, Star, AlertTriangle } from 'lucide-react'
import { useSetPage } from '../../contexts'
import { useAuth } from '../../contexts/AuthContext'
import { useAgenda, getWeekStart, formatDate, AgendamentoDia } from '../../hooks/useAgenda'
import { useSugestoesAgenda } from '../../hooks/useSugestoesAgenda'
import { SemanaGrid } from '../molecules/SemanaGrid'
import { MesGrid } from '../molecules/MesGrid'
import { BuscarClienteSheet } from '../molecules/BuscarClienteSheet'
import { SugestoesAgendaSheet } from '../molecules/SugestoesAgendaSheet'
import { hasAgendamentosSemResultado } from '../../utils/alertasAgenda'

const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
function getDotColor(perfil: string | null): string {
  switch (perfil?.toLowerCase()) {
    case 'ouro':   return 'bg-yellow-400'
    case 'prata':  return 'bg-gray-400'
    case 'bronze': return 'bg-orange-500'
    default:       return 'bg-blue-400'
  }
}

function getBadgeStatus(status: string) {
  switch (status) {
    case 'realizado':
      return { label: 'Realizado', classes: 'bg-green-100 text-green-700' }
    case 'cancelado':
      return { label: 'Cancelado', classes: 'bg-red-100 text-red-700' }
    default:
      return { label: 'Pendente', classes: 'bg-blue-100 text-blue-700' }
  }
}

// Card de agendamento na lista do dia
function AgendamentoCard({ ag, onClick }: { ag: AgendamentoDia; onClick: () => void }) {
  const badge = getBadgeStatus(ag.status)
  const nomeExibido = ag.nome_fantasia || ag.razao_social
  const valorFmt = ag.valor_previsto != null
    ? ag.valor_previsto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-start gap-3 active:bg-gray-50 transition-colors cursor-pointer"
      aria-label={`${nomeExibido}, ${badge.label}`}
    >
      {/* Dot RFM */}
      <span className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 ${getDotColor(ag.perfil_rfm)}`} aria-hidden="true" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{nomeExibido}</p>
        {ag.nome_fantasia && (
          <p className="text-xs text-gray-400 truncate">{ag.razao_social}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.classes}`}>
            {badge.label}
          </span>
          {valorFmt && (
            <span className="text-xs text-gray-500">{valorFmt}</span>
          )}
          {ag.offline_pending && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">
              Sincronizando…
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

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
                isSelected
                  ? 'text-white'
                  : isToday
                  ? 'text-primary'
                  : 'text-gray-800',
              ].join(' ')}
            >
              {d.getDate()}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${hasDots ? (isSelected ? 'bg-white/70' : 'bg-primary') : 'bg-transparent'}`} />
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

  const { getAgendamentosForDate, prefetchAroundDate, fetchMonth, invalidateWeek, loading, error, isOffline, cache } =
    useAgenda(vendedorId)

  const [showBusca, setShowBusca] = useState(false)
  const [showSugestoes, setShowSugestoes] = useState(false)

  const { sugestoes, loading: loadingSugestoes, carregar: carregarSugestoes } = useSugestoesAgenda(vendedorId)

  // AC2: contagem de visitas pendentes em dias passados (Story 3.11)
  const visitasSemResultado = useMemo(
    () => hasAgendamentosSemResultado(cache, formatDate(today)),
    [cache, today]
  )

  // Contagem de agendamentos na semana corrente
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

  // Sincronizar weekStart quando selectedDate sair da semana atual
  useEffect(() => {
    const newWeekStart = getWeekStart(selectedDate)
    if (formatDate(newWeekStart) !== formatDate(weekStart)) {
      setWeekStart(newWeekStart)
    }
  }, [selectedDate, weekStart])

  // Carregar sugestões quando a semana muda e há menos de 5 agendamentos (AC1)
  useEffect(() => {
    if (agendamentosThisWeek < 5) {
      carregarSugestoes(weekStart)
    }
  }, [weekStart, agendamentosThisWeek, carregarSugestoes])

  // Story 3.12: carregar mês quando view === 'mes' ou quando o mês muda
  useEffect(() => {
    if (view === 'mes') {
      fetchMonth(viewMonth.year, viewMonth.month)
    }
  }, [view, viewMonth.year, viewMonth.month, fetchMonth])

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
    if (view === 'semana') setView('dia')
  }

  function handleWeekChange(newWeekStart: Date) {
    setWeekStart(newWeekStart)
    // Se a semana mudou e o dia selecionado não está nela, mover para o domingo dessa semana
    const newWeekEnd = new Date(newWeekStart)
    newWeekEnd.setDate(newWeekEnd.getDate() + 6)
    if (selectedDate < newWeekStart || selectedDate > newWeekEnd) {
      setSelectedDate(new Date(newWeekStart))
    }
  }

  const isToday = formatDate(selectedDate) === formatDate(today)
  const agendamentosHoje = getAgendamentosForDate(selectedDate)

  // Label do dia exibido
  const diaLabel = selectedDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Barra de status offline / indicador (AC14) */}
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

      {/* Controles do header: toggle view + botão Hoje */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setView('dia')}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
              view === 'dia'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Dia
          </button>
          <button
            onClick={() => setView('semana')}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
              view === 'semana'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Semana
          </button>
          <button
            onClick={() => setView('mes')}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
              view === 'mes'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            Mês
          </button>
        </div>

        {/* Botão Hoje — visível apenas quando não é hoje (AC7) */}
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

      {/* Banner de sugestões (AC1) — quando há menos de 5 agendamentos na semana */}
      {agendamentosThisWeek < 5 && sugestoes.length > 0 && (
        <button
          onClick={() => setShowSugestoes(true)}
          className="mx-4 mt-3 flex items-center gap-2.5 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 w-[calc(100%-2rem)] text-left active:bg-primary/10 transition-colors cursor-pointer"
        >
          <Star className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">
              {sugestoes.length} {sugestoes.length === 1 ? 'cliente prioritário' : 'clientes prioritários'} sem visita esta semana
            </p>
            <p className="text-[11px] text-primary/70">Ver sugestões</p>
          </div>
        </button>
      )}

      {/* AC2: Banner de visitas sem resultado registrado (Story 3.11) */}
      {visitasSemResultado > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2.5 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <p className="text-xs font-medium text-orange-700">
            {visitasSemResultado}{' '}
            {visitasSemResultado === 1 ? 'visita sem resultado registrado' : 'visitas sem resultado registrado'}
          </p>
        </div>
      )}

      {/* View: Dia */}
      {view === 'dia' && (
        <>
          {/* Mini-calendário 7 dias (AC4) */}
          <div className="bg-white border-b border-gray-100">
            <MiniCalendario
              weekStart={weekStart}
              selectedDate={selectedDate}
              today={today}
              agendaCache={cache}
              onSelectDay={handleSelectDay}
            />
          </div>

          {/* Lista de agendamentos do dia selecionado (AC2, AC3) */}
          <div
            className="flex-1 overflow-y-auto"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Cabeçalho do dia */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-base font-semibold text-gray-900 capitalize">{diaLabel}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {agendamentosHoje.length > 0
                  ? `${agendamentosHoje.length} agendamento${agendamentosHoje.length > 1 ? 's' : ''}`
                  : 'Nenhum agendamento'}
              </p>
            </div>

            {/* Erro */}
            {error && (
              <div className="mx-4 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                Erro ao carregar dados: {error}
              </div>
            )}

            {/* Itens */}
            <div className="px-4 pb-6 flex flex-col gap-2">
              {agendamentosHoje.length === 0 && !loading ? (
                <div className="py-12 flex flex-col items-center gap-2 text-center">
                  <CalendarDays className="w-10 h-10 text-gray-200" />
                  <p className="text-sm text-gray-400">Nenhuma visita agendada para este dia</p>
                  <p className="text-xs text-gray-300">Agende em "Próxima Visita" na tela do cliente</p>
                </div>
              ) : (
                agendamentosHoje.map((ag) => (
                  <AgendamentoCard
                    key={ag.id}
                    ag={ag}
                    onClick={() => navigate(`/clientes/detalhes/${ag.codigo_cliente}`)}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* View: Semana */}
      {view === 'semana' && (
        <div className="flex-1 overflow-y-auto bg-white">
          <SemanaGrid
            weekStart={weekStart}
            agendaCache={cache}
            selectedDate={selectedDate}
            today={today}
            onSelectDay={handleSelectDay}
            onWeekChange={handleWeekChange}
          />

          {/* Legenda dos dots */}
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
        </div>
      )}

      {/* View: Mês (Story 3.12) */}
      {view === 'mes' && (
        <div className="flex-1 overflow-y-auto bg-white">
          <MesGrid
            year={viewMonth.year}
            month={viewMonth.month}
            agendaCache={cache}
            today={today}
            onSelectDay={(date) => navigate(`/agenda/${formatDate(date)}`)}
            onMonthChange={(year, month) => setViewMonth({ year, month })}
          />
        </div>
      )}

      {/* FAB "+" — adicionar agendamento (AC1) */}
      <button
        onClick={() => setShowBusca(true)}
        className="fixed bottom-6 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center z-30 active:opacity-80 transition-opacity cursor-pointer"
        aria-label="Adicionar agendamento"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Sheet de busca e agendamento */}
      {vendedorId && (
        <BuscarClienteSheet
          isOpen={showBusca}
          onClose={() => setShowBusca(false)}
          vendedorId={vendedorId}
          onSuccess={(dataAgendada) => {
            setShowBusca(false)
            invalidateWeek(new Date(dataAgendada + 'T00:00:00'))
          }}
        />
      )}

      {/* Sheet de sugestões da semana (Story 3.9) */}
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
          }}
        />
      )}
    </div>
  )
}
