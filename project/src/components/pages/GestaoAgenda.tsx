/**
 * Copiloto Focco Brasil
 * Page: GestaoAgenda — visão geral de agenda e visitas (Story 3.13)
 *
 * AC1:  Aba "Agenda" no DashboardGestao
 * AC2:  Filtro Semana atual | Mês atual
 * AC3:  Card de resumo geral (totais da equipe)
 * AC4:  Lista de vendedores com KPIs
 * AC5:  Badge vermelho para vendedores sem visitas
 * AC6:  Tap → drilldown do vendedor (Story 3.14)
 * AC7:  Apenas gestor/diretor
 * AC8:  Skeleton loading
 */

import { useNavigate } from 'react-router-dom'
import { useGestaoAgenda, PeriodoAgenda } from '../../hooks/useGestaoAgenda'
import { ResumoEquipeCard } from '../molecules/ResumoEquipeCard'
import { VendedorAgendaCard } from '../molecules/VendedorAgendaCard'
import { useState } from 'react'

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-20 bg-gray-100 rounded-xl" />
      ))}
    </div>
  )
}

export default function GestaoAgenda() {
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState<PeriodoAgenda>('semana')
  const { kpis, resumo, loading, error } = useGestaoAgenda(periodo)

  return (
    <div className="px-4 py-4">
      {/* AC2: Filtro de período */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPeriodo('semana')}
          className={[
            'px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
            periodo === 'semana'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          ].join(' ')}
        >
          Semana atual
        </button>
        <button
          onClick={() => setPeriodo('mes')}
          className={[
            'px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
            periodo === 'mes'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          ].join(' ')}
        >
          Mês atual
        </button>
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          Erro ao carregar dados: {error}
        </div>
      ) : (
        <>
          {/* AC3: Resumo geral da equipe */}
          <ResumoEquipeCard resumo={resumo} />

          {/* AC4: Lista de vendedores */}
          <div className="flex flex-col gap-2">
            {kpis.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhum vendedor encontrado</p>
            ) : (
              kpis
                .sort((a, b) => b.visitasRealizadas - a.visitasRealizadas)
                .map((kpi) => (
                  <VendedorAgendaCard
                    key={kpi.vendedorId}
                    kpi={kpi}
                    onClick={() => navigate(`/gestao/agenda/vendedor/${kpi.vendedorId}`)}
                  />
                ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
