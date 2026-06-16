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
import { useSetPage } from '../../contexts'
import { useAuth } from '../../contexts/AuthContext'
import {
  useAgenda,
  getWeekStart,
  formatDate,
  AgendamentoDiaDetalhado,
  getAgendamentosDia,
  getForecastMes,
} from '../../hooks/useAgenda'
import { useVisitas, Visita } from '../../hooks/useVisitas'
import { useSugestoesAgenda } from '../../hooks/useSugestoesAgenda'
import { RegistrarVisitaSheet } from '../molecules/RegistrarVisitaSheet'
import { AgendaTotalizacaoItem } from '../molecules/AgendaTotalizacaoCard'
import { BuscarClienteSheet } from '../molecules/BuscarClienteSheet'
import { SugestoesAgendaSheet } from '../molecules/SugestoesAgendaSheet'
import { PlanejarRotaSheet } from '../molecules/PlanejarRotaSheet'
import { hasAgendamentosSemResultado } from '../../utils/alertasAgenda'
import { usePlanejamentoRota } from '../../hooks/usePlanejamentoRota'
import {
  AgendaStatusBar,
  AgendaViewToggle,
  SugestoesBanner,
  VisitasSemResultadoBanner,
  AgendaDiaView,
  AgendaSemanaView,
  AgendaMesView,
  AgendaFab,
} from './Agenda.sections'

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
  const [errorDia, setErrorDia] = useState<string | null>(null)
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
  const [showPlanejarRota, setShowPlanejarRota] = useState(false)
  const [fabExpanded, setFabExpanded] = useState(false)

  const hookPlano = usePlanejamentoRota(vendedorId)

  // Carregar planos ativos para o indicador no SemanaGrid
  useEffect(() => {
    if (vendedorId) hookPlano.buscarPlanosAtivos()
  }, [vendedorId, refreshKey])

  const { sugestoes, rotasSugestoes, loading: loadingSugestoes, carregar: carregarSugestoes } = useSugestoesAgenda(vendedorId)

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
    setErrorDia(null)
    getAgendamentosDia(formatDate(selectedDate), vendedorId)
      .then((ags) => {
        const pending = ags.filter((a) => !a.visita_resultado)
        const done = ags.filter((a) => a.visita_resultado)
        const byDsv = (list: AgendamentoDiaDetalhado[]) =>
          [...list].sort((a, b) => (b.dsv ?? 0) - (a.dsv ?? 0))
        setAgsDia([...byDsv(pending), ...byDsv(done)])
      })
      .catch((err) => {
        console.error('[Agenda] Erro ao buscar agendamentos do dia:', err)
        setErrorDia('Não foi possível carregar os agendamentos. Verifique sua conexão.')
      })
      .finally(() => setLoadingDia(false))
  }, [vendedorId, selectedDate, refreshKey])

  // Meta e realizado do mês visualizado
  useEffect(() => {
    if (!vendedorId) return
    getForecastMes(viewMonth.year, viewMonth.month + 1, vendedorId)
      .then(({ metaMes: m, realizadoMes: r }) => {
        setMetaMes(m)
        setRealizadoMes(r)
      })
      .catch((err) => {
        console.error('[Agenda] Erro ao buscar meta/realizado do mês:', err)
      })
    // refreshKey: meta/realizado deve reagir a criar/editar agendamento (igual ao dia)
  }, [vendedorId, viewMonth.year, viewMonth.month, refreshKey])

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
      <AgendaStatusBar isOffline={isOffline} loading={loading} />

      <AgendaViewToggle
        view={view}
        onViewChange={setView}
        isToday={isToday}
        onHoje={() => {
          const d = new Date()
          d.setHours(0, 0, 0, 0)
          setSelectedDate(d)
          setWeekStart(getWeekStart(d))
          setView('dia')
        }}
      />

      {agendamentosThisWeek < 5 && sugestoes.length > 0 && (
        <SugestoesBanner count={sugestoes.length} onClick={() => setShowSugestoes(true)} />
      )}

      {visitasSemResultado > 0 && <VisitasSemResultadoBanner count={visitasSemResultado} />}

      {view === 'dia' && (
        <AgendaDiaView
          weekStart={weekStart}
          selectedDate={selectedDate}
          today={today}
          cache={cache}
          onSelectDay={handleSelectDay}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          diaLabel={diaLabel}
          loadingDia={loadingDia}
          agsDia={agsDia}
          error={error}
          errorDia={errorDia}
          itemsDia={itemsDia}
          metaMes={metaMes}
          realizadoMes={realizadoMes}
          onRegistrar={(id) => {
            const ag = agsDia.find((a) => a.id === id)
            if (ag) setSheetAg(ag)
          }}
          onClienteClick={(codigoCliente) => navigate(`/clientes/detalhes/${codigoCliente}`)}
        />
      )}

      {view === 'semana' && (
        <AgendaSemanaView
          weekStart={weekStart}
          cache={cache}
          selectedDate={selectedDate}
          today={today}
          onSelectDay={handleSelectDay}
          onWeekChange={handleWeekChange}
          planosAtivos={hookPlano.planosAtivos}
          itemsSemana={itemsSemana}
          metaMes={metaMes}
          realizadoMes={realizadoMes}
          onClienteClick={(codigoCliente) => navigate(`/clientes/detalhes/${codigoCliente}`)}
        />
      )}

      {view === 'mes' && (
        <AgendaMesView
          viewMonth={viewMonth}
          cache={cache}
          today={today}
          onSelectDay={handleSelectDay}
          onMonthChange={(year, month) => setViewMonth({ year, month })}
          itemsMes={itemsMes}
          metaMes={metaMes}
          realizadoMes={realizadoMes}
        />
      )}

      <AgendaFab
        expanded={fabExpanded}
        onToggle={() => setFabExpanded((v) => !v)}
        onPlanejarRota={() => { setFabExpanded(false); setShowPlanejarRota(true) }}
        onAgendarCliente={() => { setFabExpanded(false); setShowBusca(true) }}
      />

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
          rotasSugestoes={rotasSugestoes}
          onSuccess={(dataAgendada) => {
            // Sheet retorna sozinho à lista de clientes; apenas invalida cache e recarrega
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

      {vendedorId && (
        <PlanejarRotaSheet
          isOpen={showPlanejarRota}
          vendedorId={vendedorId}
          onClose={() => setShowPlanejarRota(false)}
          onSuccess={(datasAgendadas) => {
            setShowPlanejarRota(false)
            datasAgendadas.forEach((d) => invalidateWeek(new Date(d + 'T00:00:00')))
            hookPlano.buscarPlanosAtivos()
            setRefreshKey((k) => k + 1)
          }}
        />
      )}
    </div>
  )
}
