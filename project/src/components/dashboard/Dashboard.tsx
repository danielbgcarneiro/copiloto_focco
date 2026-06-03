/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Target, Map as MapIcon, Building, AlertTriangle, ClipboardList, Search, X as XIcon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getDashboardCompleto, type DashboardData, getPercentualMetaAnual, getMetaCorePecasMes } from '../../lib/queries/dashboard'
import { getVendedorRanking, type VendedorRanking, getOticasSemVendas180d } from '../../lib/queries/vendedores'
import TabelaPerfil from './TabelaPerfil'
import { Card } from '../atoms'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils'
import { useSetPage } from '../../contexts'

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
  interface AgendamentoLembrete {
    id: string
    codigo_cliente: number
    nome_fantasia: string
    valor_previsto: number | null
  }
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
        
        // Tentar carregar ranking do vendedor separadamente (não-blocking)
        let rankingVendedor = null;
        
        try {
          rankingVendedor = await getVendedorRanking();
        } catch {
          // ranking não-crítico, continua sem ele
        }

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

      {/* Popup Lembrete do Dia */}
      {lembreteOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div
            className="w-full max-w-lg bg-white rounded-t-2xl shadow-xl p-4 pb-6"
            style={{ animation: 'slideUp 0.25s ease-out' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-gray-800">Agenda de Hoje</h3>
                <p className="text-xs text-gray-500">
                  {agendamentosHoje.length} agendamento{agendamentosHoje.length !== 1 ? 's' : ''} pendente{agendamentosHoje.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => setLembreteOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {agendamentosHoje.map(ag => (
                <li key={ag.id} className="flex items-center justify-between rounded-lg bg-sky-50 border border-sky-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 truncate max-w-[220px]">{ag.nome_fantasia}</p>
                    <p className="text-xs text-gray-500">Cód. {ag.codigo_cliente}</p>
                  </div>
                  {ag.valor_previsto != null && ag.valor_previsto > 0 && (
                    <span className="text-xs font-semibold text-sky-700 ml-2 flex-shrink-0">
                      {formatCurrency(ag.valor_previsto, true)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => { setLembreteOpen(false); navigate('/agenda') }}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
              >
                Ver Agenda
              </button>
              <button
                onClick={() => setLembreteOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Pessoal</h2>
            <p className="text-gray-600">Bem-vindo, {user?.apelido || user?.nome || user?.email || 'Usuário'}! Aqui estão suas métricas</p>
          </div>
        </div>

        {/* Cards de Métricas */}
        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-8">
            <Card variant="default" padding="none" className="col-span-3 md:col-span-1 p-4">
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded mb-2 w-1/2"></div>
                <div className="h-7 bg-gray-200 rounded mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4"></div>
              </div>
            </Card>
            {[...Array(3)].map((_, i) => (
              <Card key={i} variant="default" padding="none" className="p-3">
                <div className="animate-pulse">
                  <div className="h-2 bg-gray-200 rounded mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-600 text-sm">Erro ao carregar métricas: {error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-8">
            {/* Vendas do Mês — hero card: largura total no mobile, 1 col no desktop */}
            <Card variant="default" padding="none" className="col-span-3 md:col-span-1 p-4 relative">
              <div className="absolute top-3 right-3">
                <div className="bg-blue-50 p-2 rounded-full">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="pr-12">
                <p className="text-xs font-medium text-gray-600">Vendas do Mês</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {dashboardData?.metricas ? formatCurrency(dashboardData.metricas.vendas_mes || 0) : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Obj OB+PW: {dashboardData?.metricas ? formatCurrency(dashboardData.metricas.meta_mes || 0) : 'N/A'} | {dashboardData?.metricas ? `${(dashboardData.metricas.percentual_meta || 0).toFixed(1)}%` : 'N/A'}
                </p>
                {metaCorePecas > 0 && (
                  <p className="text-xs text-blue-600 mt-0.5">
                    Core: {metaCorePecas} pç (obj mês)
                  </p>
                )}
              </div>
            </Card>

            {/* Óticas Positivadas — compacto */}
            <Card variant="default" padding="none" className="p-3">
              <div className="flex items-center gap-1 mb-1">
                <Building className="h-3 w-3 text-green-600 flex-shrink-0" />
                <p className="text-[10px] font-medium text-gray-600 leading-tight">Positivadas</p>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {dashboardData?.metricas?.oticas_positivadas || 0}
              </p>
              <p className="text-[10px] text-gray-400">óticas</p>
            </Card>

            {/* Objetivo Anual — compacto */}
            <Card variant="default" padding="none" className="p-3">
              <div className="flex items-center gap-1 mb-1">
                <Target className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                <p className="text-[10px] font-medium text-gray-600 leading-tight">Obj Anual</p>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {objAnualData?.percentual_anual ? `${objAnualData.percentual_anual.toFixed(1)}%` : 'N/A'}
              </p>
              <p className="text-[10px] text-gray-400 hidden md:block">
                {objAnualData?.total_metas_ano ? formatCurrency(objAnualData.total_metas_ano) : ''}
              </p>
            </Card>

            {/* Sem Vendas +180d — compacto */}
            <Card variant="default" padding="none" className="p-3">
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                <p className="text-[10px] font-medium text-gray-600 leading-tight">+180-DSV</p>
              </div>
              <p className="text-lg font-bold text-red-600">
                {oticasSemVendas180d || 0}
              </p>
              <p className="text-[10px] text-gray-400 hidden md:block">
                De {vendedorRanking?.total_clientes || 0} clientes
              </p>
              <p className="text-[10px] text-gray-400 md:hidden">óticas</p>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <button 
              onClick={() => navigate('/meus-pedidos')}
              className="bg-green-600 text-white p-2 sm:px-4 sm:py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span>Pedidos</span>
            </button>
            <button 
              onClick={() => navigate('/rotas')}
              className="bg-primary text-white p-2 sm:px-4 sm:py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center"
            >
              <MapIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span>Rotas</span>
            </button>
            <button 
              onClick={() => navigate('/inadimplentes')}
              className="bg-red-600 text-white p-2 sm:px-4 sm:py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
            >
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span>Inadimplentes</span>
            </button>
        </div>

        {/* Tabelas de Perfil - Ouro, Prata, Bronze */}
        {!loading && dashboardData?.tabelasPerfil && (
          <div className="space-y-6 mt-12">
            <div className="my-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Filtrar por Cidade/UF..."
                        value={filtroCidade}
                        onChange={(e) => setFiltroCidade(e.target.value)}
                        className="w-full pl-10 pr-4 py-1 border rounded-lg text-sm shadow-sm"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {dashboardData.tabelasPerfil.map((tabela) => (
                <TabelaPerfil key={tabela.perfil} dados={tabela} filtroCidade={filtroCidade} />
              ))}
            </div>
          </div>
        )}
        
      </main>
    </div>
  )
}

export default Dashboard