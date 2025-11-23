import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Target, User, LogOut, Map as MapIcon, Building, AlertTriangle, ClipboardList, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getDashboardCompleto, formatarMoeda, type DashboardData, type TabelaPerfil as TabelaPerfilType, getPercentualMetaAnual } from '../../lib/queries/dashboard'
import { getVendedorRanking, type VendedorRanking, getOticasSemVendas180d } from '../../lib/queries/vendedores'
import { TestViews } from '../../utils/test-views'
import TabelaPerfil from './TabelaPerfil'
import '../../styles/dashboard.css'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  // Estados para dados reais
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [vendedorRanking, setVendedorRanking] = useState<VendedorRanking | null>(null)
  const [oticasSemVendas180d, setOticasSemVendas180d] = useState<number | null>(null);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCarregando, setIsCarregando] = useState(false)
  const [showTestViews, setShowTestViews] = useState(false)
  const [filtroCidade, setFiltroCidade] = useState('');
  const [objAnualData, setObjAnualData] = useState<{ total_vendas_ano: number; total_metas_ano: number; percentual_anual: number; clientes_atendidos_ano: number; } | null>(null);
  
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
        console.log('🔍 Carregando dados do dashboard para usuário:', {
          userId: user?.id,
          email: user?.email,
          cargo: user?.cargo
        });
        
        // Carregar dados completos do dashboard
        const [dashboardCompleto, metaAnualData, semVendas180dData] = await Promise.all([
          getDashboardCompleto(),
          getPercentualMetaAnual(new Date().getFullYear()),
          getOticasSemVendas180d()
        ]);
        
        // Tentar carregar ranking do vendedor separadamente (não-blocking)
        let rankingVendedor = null;
        
        try {
          rankingVendedor = await getVendedorRanking();
        } catch (vendedorError) {
          console.warn('⚠️ Não foi possível carregar dados do vendedor:', vendedorError);
        }
        
        console.log('✅ Dados completos carregados:', {
          dashboard: {
            metricas: dashboardCompleto.metricas,
            cidadesCount: dashboardCompleto.top10Cidades.length,
            rotasCount: dashboardCompleto.rankingRotas.length
          },
          vendedorRanking: rankingVendedor,
          oticasSemVendas180d: semVendas180dData?.count
        });

        // Verificar se há dados suficientes
        if (dashboardCompleto.top10Cidades.length === 0 && 
            dashboardCompleto.rankingRotas.length === 0) {
          console.warn('⚠️ Nenhum dado encontrado - possível problema com RLS');
        }

        // Mock temporário para desenvolvimento: quando o usuário for o vendedor
        // Misterclaudio (id '16') e não houver dados nos perfis, injetamos um
        // exemplo de 1 linha para facilitar testes locais.
        try {
          if (process.env.NODE_ENV === 'development' && user?.id === '16') {
            const hasPerfilData = Array.isArray(dashboardCompleto.tabelasPerfil) &&
              dashboardCompleto.tabelasPerfil.some(t => t.totalClientes && t.totalClientes > 0);

            if (!hasPerfilData) {
              const mockOuro = {
                perfil: 'ouro',
                totalClientes: 1,
                somaObjetivo: 120000,
                somaVendas: 90000,
                percentualGeral: 75,
                clientes: [
                  {
                    codigo_cliente: 100476,
                    nome_fantasia: 'Ótica Exemplo LTDA',
                    cidade_uf: 'Fortaleza/CE',
                    objetivo: 120000,
                    vendas: 90000,
                    percentual: 75
                  }
                ]
              } as TabelaPerfilType;

              const emptyPrata = { perfil: 'prata', totalClientes: 0, somaObjetivo: 0, somaVendas: 0, percentualGeral: 0, clientes: [] } as TabelaPerfilType;
              const emptyBronze = { perfil: 'bronze', totalClientes: 0, somaObjetivo: 0, somaVendas: 0, percentualGeral: 0, clientes: [] } as TabelaPerfilType;

              dashboardCompleto.tabelasPerfil = [mockOuro, emptyPrata, emptyBronze];
              console.log('🧪 Mock de perfil injetado para Misterclaudio (dev)');
            }
          }
        } catch (mockErr) {
          console.warn('⚠️ Falha ao injetar mock temporário:', mockErr);
        }

        setDashboardData(dashboardCompleto);
        setObjAnualData({
          ...metaAnualData, // Mantém os campos existentes de metaAnualData
          clientes_atendidos_ano: semVendas180dData?.clientesAtendidosAnoCount || 0, // Adiciona o novo campo
        });
        setVendedorRanking(rankingVendedor);
        setOticasSemVendas180d(semVendas180dData?.count || 0);
        
      } catch (error) {
        console.error('💥 Erro ao carregar dados do dashboard:', {
          error,
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined,
          user: { id: user?.id, email: user?.email, cargo: user?.cargo }
        });
        
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
  
  const handleLogout = () => {
    logout()
    navigate('/')
  }

  

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modal de teste de views */}
      {showTestViews && <TestViews />}
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 relative">
            <div className="flex items-center">
            </div>
            <div className="flex items-center absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-lg font-bold">Copiloto</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5">
                <User className="h-4 w-4" />
                <span className="text-sm">{user?.apelido || user?.nome || user?.email || 'Usuário'}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                <div className="animate-pulse">
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded mb-1"></div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-600 text-sm">Erro ao carregar métricas: {error}</p>
            <button 
              onClick={() => setShowTestViews(true)}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
            >
              Testar Views do Supabase
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* Vendas do Mês */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 relative">
              <div className="absolute top-3 right-3">
                <div className="bg-blue-50 p-2 rounded-full">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="pr-12">
                <p className="text-xs font-medium text-gray-600">Vendas do Mês</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {dashboardData?.metricas ? formatarMoeda(dashboardData.metricas.vendas_mes || 0) : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Obj: {dashboardData?.metricas ? formatarMoeda(dashboardData.metricas.meta_mes || 0) : 'N/A'} | {dashboardData?.metricas ? `${(dashboardData.metricas.percentual_meta || 0).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
            </div>

            {/* Óticas Positivadas */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 relative">
              <div className="absolute top-3 right-3">
                <div className="bg-green-50 p-2 rounded-full">
                  <Building className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="pr-12">
                <p className="text-xs font-medium text-gray-600">Óticas Positivadas</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {dashboardData?.metricas ? 
                    `${dashboardData.metricas.oticas_positivadas || 0} ${(dashboardData.metricas.oticas_positivadas || 0) === 1 ? 'ótica' : 'óticas'}` 
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Objetivo Anual */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 relative">
              <div className="absolute top-3 right-3">
                <div className="bg-yellow-50 p-2 rounded-full">
                  <Target className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
              <div className="pr-12">
                <p className="text-xs font-medium text-gray-600">Obj Anual</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {objAnualData?.percentual_anual !== null ? `${objAnualData?.percentual_anual.toFixed(1)}%` : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Obj: {objAnualData?.total_metas_ano ? formatarMoeda(objAnualData.total_metas_ano) : 'N/A'}
                </p>
              </div>
            </div>

            {/* Óticas Sem Vendas +180d */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 relative">
              <div className="absolute top-3 right-3">
                <div className="bg-red-50 p-2 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div className="pr-12">
                <p className="text-xs font-medium text-gray-600">Sem Vendas +180d</p>
                <p className="text-xl font-bold text-red-600 mt-1">
                  {oticasSemVendas180d || 0} óticas
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  VD: {objAnualData?.clientes_atendidos_ano || 0} | De {vendedorRanking?.total_clientes || 0}
                </p>
              </div>
            </div>
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