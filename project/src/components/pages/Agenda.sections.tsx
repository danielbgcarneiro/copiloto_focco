/**
 * Copiloto Focco Brasil
 * Seções de apresentação da Agenda — extraídas para reduzir complexidade.
 */

import { CalendarDays, LayoutGrid, CalendarRange, Wifi, WifiOff, Plus, Star, AlertTriangle, Route, X as XIcon } from 'lucide-react'
import { formatDate, AgendamentoDia, AgendamentoDiaDetalhado } from '../../hooks/useAgenda'
import { AgendaTotalizacaoCard, AgendaTotalizacaoItem } from '../molecules/AgendaTotalizacaoCard'
import { SemanaGrid } from '../molecules/SemanaGrid'
import { MesGrid } from '../molecules/MesGrid'

const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Mini-calendário horizontal de 7 dias (AC4)
export function MiniCalendario({
  weekStart, selectedDate, today, agendaCache, onSelectDay,
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
            <span className={`text-[11px] font-medium ${isSelected ? 'text-white' : 'text-gray-500'}`}>
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

// ─── Barra de status (offline / atualizando) ──────────────────────────────────

export function AgendaStatusBar({ isOffline, loading }: { isOffline: boolean; loading: boolean }) {
  if (isOffline) {
    return (
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-orange-500 flex-shrink-0" />
        <span className="text-xs text-orange-700">Modo offline — exibindo dados salvos</span>
      </div>
    )
  }
  if (loading) {
    return (
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-1.5 flex items-center gap-2">
        <Wifi className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <span className="text-xs text-blue-600">Atualizando agenda…</span>
      </div>
    )
  }
  return null
}

// ─── Toggle de view + botão Hoje ──────────────────────────────────────────────

const VIEW_META = {
  dia: { Icon: CalendarDays, label: 'Dia' },
  semana: { Icon: LayoutGrid, label: 'Semana' },
  mes: { Icon: CalendarRange, label: 'Mês' },
} as const

type ViewKey = keyof typeof VIEW_META

export function AgendaViewToggle({
  view, onViewChange, isToday, onHoje,
}: {
  view: ViewKey
  onViewChange: (v: ViewKey) => void
  isToday: boolean
  onHoje: () => void
}) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
        {(['dia', 'semana', 'mes'] as const).map((v) => {
          const { Icon, label } = VIEW_META[v]
          return (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800',
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
          onClick={onHoje}
          className="text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors"
        >
          Hoje
        </button>
      )}
    </div>
  )
}

// ─── Banners ──────────────────────────────────────────────────────────────────

export function SugestoesBanner({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mx-4 mt-3 flex items-center gap-2.5 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 w-[calc(100%-2rem)] text-left active:bg-primary/10 transition-colors cursor-pointer"
    >
      <Star className="w-4 h-4 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#0d6e91]">
          {count} {count === 1 ? 'cliente prioritário' : 'clientes prioritários'} sem visita esta semana
        </p>
        <p className="text-[11px] text-[#0d6e91]">Ver sugestões</p>
      </div>
    </button>
  )
}

export function VisitasSemResultadoBanner({ count }: { count: number }) {
  return (
    <div className="mx-4 mt-3 flex items-center gap-2.5 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
      <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
      <p className="text-xs font-medium text-orange-700">
        {count} {count === 1 ? 'visita sem resultado registrado' : 'visitas sem resultado registrado'}
      </p>
    </div>
  )
}

// ─── Views (Dia / Semana / Mês) ───────────────────────────────────────────────

export function AgendaDiaView({
  weekStart, selectedDate, today, cache, onSelectDay, onTouchStart, onTouchEnd,
  diaLabel, loadingDia, agsDia, error, errorDia, itemsDia, metaMes, realizadoMes,
  onRegistrar, onClienteClick,
}: {
  weekStart: Date
  selectedDate: Date
  today: Date
  cache: Record<string, AgendamentoDia[]>
  onSelectDay: (d: Date) => void
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
  diaLabel: string
  loadingDia: boolean
  agsDia: AgendamentoDiaDetalhado[]
  error: string | null
  errorDia: string | null
  itemsDia: AgendaTotalizacaoItem[]
  metaMes: number
  realizadoMes: number
  onRegistrar: (id: string) => void
  onClienteClick: (codigoCliente: number) => void
}) {
  const contagem = loadingDia
    ? 'Carregando…'
    : agsDia.length > 0
    ? `${agsDia.length} agendamento${agsDia.length > 1 ? 's' : ''}`
    : 'Nenhum agendamento'

  return (
    <>
      <div className="bg-white border-b border-gray-100">
        <MiniCalendario
          weekStart={weekStart}
          selectedDate={selectedDate}
          today={today}
          agendaCache={cache}
          onSelectDay={onSelectDay}
        />
      </div>

      <div className="flex-1 overflow-y-auto pb-24" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="px-4 pt-4 pb-2">
          <p className="text-base font-semibold text-gray-900 capitalize">{diaLabel}</p>
          <p className="text-xs text-gray-500 mt-0.5">{contagem}</p>
        </div>

        {error && (
          <div className="mx-4 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            Erro ao carregar dados: {error}
          </div>
        )}

        {errorDia && (
          <div className="mx-4 mt-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {errorDia}
          </div>
        )}

        {loadingDia ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !errorDia && agsDia.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-center px-4">
            <CalendarDays className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-500">Nenhuma visita agendada para este dia</p>
            <p className="text-xs text-gray-500">Use o botão + para agendar</p>
          </div>
        ) : null}

        <AgendaTotalizacaoCard
          items={itemsDia}
          metaMes={metaMes}
          realizadoMes={realizadoMes}
          hoje={today}
          showClienteTable={!loadingDia}
          onRegistrar={onRegistrar}
          onClienteClick={onClienteClick}
        />
      </div>
    </>
  )
}

export function AgendaSemanaView({
  weekStart, cache, selectedDate, today, onSelectDay, onWeekChange, planosAtivos,
  itemsSemana, metaMes, realizadoMes, onClienteClick,
}: {
  weekStart: Date
  cache: Record<string, AgendamentoDia[]>
  selectedDate: Date
  today: Date
  onSelectDay: (d: Date) => void
  onWeekChange: (weekStart: Date) => void
  planosAtivos: any
  itemsSemana: AgendaTotalizacaoItem[]
  metaMes: number
  realizadoMes: number
  onClienteClick: (codigoCliente: number) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-white pb-24">
      <SemanaGrid
        weekStart={weekStart}
        agendaCache={cache}
        selectedDate={selectedDate}
        today={today}
        onSelectDay={onSelectDay}
        onWeekChange={onWeekChange}
        planosAtivos={planosAtivos}
      />

      <div className="px-4 pt-2 pb-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-2 font-medium">Perfil do cliente</p>
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
        onClienteClick={onClienteClick}
      />
    </div>
  )
}

export function AgendaMesView({
  viewMonth, cache, today, onSelectDay, onMonthChange, itemsMes, metaMes, realizadoMes,
}: {
  viewMonth: { year: number; month: number }
  cache: Record<string, AgendamentoDia[]>
  today: Date
  onSelectDay: (d: Date) => void
  onMonthChange: (year: number, month: number) => void
  itemsMes: AgendaTotalizacaoItem[]
  metaMes: number
  realizadoMes: number
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-white pb-24">
      <MesGrid
        year={viewMonth.year}
        month={viewMonth.month}
        agendaCache={cache}
        today={today}
        onSelectDay={onSelectDay}
        onMonthChange={onMonthChange}
      />

      <AgendaTotalizacaoCard
        items={itemsMes}
        metaMes={metaMes}
        realizadoMes={realizadoMes}
        hoje={today}
        showClienteTable={false}
      />
    </div>
  )
}

// ─── FAB ──────────────────────────────────────────────────────────────────────

export function AgendaFab({
  expanded, onToggle, onPlanejarRota, onAgendarCliente,
}: {
  expanded: boolean
  onToggle: () => void
  onPlanejarRota: () => void
  onAgendarCliente: () => void
}) {
  return (
    <div className="fixed bottom-6 right-4 flex flex-col items-end gap-2 z-30">
      {expanded && (
        <>
          <button
            onClick={onPlanejarRota}
            className="flex items-center gap-2 bg-white text-sky-700 border border-sky-200 rounded-full px-4 py-2.5 shadow-lg text-sm font-semibold hover:bg-sky-50 transition-colors"
          >
            <Route className="w-4 h-4" />
            Planejar Rota
          </button>
          <button
            onClick={onAgendarCliente}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 rounded-full px-4 py-2.5 shadow-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agendar Cliente
          </button>
        </>
      )}
      <button
        onClick={onToggle}
        className="w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center active:opacity-80 transition-all cursor-pointer"
        aria-label={expanded ? 'Fechar menu' : 'Adicionar'}
      >
        {expanded ? <XIcon className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  )
}
