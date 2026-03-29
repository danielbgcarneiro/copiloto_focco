/**
 * Copiloto Focco Brasil
 * Page: AgendaDia — visão do dia com forecast triplo (Story 3.7)
 *
 * AC1:  Rota /agenda/:data
 * AC2:  ForecastSemanaCard fixo no topo
 * AC3:  AgendamentoCard com dados de negócio por cliente
 * AC4:  Badge DSV
 * AC5:  Card com resultado registrado
 * AC6:  Tap → DetalhesCliente
 * AC7:  Botão "Registrar resultado" → RegistrarVisitaSheet
 * AC8:  Estado vazio
 * AC9:  useSetPage com data formatada + back → /agenda
 * AC10: Pendentes primeiro, depois com resultado; ordenados por DSV desc
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CalendarDays, Plus } from 'lucide-react'
import { useSetPage } from '../../contexts'
import { useAuth } from '../../contexts/AuthContext'
import { useVisitas, Visita } from '../../hooks/useVisitas'
import {
  AgendamentoDiaDetalhado,
  ForecastSemana,
  getAgendamentosDia,
  getForecastSemana,
  getWeekStart,
} from '../../hooks/useAgenda'
import { ForecastSemanaCard } from '../molecules/ForecastSemanaCard'
import { AgendamentoCard } from '../molecules/AgendamentoCard'
import { RegistrarVisitaSheet } from '../molecules/RegistrarVisitaSheet'
import { BuscarClienteSheet } from '../molecules/BuscarClienteSheet'

const DIAS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
]
const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

function formatarTituloData(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`
}

export default function AgendaDia() {
  const { data } = useParams<{ data: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const vendedorId = user?.id

  const titulo = data ? formatarTituloData(data) : 'Agenda'
  useSetPage(titulo, () => navigate('/agenda'))

  const [agendamentos, setAgendamentos] = useState<AgendamentoDiaDetalhado[]>([])
  const [forecast, setForecast] = useState<ForecastSemana | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetAg, setSheetAg] = useState<AgendamentoDiaDetalhado | null>(null)
  const [showBusca, setShowBusca] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // useVisitas fornece motivos e registrarVisita para o sheet
  const { motivos, loadingMotivos, carregarMotivos, registrarVisita } = useVisitas(
    sheetAg?.codigo_cliente ?? 0
  )

  useEffect(() => {
    if (!data || !vendedorId) return
    const weekStart = getWeekStart(new Date(data + 'T00:00:00'))

    setLoading(true)
    setError(null)

    Promise.all([
      getAgendamentosDia(data, vendedorId),
      getForecastSemana(weekStart, vendedorId),
    ])
      .then(([ags, fc]) => {
        setAgendamentos(ags)
        setForecast(fc)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      })
      .finally(() => setLoading(false))
  }, [data, vendedorId, refreshKey])

  // AC10: pendentes primeiro, com resultado depois; dentro de cada grupo por DSV desc
  const sorted = useMemo(() => {
    const pending = agendamentos.filter((a) => !a.visita_resultado)
    const done = agendamentos.filter((a) => a.visita_resultado)
    const byDsv = (list: AgendamentoDiaDetalhado[]) =>
      [...list].sort((a, b) => (b.dsv ?? 0) - (a.dsv ?? 0))
    return [...byDsv(pending), ...byDsv(done)]
  }, [agendamentos])

  function handleVisitaSuccess(visita: Visita) {
    setAgendamentos((prev) =>
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
    setSheetAg(null)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Forecast da semana fixo no topo (AC2) */}
      {forecast && (
        <ForecastSemanaCard
          planejado={forecast.planejado}
          oportunidade={forecast.oportunidade}
          metaSemana={forecast.metaSemana}
          realizado={forecast.realizado}
        />
      )}

      {/* Lista de agendamentos */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        ) : sorted.length === 0 ? (
          /* AC8: Estado vazio */
          <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
            <CalendarDays className="w-12 h-12 text-gray-200" />
            <p className="text-sm text-gray-400">Nenhuma visita agendada para este dia</p>
            <button
              onClick={() => setShowBusca(true)}
              className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-4 py-2 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar cliente
            </button>
          </div>
        ) : (
          <div className="px-4 py-4 flex flex-col gap-3 pb-6">
            {sorted.map((ag) => (
              <AgendamentoCard
                key={ag.id}
                ag={ag}
                onClick={() => navigate(`/clientes/detalhes/${ag.codigo_cliente}`)}
                onRegistrar={() => setSheetAg(ag)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB "+" — adicionar cliente à agenda deste dia (AC1 Story 3.8) */}
      <button
        onClick={() => setShowBusca(true)}
        className="fixed bottom-6 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center z-30 active:opacity-80 transition-opacity cursor-pointer"
        aria-label="Adicionar cliente"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Sheet de registro de resultado (AC7) */}
      {sheetAg && vendedorId && (
        <RegistrarVisitaSheet
          isOpen={!!sheetAg}
          onClose={() => setSheetAg(null)}
          onSuccess={handleVisitaSuccess}
          codigoCliente={sheetAg.codigo_cliente}
          vendedorId={vendedorId}
          rfmPerfil={sheetAg.perfil_rfm}
          rfmOportunidade={sheetAg.oportunidade_rfm}
          rfmDsv={sheetAg.dsv}
          motivos={motivos}
          loadingMotivos={loadingMotivos}
          carregarMotivos={carregarMotivos}
          registrarVisita={registrarVisita}
        />
      )}

      {/* Sheet de busca e agendamento (Story 3.8) */}
      {vendedorId && (
        <BuscarClienteSheet
          isOpen={showBusca}
          onClose={() => setShowBusca(false)}
          vendedorId={vendedorId}
          dataPreSelecionada={data}
          onSuccess={(dataAgendada) => {
            setShowBusca(false)
            // Se agendou para o dia atual da view, re-fetch a lista
            if (dataAgendada === data) {
              setRefreshKey((k) => k + 1)
            }
          }}
        />
      )}
    </div>
  )
}
