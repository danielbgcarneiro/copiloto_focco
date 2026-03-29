/**
 * Copiloto Focco Brasil
 * Molecule: SemanaGrid — Grade semanal Dom-Sab com dots RFM (Story 3.6)
 *
 * AC8:  7 colunas Dom-Sab, dots coloridos por perfil RFM
 * AC9:  Swipe horizontal navega entre semanas
 * AC10: Tap no dia → callback onSelectDay
 * AC11: Dias sem agendamentos aparecem com coluna vazia
 */

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AgendaCache, formatDate, getWeekStart } from '../../hooks/useAgenda'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Cores dos dots por perfil RFM (AC8)
function getDotColor(perfil: string | null): string {
  switch (perfil?.toLowerCase()) {
    case 'ouro':
      return 'bg-yellow-400'
    case 'prata':
      return 'bg-gray-400'
    case 'bronze':
      return 'bg-orange-500'
    default:
      return 'bg-blue-400'
  }
}

interface SemanaGridProps {
  weekStart: Date
  agendaCache: AgendaCache
  selectedDate: Date
  today: Date
  onSelectDay: (date: Date) => void
  onWeekChange: (newWeekStart: Date) => void
}

export function SemanaGrid({
  weekStart,
  agendaCache,
  selectedDate,
  today,
  onSelectDay,
  onWeekChange,
}: SemanaGridProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null)

  const todayStr = formatDate(today)
  const selectedStr = formatDate(selectedDate)

  function prevWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    onWeekChange(getWeekStart(d))
  }

  function nextWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    onWeekChange(getWeekStart(d))
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      diff > 0 ? nextWeek() : prevWeek()
    }
    setTouchStart(null)
  }

  // Formatar cabeçalho da semana
  const weekLabel = (() => {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    const startMonth = weekStart.toLocaleString('pt-BR', { month: 'short' })
    const endMonth = end.toLocaleString('pt-BR', { month: 'short' })
    if (startMonth === endMonth) {
      return `${weekStart.getDate()} – ${end.getDate()} ${endMonth}`
    }
    return `${weekStart.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`
  })()

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div
      className="select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navegação de semana */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={prevWeek}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 cursor-pointer"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-sm font-medium text-gray-700 capitalize">{weekLabel}</span>
        <button
          onClick={nextWeek}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 cursor-pointer"
          aria-label="Próxima semana"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Grade de 7 colunas */}
      <div className="grid grid-cols-7 gap-0 px-2 pb-3">
        {days.map((day, idx) => {
          const dateStr = formatDate(day)
          const agendamentos = agendaCache[dateStr] ?? []
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedStr
          const maxDots = 3
          const visibleDots = agendamentos.slice(0, maxDots)
          const extraCount = agendamentos.length - maxDots

          // AC1: badge "!" para dias passados com agendamentos pendentes (Story 3.11)
          const isPast = dateStr < todayStr
          const hasPendente = agendamentos.some((ag) => ag.status === 'pendente')
          const showAlerta = isPast && hasPendente

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(day)}
              className="flex flex-col items-center gap-1 py-2 rounded-lg cursor-pointer active:bg-gray-100 transition-colors"
              aria-label={`${DIAS_SEMANA[idx]} ${day.getDate()}, ${agendamentos.length} agendamento${agendamentos.length !== 1 ? 's' : ''}${showAlerta ? ', visita pendente' : ''}`}
            >
              {/* Nome do dia */}
              <span className="text-xs text-gray-500 font-medium">{DIAS_SEMANA[idx]}</span>

              {/* Número do dia — com badge "!" se dia passado com pendente */}
              <span className="relative">
                <span
                  className={[
                    'w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors',
                    isSelected
                      ? 'bg-primary text-white'
                      : isToday
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-800',
                  ].join(' ')}
                >
                  {day.getDate()}
                </span>
                {showAlerta && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none"
                    aria-hidden="true"
                  >
                    !
                  </span>
                )}
              </span>

              {/* Dots por perfil RFM */}
              <div className="flex flex-col items-center gap-0.5 min-h-[28px]">
                {visibleDots.map((ag, di) => (
                  <span
                    key={di}
                    className={`w-2 h-2 rounded-full ${getDotColor(ag.perfil_rfm)}`}
                    aria-hidden="true"
                  />
                ))}
                {extraCount > 0 && (
                  <span className="text-[10px] text-gray-400 leading-none">+{extraCount}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
