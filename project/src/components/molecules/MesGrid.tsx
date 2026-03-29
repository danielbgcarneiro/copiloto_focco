/**
 * Copiloto Focco Brasil
 * Molecule: MesGrid — grade calendário mensal com dots RFM (Story 3.12)
 *
 * AC2: Grade 5-6 linhas × 7 colunas, mês atual com navegação
 * AC3: Dots coloridos por perfil RFM (até 3 + "+N")
 * AC4: Swipe horizontal entre meses
 * AC5: Tap em dia com agendamentos → onSelectDay callback
 * AC6: Dia atual destacado (fundo primary)
 * AC7: Resumo abaixo da grade: "X visitas | R$ Y previsão"
 * AC8: Semana com 0 agendamentos → linha levemente destacada em cinza
 */

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AgendaCache, formatDate } from '../../hooks/useAgenda'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function getDotColor(perfil: string | null): string {
  switch (perfil?.toLowerCase()) {
    case 'ouro':   return 'bg-yellow-400'
    case 'prata':  return 'bg-gray-400'
    case 'bronze': return 'bg-orange-500'
    default:       return 'bg-blue-400'
  }
}

function getDaysInMonth(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const startPad = firstDay.getDay() // 0=Dom → sem padding, 1=Seg → 1 padding...
  const lastDayNum = new Date(year, month + 1, 0).getDate()
  const days: (Date | null)[] = Array(startPad).fill(null)
  for (let d = 1; d <= lastDayNum; d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

interface MesGridProps {
  year: number
  month: number
  agendaCache: AgendaCache
  today: Date
  onSelectDay: (date: Date) => void
  onMonthChange: (year: number, month: number) => void
}

export function MesGrid({ year, month, agendaCache, today, onSelectDay, onMonthChange }: MesGridProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const todayStr = formatDate(today)

  function prevMonth() {
    if (month === 0) onMonthChange(year - 1, 11)
    else onMonthChange(year, month - 1)
  }

  function nextMonth() {
    if (month === 11) onMonthChange(year + 1, 0)
    else onMonthChange(year, month + 1)
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      diff > 0 ? nextMonth() : prevMonth()
    }
    setTouchStart(null)
  }

  const days = getDaysInMonth(year, month)

  // Agrupar em semanas para AC8
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < days.length; i += 7) {
    const slice = days.slice(i, i + 7)
    while (slice.length < 7) slice.push(null)
    weeks.push(slice)
  }

  // AC7: totais do mês
  const lastDayNum = new Date(year, month + 1, 0).getDate()
  const monthStr = String(month + 1).padStart(2, '0')
  let totalAgendamentos = 0
  let totalPrevisao = 0
  for (let d = 1; d <= lastDayNum; d++) {
    const dateStr = `${year}-${monthStr}-${String(d).padStart(2, '0')}`
    const ags = agendaCache[dateStr] ?? []
    totalAgendamentos += ags.length
    totalPrevisao += ags.reduce((sum, ag) => sum + (ag.valor_previsto ?? 0), 0)
  }

  return (
    <div
      className="select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navegação de mês */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={prevMonth}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 cursor-pointer"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-sm font-semibold text-gray-700 capitalize">
          {MESES[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 cursor-pointer"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 px-2 pb-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grade de semanas */}
      <div className="px-2 pb-2 flex flex-col gap-0.5">
        {weeks.map((week, wi) => {
          // AC8: semana com 0 agendamentos → fundo cinza claro
          const weekHasAgs = week.some((day) => {
            if (!day) return false
            return (agendaCache[formatDate(day)] ?? []).length > 0
          })

          return (
            <div
              key={wi}
              className={`grid grid-cols-7 rounded-lg ${!weekHasAgs ? 'bg-gray-50' : ''}`}
            >
              {week.map((day, di) => {
                if (!day) {
                  return <div key={di} className="py-2" />
                }

                const dateStr = formatDate(day)
                const ags = agendaCache[dateStr] ?? []
                const isToday = dateStr === todayStr
                const maxDots = 3
                const visibleDots = ags.slice(0, maxDots)
                const extraCount = ags.length - maxDots
                const hasAgs = ags.length > 0

                return (
                  <button
                    key={di}
                    onClick={() => hasAgs && onSelectDay(day)}
                    disabled={!hasAgs}
                    className={[
                      'flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors',
                      hasAgs ? 'cursor-pointer active:bg-primary/10' : 'cursor-default',
                    ].join(' ')}
                    aria-label={`${day.getDate()}, ${ags.length} agendamento${ags.length !== 1 ? 's' : ''}`}
                  >
                    {/* AC6: dia atual destacado */}
                    <span
                      className={[
                        'w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold',
                        isToday
                          ? 'bg-primary text-white'
                          : hasAgs
                          ? 'text-gray-900'
                          : 'text-gray-400',
                      ].join(' ')}
                    >
                      {day.getDate()}
                    </span>

                    {/* AC3: dots coloridos */}
                    <div className="flex flex-col items-center gap-0.5 min-h-[18px]">
                      {visibleDots.map((ag, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${getDotColor(ag.perfil_rfm)}`}
                          aria-hidden="true"
                        />
                      ))}
                      {extraCount > 0 && (
                        <span className="text-[9px] text-gray-400 leading-none">+{extraCount}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* AC7: Resumo do mês */}
      <div className="mx-4 mb-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Este mês
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold text-gray-900">
            {totalAgendamentos}{' '}
            <span className="text-xs font-normal text-gray-500">
              {totalAgendamentos === 1 ? 'visita agendada' : 'visitas agendadas'}
            </span>
          </span>
          {totalPrevisao > 0 && (
            <>
              <span className="text-gray-200">|</span>
              <span className="text-sm font-bold text-blue-600">
                {fmt(totalPrevisao)}{' '}
                <span className="text-xs font-normal text-gray-500">previsão</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
