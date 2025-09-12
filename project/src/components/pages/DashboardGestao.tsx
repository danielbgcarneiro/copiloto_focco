import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Users, LogOut, User, Shield, DollarSign, Target, Calendar, RefreshCw } from 'lucide-react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { getAllVendedores, VendedorProfile } from '../../lib/queries/vendedores' // Importar a nova função e tipo

// Tipos para os dados
interface MetricasExecutivas {
  vendasTotais: number
  vendasFaturadas: number
  vendasAFaturar: number
  clientesAtendidos: number
  atingimentoPercent: number
}

interface DadosSemana {
  semana: string
  vendas: number
  meta: number
  vendasAcumuladas: number
}

interface VendedorRanking {
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
  semana5?: number
  totalSemanal: number
}

const DashboardGestao: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1)
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())
  const [carregandoDados, setCarregandoDados] = useState(false)
  const [dashboardData, setDashboardData] = useState<any[]>([])
  const [vendasSemanais, setVendasSemanais] = useState<any[]>([])
  const [metasData, setMetasData] = useState<any[]>([])
  const [allVendedores, setAllVendedores] = useState<VendedorProfile[]>([]) // Novo estado para todos os vendedores

  const fetchDashboardData = async (ano: number, mes: number) => {
    setCarregandoDados(true);
    try {
      const { data: dashData, error: dashError } = await supabase
        .from('vw_gestao_historico_mensal')
        .select('*').eq('ano', ano).eq('mes', mes);
      setDashboardData(dashError ? [] : (dashData || []));
      if(dashError) console.error('Erro ao buscar vw_gestao_historico_mensal:', dashError);

      const { data: vendasData, error: vendasError } = await supabase
        .from('vendas_semanais')
        .select('*').eq('ano', ano).eq('mes', mes);
      setVendasSemanais(vendasError ? [] : (vendasData || []));
      if(vendasError) console.error('Erro ao buscar vendas_semanais:', vendasError);

      const { data: metas, error: metasError } = await supabase
        .from('metas_vendedores')
        .select('meta_valor').eq('ano', ano).eq('mes', mes);
      setMetasData(metasError ? [] : (metas || []));
      if(metasError) console.error('Erro ao buscar metas_vendedores:', metasError);

      // Buscar todos os vendedores
      const vendedores = await getAllVendedores();
      setAllVendedores(vendedores || []);

    } catch (error) {
      console.error('Erro geral ao buscar dados do dashboard:', error);
      setDashboardData([]);
      setVendasSemanais([]);
      setMetasData([]);
      setAllVendedores([]); // Limpar em caso de erro
    } finally {
      setCarregandoDados(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(anoAtual, mesAtual);
  }, [anoAtual, mesAtual]);

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const abreviarNumero = (valor: number) => {
    if (valor >= 1000000) return `${(valor / 1000000).toFixed(1)}M`;
    if (valor >= 1000) return `${(valor / 1000).toFixed(0)}K`;
    return valor.toString();
  }

  const metricas = useMemo<MetricasExecutivas>(() => {
    if (!dashboardData || dashboardData.length === 0) {
      return { vendasTotais: 0, vendasFaturadas: 0, vendasAFaturar: 0, clientesAtendidos: 0, atingimentoPercent: 0 };
    }
    const totais = dashboardData.reduce((acc, vendedor) => {
      acc.vendasTotais += vendedor.total_vendas || 0;
      acc.vendasFaturadas += vendedor.total_faturado || 0;
      acc.vendasAFaturar += vendedor.total_a_faturar || 0;
      acc.clientesAtendidos += vendedor.clientes_atendidos || 0;
      acc.metaTotal += vendedor.meta_mensal || 0;
      return acc;
    }, { vendasTotais: 0, vendasFaturadas: 0, vendasAFaturar: 0, clientesAtendidos: 0, metaTotal: 0 });
    const atingimentoGeral = totais.metaTotal > 0 ? (totais.vendasFaturadas / totais.metaTotal) * 100 : 0;
    return { ...totais, atingimentoPercent: atingimentoGeral };
  }, [dashboardData]);

  const dadosSemanas = useMemo<DadosSemana[]>(() => {
    const metaMensalTotal = metasData.reduce((sum, meta) => sum + (meta.meta_valor || 0), 0);
    const metaSemanal = metaMensalTotal / 4;

    const vendasPorSemana = vendasSemanais.reduce((acc, venda) => {
      const semana = venda.semana;
      if (!acc[semana]) acc[semana] = 0;
      acc[semana] += venda.valor_total || 0;
      return acc;
    }, {} as Record<number, number>);

    const semanasAbsolutasDoMes = [...new Set(vendasSemanais.map(v => v.semana))].sort((a, b) => a - b);
    let vendasAcumuladas = 0;
    const resultadoGrafico = [];

    for (let i = 0; i < 4; i++) {
      const semanaRelativa = i + 1;
      const semanaAbsoluta = semanasAbsolutasDoMes[i];
      const vendas = semanaAbsoluta ? (vendasPorSemana[semanaAbsoluta] || 0) : 0;
      vendasAcumuladas += vendas;

      resultadoGrafico.push({
        semana: `${semanaRelativa}ª Sem`,
        vendas: vendas,
        meta: metaSemanal * semanaRelativa,
        vendasAcumuladas: vendasAcumuladas
      });
    }

    return resultadoGrafico;
  }, [vendasSemanais, metasData]);

  const valorMaximoGrafico = useMemo(() => {
    if (!dadosSemanas || dadosSemanas.length === 0) return 100000;
    const maxValor = Math.max(...dadosSemanas.map(d => Math.max(d.vendas, d.meta, d.vendasAcumuladas)));
    return Math.ceil(maxValor * 1.1);
  }, [dadosSemanas]);

  const rankingVendedores = useMemo<VendedorRanking[]>(() => {
    return (dashboardData || []).map((vendedor: any) => ({
      nome: vendedor.vendedor_apelido,
      meta: vendedor.meta_mensal || 0,
      vendas: vendedor.total_vendas || 0,
      atingimento: vendedor.percentual_atingimento || 0,
      numeroClientes: vendedor.clientes_atendidos || 0
    })).sort((a, b) => b.vendas - a.vendas);
  }, [dashboardData]);

  const rankingSemanal = useMemo<VendedorRankingSemanal[]>(() => {
    console.log('DEBUG: Calculando rankingSemanal...');
    console.log('DEBUG: allVendedores:', allVendedores);
    console.log('DEBUG: vendasSemanais:', vendasSemanais);

    // Garantir que allVendedores esteja carregado
    if (!allVendedores || allVendedores.length === 0) {
      console.log('DEBUG: allVendedores está vazio, retornando array vazio para rankingSemanal.');
      return [];
    }

    const semanasDoMes = [...new Set(vendasSemanais.map(v => v.semana))].sort((a, b) => a - b);
    console.log('DEBUG: semanasDoMes (from vendasSemanais):', semanasDoMes);

    const mapaSemanasRelativas = semanasDoMes.reduce((acc, semana, index) => {
        acc[semana] = index + 1;
        return acc;
    }, {} as Record<number, number>);
    console.log('DEBUG: mapaSemanasRelativas:', mapaSemanasRelativas);

    // Iterar sobre todos os vendedores
    const result = allVendedores.map((vendedor) => {
      const vendasVendedor = vendasSemanais.filter((v: any) => v.codigo_vendedor === vendedor.cod_vendedor); // Corresponder por codigo_vendedor
      console.log(`DEBUG: Vendas para ${vendedor.apelido || vendedor.nome_completo}:`, vendasVendedor);

      const getVendasPorSemanaRelativa = (semanaRelativa: number) => {
        return vendasVendedor
          .filter(v => mapaSemanasRelativas[v.semana] === semanaRelativa)
          .reduce((sum, v) => sum + v.valor_total, 0);
      }

      const semana1 = getVendasPorSemanaRelativa(1);
      const semana2 = getVendasPorSemanaRelativa(2);
      const semana3 = getVendasPorSemanaRelativa(3);
      const semana4 = getVendasPorSemanaRelativa(4);
      const semana5 = getVendasPorSemanaRelativa(5);
      const totalSemanal = semana1 + semana2 + semana3 + semana4 + semana5;

      return { nome: vendedor.apelido || vendedor.nome_completo, semana1, semana2, semana3, semana4, semana5, totalSemanal };
    }).sort((a, b) => b.totalSemanal - a.totalSemanal);

    console.log('DEBUG: Resultado final do rankingSemanal:', result);
    return result;
  }, [vendasSemanais, allVendedores]); // Adicionar allVendedores às dependências

  useEffect(() => {
    if (!user) navigate('/login');
    else if (user.cargo !== 'diretor') navigate('/dashboard');
  }, [user, navigate]);

  const atualizarDados = () => fetchDashboardData(anoAtual, mesAtual);

  const meses = Array.from({ length: 12 }, (_, i) => ({ valor: i + 1, nome: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }) }));
  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow-lg">
        <div className="w-full sm:max-w-7xl sm:mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-14">
            <div className="flex items-center"><Shield className="h-5 w-5 mr-2" /><span className="text-sm font-medium hidden sm:inline">Gestão</span></div>
            <h1 className="text-base sm:text-lg font-bold">Dashboard Gestão</h1>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5"><User className="h-4 w-4" /><span className="text-xs sm:text-sm hidden sm:inline">{user?.apelido || 'Diretor'}</span></div>
              <button onClick={() => { logout(); navigate('/') }} className="p-2 sm:p-1.5 hover:bg-white/10 rounded-full"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full sm:max-w-7xl sm:mx-auto px-2 sm:px-6 lg:px-8 py-4 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Bem-vindo, {user?.apelido || 'Diretor'}</h2>
          <p className="text-sm sm:text-base text-gray-600">Painel executivo com visão geral de toda a operação</p>
        </div>

        {/* Seletor de Período */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Período</h3>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <select value={mesAtual} onChange={(e) => setMesAtual(Number(e.target.value))} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-0" disabled={carregandoDados}>{meses.map(m => <option key={m.valor} value={m.valor}>{m.nome.substring(0,3)}</option>)}</select>
              <select value={anoAtual} onChange={(e) => setAnoAtual(Number(e.target.value))} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-0" disabled={carregandoDados}>{anos.map(a => <option key={a} value={a}>{a}</option>)}</select>
              <button onClick={atualizarDados} disabled={carregandoDados} className="flex items-center justify-center p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><RefreshCw className={`h-4 w-4 ${carregandoDados ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>

        {/* Métricas Executivas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><p className="text-xs sm:text-sm text-gray-600 mb-1">Vendas Totais</p><p className="text-base sm:text-xl font-bold text-gray-900 truncate">R$ {formatarMoeda(metricas.vendasTotais)}</p></div><DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" /></div></div>
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><p className="text-xs sm:text-sm text-gray-600 mb-1">Faturadas</p><p className="text-base sm:text-xl font-bold text-blue-900 truncate">R$ {formatarMoeda(metricas.vendasFaturadas)}</p></div><BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" /></div></div>
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><p className="text-xs sm:text-sm text-gray-600 mb-1">A Faturar</p><p className="text-base sm:text-xl font-bold text-orange-900 truncate">R$ {formatarMoeda(metricas.vendasAFaturar)}</p></div><Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" /></div></div>
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><p className="text-xs sm:text-sm text-gray-600 mb-1">Clientes</p><p className="text-base sm:text-xl font-bold text-purple-900 truncate">{metricas.clientesAtendidos}</p></div><Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" /></div></div>
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><p className="text-xs sm:text-sm text-gray-600 mb-1">Atingimento</p><p className={`text-base sm:text-xl font-bold truncate ${metricas.atingimentoPercent >= 100 ? 'text-green-900' : 'text-red-900'}`}>{metricas.atingimentoPercent.toFixed(1)}%</p></div><Target className={`h-5 w-5 sm:h-6 sm:w-6 ${metricas.atingimentoPercent >= 100 ? 'text-green-500' : 'text-red-500'}`} /></div></div>
        </div>

        {/* Navegação Rápida para Módulos de Gestão */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Módulos de Gestão</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button onClick={() => navigate('/acumulado-ano')} className="flex items-center justify-center p-4 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition-colors">
              <Calendar className="h-5 w-5 mr-2" />
              Acumulado do Ano
            </button>
            <button onClick={() => navigate('/dashboard-rotas')} className="flex items-center justify-center p-4 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition-colors">
              <BarChart3 className="h-5 w-5 mr-2" />
              Dashboard Rotas
            </button>
            <button onClick={() => navigate('/top-clientes')} className="flex items-center justify-center p-4 bg-purple-500 text-white rounded-lg shadow hover:bg-purple-600 transition-colors">
              <Users className="h-5 w-5 mr-2" />
              Top Clientes
            </button>
          </div>
        </div>

        {/* Seletor de Período */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Período</h3>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <select value={mesAtual} onChange={(e) => setMesAtual(Number(e.target.value))} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-0" disabled={carregandoDados}>{meses.map(m => <option key={m.valor} value={m.valor}>{m.nome.substring(0,3)}</option>)}</select>
              <select value={anoAtual} onChange={(e) => setAnoAtual(Number(e.target.value))} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-0" disabled={carregandoDados}>{anos.map(a => <option key={a} value={a}>{a}</option>)}</select>
              <button onClick={atualizarDados} disabled={carregandoDados} className="flex items-center justify-center p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><RefreshCw className={`h-4 w-4 ${carregandoDados ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>

        {/* Performance Individual - Vendas */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mt-6 sm:mt-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Ranking Mensal</h3>
          <div className="space-y-4">
            {[...rankingVendedores].sort((a, b) => b.atingimento - a.atingimento).map((vendedor) => {
              const larguraBarra = Math.min(vendedor.atingimento, 100);
              return (
                <div key={vendedor.nome} className="flex items-center">
                  <div className="flex-shrink-0 w-32 text-sm font-medium text-gray-700 text-left mr-4 truncate" title={vendedor.nome}>{vendedor.nome}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div className="h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-bold" style={{ width: `${larguraBarra}%`, background: 'linear-gradient(to right, #3b82f6, #1e40af)' }}>
                      {vendedor.atingimento.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ranking de Vendedores */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mt-6 sm:mt-8">
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
                    <td className="py-2 sm:py-3 px-3 sm:px-4 text-right text-gray-700 text-xs sm:text-sm hidden sm:table-cell">R$ {formatarMoeda(vendedor.meta)}</td>
                    <td className="py-2 sm:py-3 px-3 sm:px-4 text-right font-semibold text-gray-900 text-xs sm:text-sm">R$ {formatarMoeda(vendedor.vendas)}</td>
                    <td className="py-2 sm:py-3 px-3 sm:px-4 text-right"><span className={`font-bold text-xs sm:text-sm ${vendedor.atingimento >= 100 ? 'text-green-600' : 'text-red-600'}`}>{vendedor.atingimento.toFixed(1)}%</span></td>
                    <td className="py-2 sm:py-3 px-3 sm:px-4 text-right text-gray-700 text-xs sm:text-sm hidden sm:table-cell">{vendedor.numeroClientes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico do Mês */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8 mt-6 sm:mt-8">
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
                    formatter={(value: number, name: string) => [`R$ ${formatarMoeda(value)}`, name]}
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
        </div>

        {/* Ranking Semanal */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mt-6 sm:mt-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Ranking Semanal</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Representante</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">1ª Sem</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">2ª Sem</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">3ª Sem</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">4ª Sem</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">5ª Sem</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {rankingSemanal.map((vendedor) => (
                  <tr key={vendedor.nome} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4"><span className="font-medium text-gray-900">{vendedor.nome}</span></td>
                    <td className="py-3 px-4 text-right text-gray-700">R$ {formatarMoeda(vendedor.semana1)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">R$ {formatarMoeda(vendedor.semana2)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">R$ {formatarMoeda(vendedor.semana3)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">R$ {formatarMoeda(vendedor.semana4)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{vendedor.semana5 ? `R$ ${formatarMoeda(vendedor.semana5)}` : '-'}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">R$ {formatarMoeda(vendedor.totalSemanal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  )
}

export default DashboardGestao