/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import React, { useState, useEffect, useMemo } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Users, DollarSign, Target, Calendar, RefreshCw, Menu, X, Home, MapPin, TrendingUp, GitBranch } from 'lucide-react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { getAllVendedores, VendedorProfile } from '../../lib/queries/vendedores'
import { Card, LoadingSpinner } from '../atoms'
import { formatCurrency } from '../../utils'
import { useSetPage } from '../../contexts'

// Tipos para os dados
interface MetricasExecutivas {
  vendasTotais: number
  vendasFaturadas: number
  vendasAFaturar: number
  clientesAtendidos: number
  clientesFaturados: number
  clientesAFaturar: number
  atingimentoPercent: number
  metaTotal: number
}

interface DadosSemana {
  semana: string
  vendas: number
  meta: number
  vendasAcumuladas: number
}

interface VendedorRankingGestao {
  nome: string
  meta: number
  vendas: number
  atingimento: number
  numeroClientes: number
}

interface VendedorRankingSemanal {
  nome: string
  semana1: number
  semana2: number
  semana3: number
  semana4: number
  totalSemanal: number
}


const DashboardGestao: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  useSetPage('Gestão')
  const [loading, setLoading] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1)
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())
  const [carregandoDados, setCarregandoDados] = useState(false)
  const [dashboardData, setDashboardData] = useState<any[]>([])
  const [vendasSemanais, setVendasSemanais] = useState<any[]>([])
  const [metasData, setMetasData] = useState<any[]>([])
  const [allVendedores, setAllVendedores] = useState<VendedorProfile[]>([])
  const [detailedClientCounts, setDetailedClientCounts] = useState({ faturados: 0, aberto: 0 });


  const fetchDashboardData = async (ano: number, mes: number) => {
    setCarregandoDados(true);
    try {
      console.log(`📥 [fetchDashboardData] Iniciando busca para ${mes}/${ano}`);

      // 1. Buscar dados históricos
      const { data: dashData, error: dashError } = await supabase
        .from('vw_gestao_historico_mensal')
        .select('*').eq('ano', ano).eq('mes', mes);
      setDashboardData(dashError ? [] : (dashData || []));
      if(dashError) console.error('Erro ao buscar vw_gestao_historico_mensal:', dashError);
      else console.log(`✅ vw_gestao_historico_mensal: ${dashData?.length || 0} registros`);

      // 2. Buscar vendas semanais (estrutura conforme ETL 08_vendas_semanais.py)
      const { data: vendasSemData, error: vendasSemError } = await supabase
        .from('vendas_semanais')
        .select('*')
        .eq('ano', ano).eq('mes', mes);

      if (!vendasSemError && vendasSemData && vendasSemData.length > 0) {
        console.log(`✅ vendas_semanais: ${vendasSemData.length} registros`, vendasSemData[0]);
        setVendasSemanais(vendasSemData);
      } else {
        if (vendasSemError) console.error('Erro vendas_semanais:', vendasSemError.message);
        else console.warn(`⚠️ vendas_semanais vazia para ${mes}/${ano}`);
        setVendasSemanais([]);
      }

      // 3. Buscar metas
      const { data: metas, error: metasError } = await supabase
        .from('metas_vendedores')
        .select('meta_valor').eq('ano', ano).eq('mes', mes);
      setMetasData(metasError ? [] : (metas || []));
      if(metasError) console.error('Erro ao buscar metas_vendedores:', metasError);
      else console.log(`✅ metas_vendedores: ${metas?.length || 0} registros`);

      // 4. Buscar TODOS os vendedores (IMPORTANTE: isso atualiza allVendedores)
      console.log(`📍 Buscando vendedores ANTES de atualizar estado...`);
      const vendedores = await getAllVendedores();
      console.log(`👥 getAllVendedores retornou:`, { count: vendedores?.length || 0, primeiro: vendedores?.[0] });
      setAllVendedores(vendedores || []);

      // Nova consulta para detailedClientCounts da tabela vendas_mes
      const startDate = new Date(ano, mes - 1, 1).toISOString();
      const endDate = new Date(ano, mes, 0).toISOString();
      const { data: vendasMesData, error: vendasMesError } = await supabase
        .from('vendas_mes')
        .select('qtd_clientes_faturados, qtd_clientes_aberto')
        .gte('mes_referencia', startDate)
        .lte('mes_referencia', endDate);

      if(vendasMesError) {
        console.error('Erro ao buscar detailedClientCounts de vendas_mes:', vendasMesError);
        setDetailedClientCounts({ faturados: 0, aberto: 0 });
      } else {
        const totalFaturados = vendasMesData.reduce((sum, item) => sum + (item.qtd_clientes_faturados || 0), 0);
        const totalAberto = vendasMesData.reduce((sum, item) => sum + (item.qtd_clientes_aberto || 0), 0);
        setDetailedClientCounts({ faturados: totalFaturados, aberto: totalAberto });
      }

    } catch (error) {
      console.error('Erro geral ao buscar dados do dashboard:', error);
      setDashboardData([]);
      setVendasSemanais([]);
      setMetasData([]);
      setAllVendedores([]);
      setDetailedClientCounts({ faturados: 0, aberto: 0 }); // Resetar também em caso de erro geral
    } finally {
      setCarregandoDados(false);
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchDashboardData(anoAtual, mesAtual);
  }, [anoAtual, mesAtual]);


  const abreviarNumero = (valor: number) => {
    if (valor >= 1000000) return `${(valor / 1000000).toFixed(1)}M`;
    if (valor >= 1000) return `${(valor / 1000).toFixed(0)}K`;
    return valor.toString();
  }

  const rankingSemanal = useMemo<VendedorRankingSemanal[]>(() => {
    if (!vendasSemanais || vendasSemanais.length === 0) {
      return [];
    }

    // Extrair número da semana: "1ª Semana" -> 1, "2ª Semana" -> 2, etc. (conforme ETL)
    const extrairNumSemana = (semana: string | number): number => {
      if (typeof semana === 'number') return semana;
      const match = String(semana).match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };

    // Agrupar por codigo_vendedor, somar valor_total por semana (ETL grava por dia)
    const porVendedor = new Map<string, { nome: string; semanas: Record<number, number> }>();

    vendasSemanais.forEach((v: any) => {
      if (Number(v.codigo_vendedor) === 1) return; // Filtrar FOCCO BRASIL
      const cod = String(v.codigo_vendedor);
      if (!porVendedor.has(cod)) {
        // Usar apelido do perfil se disponível, senão nome_vendedor do ETL
        const perfil = allVendedores.find(vd => Number(vd.cod_vendedor) === Number(v.codigo_vendedor));
        const nome = perfil?.apelido || perfil?.nome_completo || v.nome_vendedor || cod;
        porVendedor.set(cod, { nome, semanas: {} });
      }
      const entry = porVendedor.get(cod)!;
      const sem = extrairNumSemana(v.semana);
      const valor = Number(v.valor_total) || 0;
      entry.semanas[sem] = (entry.semanas[sem] || 0) + valor;
    });

    // Incluir vendedores ativos sem vendas no periodo
    allVendedores.forEach(vd => {
      const cod = String(vd.cod_vendedor);
      if (!porVendedor.has(cod)) {
        const nome = vd.apelido || vd.nome_completo || cod;
        porVendedor.set(cod, { nome, semanas: {} });
      }
    });

    return Array.from(porVendedor.values()).map(({ nome, semanas }) => {
      const semana1 = semanas[1] || 0;
      const semana2 = semanas[2] || 0;
      const semana3 = semanas[3] || 0;
      const semana4 = semanas[4] || 0;
      return { nome, semana1, semana2, semana3, semana4, totalSemanal: semana1 + semana2 + semana3 + semana4 };
    }).sort((a, b) => b.totalSemanal - a.totalSemanal);
  }, [vendasSemanais, allVendedores]);

  const metricas = useMemo<MetricasExecutivas>(() => {
    if (!dashboardData || dashboardData.length === 0) {
      return { vendasTotais: 0, vendasFaturadas: 0, vendasAFaturar: 0, clientesAtendidos: 0, clientesFaturados: 0, clientesAFaturar: 0, atingimentoPercent: 0, metaTotal: 0 };
    }
    const totais = dashboardData.reduce((acc, vendedor) => {
      acc.vendasTotais += vendedor.total_vendas || 0;
      acc.vendasFaturadas += vendedor.total_faturado || 0;
      acc.vendasAFaturar += vendedor.total_a_faturar || 0;
      acc.clientesAtendidos += vendedor.clientes_atendidos || 0;
      acc.metaTotal += vendedor.meta_mensal || 0;
      return acc;
    }, { vendasTotais: 0, vendasFaturadas: 0, vendasAFaturar: 0, clientesAtendidos: 0, metaTotal: 0 });

    // Card total inclui FOCCO BRASIL; ranking/grafico ja excluem (filtro no forEach)
    const vendasTotalDasSemanais = vendasSemanais.reduce((sum: number, v: any) => sum + (Number(v.valor_total) || 0), 0);
    if (vendasTotalDasSemanais > 0) {
      totais.vendasTotais = vendasTotalDasSemanais;
    }

    // Estas contagens específicas de clientes vêm do estado detailedClientCounts separado
    totais.clientesFaturados = detailedClientCounts.faturados;
    totais.clientesAFaturar = detailedClientCounts.aberto;

    const atingimentoGeral = totais.metaTotal > 0 ? (totais.vendasTotais / totais.metaTotal) * 100 : 0;
    return { ...totais, atingimentoPercent: atingimentoGeral };
  }, [dashboardData, detailedClientCounts, rankingSemanal, vendasSemanais]);

  const dadosSemanas = useMemo<DadosSemana[]>(() => {
    const metaMensalTotal = metasData.reduce((sum, meta) => sum + (meta.meta_valor || 0), 0);
    const metaSemanal = metaMensalTotal / 4;

    // 4 semanas conforme regra ETL (dias 1-7, 8-14, 15-21, 22+)
    const vendasPorSemana = [
      rankingSemanal.reduce((sum, v) => sum + v.semana1, 0),
      rankingSemanal.reduce((sum, v) => sum + v.semana2, 0),
      rankingSemanal.reduce((sum, v) => sum + v.semana3, 0),
      rankingSemanal.reduce((sum, v) => sum + v.semana4, 0),
    ];

    let vendasAcumuladas = 0;
    return vendasPorSemana.map((vendas, i) => {
      vendasAcumuladas += vendas;
      return {
        semana: `${i + 1}ª Sem`,
        vendas,
        meta: metaSemanal * (i + 1),
        vendasAcumuladas
      };
    });
  }, [metasData, rankingSemanal]);

  const valorMaximoGrafico = useMemo(() => {
    if (!dadosSemanas || dadosSemanas.length === 0) return 100000;
    const maxValor = Math.max(...dadosSemanas.map(d => Math.max(d.vendas, d.meta, d.vendasAcumuladas)));
    return Math.ceil(maxValor * 1.1);
  }, [dadosSemanas]);

  const rankingVendedores = useMemo<VendedorRankingGestao[]>(() => {
    const lista = (dashboardData || []).map((vendedor: any) => ({
      nome: vendedor.vendedor_apelido,
      meta: vendedor.meta_mensal || 0,
      vendas: vendedor.total_vendas || 0,
      atingimento: vendedor.percentual_atingimento || 0,
      numeroClientes: vendedor.clientes_atendidos || 0
    }));

    // Adicionar FOCCO BRASIL (cod=1) a partir de vendas_semanais
    const vendasFocco = (vendasSemanais || [])
      .filter((v: any) => Number(v.codigo_vendedor) === 1)
      .reduce((sum: number, v: any) => sum + (Number(v.valor_total) || 0), 0);
    if (vendasFocco > 0) {
      lista.push({ nome: 'Focco Brasil', meta: 0, vendas: vendasFocco, atingimento: 0, numeroClientes: 0 });
    }

    return lista.sort((a, b) => b.vendas - a.vendas);
  }, [dashboardData, vendasSemanais]);

  useEffect(() => {
    if (!user) navigate('/login');
    else if (user.cargo !== 'diretor') navigate('/dashboard');
  }, [user, navigate]);

  const atualizarDados = () => {
      fetchDashboardData(anoAtual, mesAtual);
      // fetchTabelasPerfil(); // Removido: função inexistente e não utilizada neste componente
  }

  const meses = Array.from({ length: 12 }, (_, i) => ({ valor: i + 1, nome: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }) }));
  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading) {
    return <LoadingSpinner size="md" fullPage />;
  }



  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="w-full sm:max-w-7xl sm:mx-auto px-2 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-14">
            <div className="absolute inset-y-0 left-0 flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              >
                <span className="sr-only">Abrir menu</span>
                {isMenuOpen ? <X className="block h-6 w-6" aria-hidden="true" /> : <Menu className="block h-6 w-6" aria-hidden="true" />}
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center md:items-stretch md:justify-start">
              <div className="hidden md:block">
                <div className="flex space-x-4">
                  <NavLink to="/gestao" end className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-sm font-medium ${ isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700' }`}><Home className="h-5 w-5 mr-2" />Visão Geral</NavLink>
                  <NavLink to="/gestao/metas-por-cliente" className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-sm font-medium ${ isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700' }`}><Target className="h-5 w-5 mr-2" />Metas por Cliente</NavLink>
                  <NavLink to="/gestao/acumulado-ano" className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-sm font-medium ${ isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700' }`}><Calendar className="h-5 w-5 mr-2" />Acumulado do Ano</NavLink>
                  <NavLink to="/gestao/analytics" className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-sm font-medium ${ isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700' }`}><TrendingUp className="h-5 w-5 mr-2" />Analytics</NavLink>
                  <NavLink to="/gestao/dashboard-rotas" className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-sm font-medium ${ isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700' }`}><MapPin className="h-5 w-5 mr-2" />Dashboard Rotas</NavLink>
                  <NavLink to="/gestao/top-clientes" className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-sm font-medium ${ isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700' }`}><Users className="h-5 w-5 mr-2" />Top Clientes</NavLink>
                  <NavLink to="/gestao/pipeline" className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-sm font-medium ${ isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700' }`}><GitBranch className="h-5 w-5 mr-2" />Pipeline</NavLink>
                </div>
              </div>
            </div>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <NavLink to="/gestao" end onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-base font-medium ${ isActive ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900' }`}><Home className="h-5 w-5 mr-2" />Visão Geral</NavLink>
              <NavLink to="/gestao/metas-por-cliente" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-base font-medium ${ isActive ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900' }`}><Target className="h-5 w-5 mr-2" />Metas por Cliente</NavLink>
              <NavLink to="/gestao/acumulado-ano" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-base font-medium ${ isActive ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900' }`}><Calendar className="h-5 w-5 mr-2" />Acumulado do Ano</NavLink>
              <NavLink to="/gestao/analytics" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-base font-medium ${ isActive ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900' }`}><TrendingUp className="h-5 w-5 mr-2" />Analytics</NavLink>
              <NavLink to="/gestao/dashboard-rotas" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-base font-medium ${ isActive ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900' }`}><MapPin className="h-5 w-5 mr-2" />Dashboard Rotas</NavLink>
              <NavLink to="/gestao/top-clientes" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-base font-medium ${ isActive ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900' }`}><Users className="h-5 w-5 mr-2" />Top Clientes</NavLink>
              <NavLink to="/gestao/pipeline" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-base font-medium ${ isActive ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900' }`}><GitBranch className="h-5 w-5 mr-2" />Pipeline</NavLink>
            </div>
          </div>
        )}
      </nav>

      <main className="w-full sm:max-w-7xl sm:mx-auto px-2 sm:px-6 lg:px-8 py-4 lg:py-8">
        {location.pathname === '/gestao' ? (
          <>
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Bem-vindo, {user?.apelido || 'Diretor'}</h2>
              <p className="text-sm sm:text-base text-gray-600">Painel executivo com visão geral de toda a operação</p>
            </div>

            <Card variant="default" padding="none" className="p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Período</h3>
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <select value={mesAtual} onChange={(e) => setMesAtual(Number(e.target.value))} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-0" disabled={carregandoDados}>{meses.map(m => <option key={m.valor} value={m.valor}>{m.nome.substring(0,3)}</option>)}</select>
                  <select value={anoAtual} onChange={(e) => setAnoAtual(Number(e.target.value))} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-0" disabled={carregandoDados}>{anos.map(a => <option key={a} value={a}>{a}</option>)}</select>
                  <button onClick={atualizarDados} disabled={carregandoDados} className="flex items-center justify-center p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><RefreshCw className={`h-4 w-4 ${carregandoDados ? 'animate-spin' : ''}`} /></button>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <Card variant="default" padding="none" className="p-4 sm:p-6"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><p className="text-xs sm:text-sm text-gray-600 mb-1">Vendas Totais</p><p className="text-base sm:text-xl font-bold text-gray-900 truncate">R$ {formatCurrency(metricas.vendasTotais)}</p><p className="text-xs text-gray-500 mt-1">Meta: R$ {formatCurrency(metricas.metaTotal || 0)}</p></div><DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" /></div></Card>
                <Card variant="default" padding="none" className="p-4 sm:p-6"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><p className="text-xs sm:text-sm text-gray-600 mb-1">Faturadas</p><p className="text-base sm:text-xl font-bold text-blue-900 truncate">R$ {formatCurrency(metricas.vendasFaturadas)}</p><p className="text-xs text-gray-500 mt-1">Clientes: {metricas.clientesFaturados}</p></div><BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" /></div></Card>
                <Card variant="default" padding="none" className="p-4 sm:p-6"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><p className="text-xs sm:text-sm text-gray-600 mb-1">A Faturar</p><p className="text-base sm:text-xl font-bold text-orange-900 truncate">R$ {formatCurrency(metricas.vendasAFaturar)}</p><p className="text-xs text-gray-500 mt-1">Clientes: {metricas.clientesAFaturar}</p></div><Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" /></div></Card>
                <Card variant="default" padding="none" className="p-4 sm:p-6"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><p className="text-xs sm:text-sm text-gray-600 mb-1">Clientes</p><p className="text-base sm:text-xl font-bold text-purple-900 truncate">{metricas.clientesAtendidos}</p></div><Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" /></div></Card>
                <Card variant="default" padding="none" className="p-4 sm:p-6"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><p className="text-xs sm:text-sm text-gray-600 mb-1">Atingimento</p><p className={`text-base sm:text-xl font-bold truncate ${metricas.atingimentoPercent >= 100 ? 'text-green-900' : 'text-red-900'}`}>{metricas.atingimentoPercent.toFixed(1)}%</p></div><Target className={`h-5 w-5 sm:h-6 sm:w-6 ${metricas.atingimentoPercent >= 100 ? 'text-green-500' : 'text-red-500'}`} /></div></Card>
            </div>

            <Card variant="default" padding="none" className="p-4 sm:p-6 mt-6 sm:mt-8">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Ranking Mensal</h3>
              <div className="space-y-4">
                {[...rankingVendedores].sort((a, b) => b.atingimento - a.atingimento).map((vendedor) => {
                  const larguraBarra = Math.min(vendedor.atingimento, 100);
                  return (
                    <div key={vendedor.nome} className="flex items-center">
                      <div className="flex-shrink-0 w-24 sm:w-32 text-sm font-medium text-gray-700 text-left mr-2 sm:mr-4 truncate" title={vendedor.nome}>{vendedor.nome}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${larguraBarra}%`,
                            background: 'linear-gradient(to right, #3b82f6, #1e40af)',
                          }}
                        >
                          {larguraBarra > 50 && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white text-xs font-bold">
                              {vendedor.atingimento.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        {larguraBarra <= 50 && (
                          <span
                            className="absolute top-1/2 -translate-y-1/2 text-primary text-xs font-bold"
                            style={{ left: `calc(${larguraBarra}% + 5px)` }}
                          >
                            {vendedor.atingimento.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card variant="default" padding="none" className="p-4 sm:p-6 mt-6 sm:mt-8">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Tabela Vendas Mensal</h3>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Vendedor</th>
                      <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 hidden sm:table-cell">Meta</th>
                      <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Vendas</th>
                      <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Ating.</th>
                      <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 hidden sm:table-cell">Clientes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingVendedores.map((vendedor) => (
                      <tr key={vendedor.nome} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 sm:py-3 px-3 sm:px-4"><span className="font-medium text-gray-900 text-xs sm:text-base">{vendedor.nome.split(' ')[0]}</span></td>
                        <td className="py-2 sm:py-3 px-3 sm:px-4 text-right text-gray-700 text-xs sm:text-sm hidden sm:table-cell">R$ {formatCurrency(vendedor.meta)}</td>
                        <td className="py-2 sm:py-3 px-3 sm:px-4 text-right font-semibold text-gray-900 text-xs sm:text-sm">R$ {formatCurrency(vendedor.vendas)}</td>
                        <td className="py-2 sm:py-3 px-3 sm:px-4 text-right"><span className={`font-bold text-xs sm:text-sm ${vendedor.atingimento >= 100 ? 'text-green-600' : 'text-red-600'}`}>{vendedor.atingimento.toFixed(1)}%</span></td>
                        <td className="py-2 sm:py-3 px-3 sm:px-4 text-right text-gray-700 text-xs sm:text-sm hidden sm:table-cell">{vendedor.numeroClientes}</td>
                      </tr>
                    ))}
                    {rankingVendedores.length > 0 && (
                      <tr className="border-t-2 border-gray-300 bg-gray-50 hover:bg-gray-50">
                        <td className="py-3 sm:py-4 px-3 sm:px-4"><span className="font-bold text-gray-900 text-xs sm:text-base">Total</span></td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right font-bold text-gray-900 text-xs sm:text-sm hidden sm:table-cell">R$ {formatCurrency(rankingVendedores.reduce((sum, v) => sum + v.meta, 0))}</td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right font-bold text-gray-900 text-xs sm:text-sm">R$ {formatCurrency(rankingVendedores.reduce((sum, v) => sum + v.vendas, 0))}</td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right"><span className="font-bold text-xs sm:text-sm text-blue-600">{(rankingVendedores.reduce((sum, v) => sum + v.vendas, 0) / rankingVendedores.reduce((sum, v) => sum + v.meta, 0) * 100).toFixed(1)}%</span></td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right font-bold text-gray-900 text-xs sm:text-sm hidden sm:table-cell">{rankingVendedores.reduce((sum, v) => sum + v.numeroClientes, 0)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card variant="default" padding="none" className="p-6 mb-8 mt-6 sm:mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Semanal</h3>
              <div className="h-80">
                {dadosSemanas.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dadosSemanas}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(value) => `R$ ${abreviarNumero(value)}`} tick={{ fontSize: 12 }} domain={[0, valorMaximoGrafico]} />
                      <Tooltip
                        contentStyle={{
                          fontSize: '12px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          border: '1px solid #e5e7eb'
                        }}
                        formatter={(value: number, name: string) => [`R$ ${formatCurrency(value)}`, name]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="vendasAcumuladas" name="Vendas Acumuladas" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                      <Bar dataKey="vendas" name="Vendas da Semana" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="meta" name="Meta Acumulada" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">Sem dados de vendas semanais para o período selecionado.</div>
                )}
              </div>
            </Card>

            <Card variant="default" padding="none" className="p-4 sm:p-6 mt-6 sm:mt-8">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Ranking Semanal</h3>
              <div className="overflow-x-auto">
                  <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left p-2 text-xs font-semibold text-gray-600 sm:px-4 sm:text-sm">
                        <span className="hidden sm:inline">Representante</span>
                        <span className="sm:hidden">Repr.</span>
                      </th>
                      <th className="text-right p-1 text-xs font-semibold text-gray-600 sm:px-4 sm:text-sm">
                        <span className="hidden sm:inline">1ª Sem</span>
                        <span className="sm:hidden">S1</span>
                      </th>
                      <th className="text-right p-1 text-xs font-semibold text-gray-600 sm:px-4 sm:text-sm">
                        <span className="hidden sm:inline">2ª Sem</span>
                        <span className="sm:hidden">S2</span>
                      </th>
                      <th className="text-right p-1 text-xs font-semibold text-gray-600 sm:px-4 sm:text-sm">
                        <span className="hidden sm:inline">3ª Sem</span>
                        <span className="sm:hidden">S3</span>
                      </th>
                      <th className="text-right p-1 text-xs font-semibold text-gray-600 sm:px-4 sm:text-sm">
                        <span className="hidden sm:inline">4ª Sem</span>
                        <span className="sm:hidden">S4</span>
                      </th>
                      <th className="text-right p-2 text-xs font-semibold text-gray-600 sm:px-4 sm:text-sm">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingSemanal.map((vendedor) => (
                      <tr key={vendedor.nome} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-2 whitespace-nowrap text-xs sm:text-sm sm:px-4">
                          <span className="font-medium text-gray-900">{vendedor.nome}</span>
                        </td>
                        <td className="p-1 text-right text-gray-700 text-xs sm:text-sm sm:px-4">
                          <span className="sm:hidden">{abreviarNumero(vendedor.semana1)}</span>
                          <span className="hidden sm:inline">R$ {formatCurrency(vendedor.semana1)}</span>
                        </td>
                        <td className="p-1 text-right text-gray-700 text-xs sm:text-sm sm:px-4">
                          <span className="sm:hidden">{abreviarNumero(vendedor.semana2)}</span>
                          <span className="hidden sm:inline">R$ {formatCurrency(vendedor.semana2)}</span>
                        </td>
                        <td className="p-1 text-right text-gray-700 text-xs sm:text-sm sm:px-4">
                          <span className="sm:hidden">{abreviarNumero(vendedor.semana3)}</span>
                          <span className="hidden sm:inline">R$ {formatCurrency(vendedor.semana3)}</span>
                        </td>
                        <td className="p-1 text-right text-gray-700 text-xs sm:text-sm sm:px-4">
                          <span className="sm:hidden">{abreviarNumero(vendedor.semana4)}</span>
                          <span className="hidden sm:inline">R$ {formatCurrency(vendedor.semana4)}</span>
                        </td>
                        <td className="p-2 text-right font-semibold text-gray-900 text-xs sm:text-sm sm:px-4">
                          <span className="sm:hidden">{abreviarNumero(vendedor.totalSemanal)}</span>
                          <span className="hidden sm:inline">R$ {formatCurrency(vendedor.totalSemanal)}</span>
                        </td>
                      </tr>
                    ))}
                    {rankingSemanal.length > 0 && (
                      <tr className="border-t-2 border-gray-300 bg-gray-50 hover:bg-gray-50">
                        <td className="p-2 whitespace-nowrap text-xs sm:text-sm sm:px-4">
                          <span className="font-bold text-gray-900">Total</span>
                        </td>
                        <td className="p-1 text-right text-gray-700 text-xs sm:text-sm sm:px-4">
                          <span className="sm:hidden">{abreviarNumero(rankingSemanal.reduce((sum, v) => sum + v.semana1, 0))}</span>
                          <span className="hidden sm:inline font-bold">R$ {formatCurrency(rankingSemanal.reduce((sum, v) => sum + v.semana1, 0))}</span>
                        </td>
                        <td className="p-1 text-right text-gray-700 text-xs sm:text-sm sm:px-4">
                          <span className="sm:hidden">{abreviarNumero(rankingSemanal.reduce((sum, v) => sum + v.semana2, 0))}</span>
                          <span className="hidden sm:inline font-bold">R$ {formatCurrency(rankingSemanal.reduce((sum, v) => sum + v.semana2, 0))}</span>
                        </td>
                        <td className="p-1 text-right text-gray-700 text-xs sm:text-sm sm:px-4">
                          <span className="sm:hidden">{abreviarNumero(rankingSemanal.reduce((sum, v) => sum + v.semana3, 0))}</span>
                          <span className="hidden sm:inline font-bold">R$ {formatCurrency(rankingSemanal.reduce((sum, v) => sum + v.semana3, 0))}</span>
                        </td>
                        <td className="p-1 text-right text-gray-700 text-xs sm:text-sm sm:px-4">
                          <span className="sm:hidden">{abreviarNumero(rankingSemanal.reduce((sum, v) => sum + v.semana4, 0))}</span>
                          <span className="hidden sm:inline font-bold">R$ {formatCurrency(rankingSemanal.reduce((sum, v) => sum + v.semana4, 0))}</span>
                        </td>
                        <td className="p-2 text-right text-gray-900 text-xs sm:text-sm sm:px-4">
                          <span className="sm:hidden font-bold">{abreviarNumero(rankingSemanal.reduce((sum, v) => sum + v.totalSemanal, 0))}</span>
                          <span className="hidden sm:inline font-bold">R$ {formatCurrency(rankingSemanal.reduce((sum, v) => sum + v.totalSemanal, 0))}</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  )
}

export default DashboardGestao