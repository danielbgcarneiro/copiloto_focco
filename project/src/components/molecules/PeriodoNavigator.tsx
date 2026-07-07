/**
 * Copiloto Focco Brasil
 * Molecule: PeriodoNavigator — navegação anterior/próximo para os filtros de período da Agenda
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  PeriodoAgendaDetalhe,
  getPeriodoDatesDetalhe,
  previousPeriodoRefDate,
  nextPeriodoRefDate,
} from '../../hooks/useGestaoAgenda'

interface PeriodoNavigatorProps {
  periodo: PeriodoAgendaDetalhe
  refDate: Date
  onChange: (novaData: Date) => void
}

const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MES_LONGO = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatLabel(periodo: PeriodoAgendaDetalhe, inicioIso: string, fimIso: string): string {
  const inicio = parseISO(inicioIso)
  const fim = parseISO(fimIso)

  if (periodo === 'semana') {
    const mesmoMes = inicio.getMonth() === fim.getMonth() && inicio.getFullYear() === fim.getFullYear()
    const dIni = `${inicio.getDate()}${mesmoMes ? '' : ` ${MES_ABREV[inicio.getMonth()]}`}`
    const dFim = `${fim.getDate()} ${MES_ABREV[fim.getMonth()]}`
    return `${dIni} – ${dFim}`
  }

  if (periodo === 'mes') {
    return `${MES_LONGO[fim.getMonth()]} ${fim.getFullYear()}`
  }

  // trimestre
  const mesmoAno = inicio.getFullYear() === fim.getFullYear()
  const iniLabel = mesmoAno ? MES_ABREV[inicio.getMonth()] : `${MES_ABREV[inicio.getMonth()]}/${inicio.getFullYear()}`
  return `${iniLabel} – ${MES_ABREV[fim.getMonth()]} ${fim.getFullYear()}`
}

export function PeriodoNavigator({ periodo, refDate, onChange }: PeriodoNavigatorProps) {
  const { inicio, fim, isAtual } = getPeriodoDatesDetalhe(periodo, refDate)
  const label = formatLabel(periodo, inicio, fim)

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(previousPeriodoRefDate(periodo, refDate))}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
        aria-label="Período anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex flex-col items-center min-w-[92px]">
        <span className="text-xs font-semibold text-gray-700 capitalize whitespace-nowrap">{label}</span>
        {!isAtual && (
          <button
            onClick={() => onChange(new Date())}
            className="text-[10px] text-primary hover:underline cursor-pointer"
          >
            Voltar para hoje
          </button>
        )}
      </div>

      <button
        onClick={() => onChange(nextPeriodoRefDate(periodo, refDate))}
        disabled={isAtual}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        aria-label="Próximo período"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
