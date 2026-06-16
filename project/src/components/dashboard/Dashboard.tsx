/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getDashboardCompleto, type DashboardData, getPercentualMetaAnual, getMetaCorePecasMes } from '../../lib/queries/dashboard'
import { getVendedorRanking, type VendedorRanking, getOticasSemVendas180d } from '../../lib/queries/vendedores'
import { supabase } from '../../lib/supabase'
import { useSetPage } from '../../contexts'
import {
  LembreteHoje,
  MetricasCards,
  AcoesRapidas,
  TabelasPerfilSection,
  type AgendamentoLembrete,
} from './Dashboard.sections'

/** Ranking do vendedor é não-crítico: falha silenciosa retornando null. */
async function fetchVendedorRankingSafe(): Promise<VendedorRanking | null> {
  try {
    return await getVendedorRanking()
  } catch {
    return null
  }
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  useSetPage('Copiloto')
  
  // Estados para dados reais
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [vendedorRanking, setVendedorRanking] = useState<VendedorRanking | null>(null)
  const [oticasSemVendas180d, setOticasSemVendas180d] = useState<number | null>(null);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCarregando, setIsCarregando] = useState(false)
  const [filtroCidade, setFiltroCidade] = useState('');
  const [objAnualData, setObjAnualData] = useState<{ total_vendas_ano?: number; total_metas_ano?: number; percentual_anual?: number; clientes_atendidos_ano: number; } | null>(null);
  const [metaCorePecas, setMetaCorePecas] = useState<number>(0)

  // Popup lembrete do dia
  const [lembreteOpen, setLembreteOpen] = useState(false)
  const [agendamentosHoje, setAgendamentosHoje] = useState<AgendamentoLembrete[]>([])

  useEffect(() => {
    if (!user?.id) return
    const hoje = new Date().toISOString().split('T')[0]
    const fetchLembrete = async () => {
      try {
        const { data } = await supabase
          .from('agendamentos')
          .select('id, codigo_cliente, valor_previsto, tabela_clientes!agendamentos_codigo_cliente_fkey(nome_fantasia)')
          .eq('vendedor_id', user.id)
          .eq('status', 'pendente')
          .eq('data_agendada', hoje)
        const lista: AgendamentoLembrete[] = (data || []).map((a: any) => ({
          id: a.id,
          codigo_cliente: a.codigo_cliente,
          nome_fantasia: Array.isArray(a.tabela_clientes)
            ? a.tabela_clientes[0]?.nome_fantasia ?? `Cliente ${a.codigo_cliente}`
            : a.tabela_clientes?.nome_fantasia ?? `Cliente ${a.codigo_cliente}`,
          valor_previsto: a.valor_previsto,
        }))
        setAgendamentosHoje(lista)
        if (lista.length > 0) setLembreteOpen(true)
      } catch {
        // popup não é crítico — falha silenciosa
      }
    }
    fetchLembrete()
  }, [user?.id])

  // Carregar dados reais de clientes e dashboard do usuário logado
  useEffect(() => {
    async function carregarDados() {
      if (!user?.id || isCarregando) {
        return;
      }
      
      try {
        setIsCarregando(true);
        setLoading(true)
        setError(null)


        // Carregar dados completos do dashboard
        const now = new Date()
        const [dashboardCompleto, metaAnualData, semVendas180dData, metaCore] = await Promise.all([
          getDashboardCompleto(),
          getPercentualMetaAnual(now.getFullYear()),
          getOticasSemVendas180d(),
          getMetaCorePecasMes(now.getFullYear(), now.getMonth() + 1),
        ]);
        
        // Ranking do vendedor (não-blocking)
        const rankingVendedor = await fetchVendedorRankingSafe();

        setDashboardData(dashboardCompleto);
        setObjAnualData({
          ...metaAnualData, // Mantém os campos existentes de metaAnualData
          clientes_atendidos_ano: semVendas180dData?.clientesAtendidosAnoCount || 0, // Adiciona o novo campo
        });

        setOticasSemVendas180d(semVendas180dData?.count || 0);
        setVendedorRanking(rankingVendedor);
        setMetaCorePecas(metaCore)

        
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Erro desconhecido')
  setDashboardData(null)
        setVendedorRanking(null)
      } finally {
        setLoading(false)
        setIsCarregando(false);
      }
    }
    
    carregarDados();
  }, [user?.id])
  
  return (
    <div className="min-h-screen bg-gray-50">

      <LembreteHoje
        open={lembreteOpen}
        agendamentos={agendamentosHoje}
        onClose={() => setLembreteOpen(false)}
        onVerAgenda={() => { setLembreteOpen(false); navigate('/agenda') }}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Pessoal</h2>
            <p className="text-gray-600">Bem-vindo, {user?.apelido || user?.nome || user?.email || 'Usuário'}! Aqui estão suas métricas</p>
          </div>
        </div>

        <MetricasCards
          loading={loading}
          error={error}
          dashboardData={dashboardData}
          objAnualData={objAnualData}
          oticasSemVendas180d={oticasSemVendas180d}
          vendedorRanking={vendedorRanking}
          metaCorePecas={metaCorePecas}
        />

        <AcoesRapidas onNavigate={navigate} />

        <TabelasPerfilSection
          loading={loading}
          dashboardData={dashboardData}
          filtroCidade={filtroCidade}
          onFiltroChange={setFiltroCidade}
        />

      </main>
    </div>
  )
}

export default Dashboard