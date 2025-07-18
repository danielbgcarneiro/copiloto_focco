import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Target, User, LogOut, Map, Building, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'
import { getDashboardCompleto, formatarMoeda, formatarValorGrande, type DashboardData, type Top20Cliente } from '../../lib/queries/dashboard'
import { getVendedorRanking, type VendedorRanking } from '../../lib/queries/vendedores'
import { getEmptyStateMessage } from '../../lib/utils/userHelpers'
import '../../styles/dashboard.css'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { } = useUserData()
  
  // Estados para controlar ordenação
  const [sortByRoute, setSortByRoute] = useState<'asc' | 'desc' | null>(null)
  const [sortByPercentage, setSortByPercentage] = useState<'asc' | 'desc' | null>(null)
  
  // Estados para dados reais
  const [clientesData, setClientesData] = useState<Top20Cliente[]>([])
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [vendedorRanking, setVendedorRanking] = useState<VendedorRanking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCarregando, setIsCarregando] = useState(false)
  
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
        
        // Carregar dados completos do dashboard (já inclui top20 clientes)
        const dashboardCompleto = await getDashboardCompleto();
        
        // Tentar carregar ranking do vendedor separadamente (não-blocking)
        let rankingVendedor = null;
        
        try {
          rankingVendedor = await getVendedorRanking();
        } catch (vendedorError) {
          console.warn('⚠️ Não foi possível carregar dados do vendedor:', vendedorError);
        }
        
        // Dados dos clientes já vêm formatados do dashboard
        const clientesTop20 = dashboardCompleto.top20Clientes;
        
        console.log('✅ Dados completos carregados:', {
          dashboard: {
            metricas: dashboardCompleto.metricas,
            cidadesCount: dashboardCompleto.top10Cidades.length,
            rotasCount: dashboardCompleto.rankingRotas.length,
            clientesCount: dashboardCompleto.top20Clientes.length
          },
          vendedorRanking: rankingVendedor
        });
        
        // Verificar se há dados suficientes
        if (dashboardCompleto.top10Cidades.length === 0 && 
            dashboardCompleto.rankingRotas.length === 0 && 
            clientesTop20.length === 0) {
          console.warn('⚠️ Nenhum dado encontrado - possível problema com RLS');
        }
        
        setDashboardData(dashboardCompleto);
        setClientesData(clientesTop20);
        setVendedorRanking(rankingVendedor);
        
      } catch (error) {
        console.error('💥 Erro ao carregar dados do dashboard:', {
          error,
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined,
          user: { id: user?.id, email: user?.email, cargo: user?.cargo }
        });
        
        setError(error instanceof Error ? error.message : 'Erro desconhecido')
        setDashboardData(null)
        setClientesData([])
        setVendedorRanking(null)
      } finally {
        setLoading(false)
        setIsCarregando(false);
      }
    }
    
    carregarDados();
  }, [user?.id])
  
  // Função para ordenar os clientes
  const clientesOrdenados = useMemo(() => {
    let sorted = [...clientesData]
    
    if (sortByRoute) {
      sorted.sort((a, b) => {
        if (sortByRoute === 'asc') {
          return a.rota.localeCompare(b.rota)
        } else {
          return b.rota.localeCompare(a.rota)
        }
      })
    } else if (sortByPercentage) {
      sorted.sort((a, b) => {
        if (sortByPercentage === 'asc') {
          return a.percentual - b.percentual
        } else {
          return b.percentual - a.percentual
        }
      })
    }
    
    // Adicionar posição do ranking baseada no percentual real
    const clientesComRanking = sorted.map((cliente) => {
      const posicao = clientesData
        .sort((a, b) => b.percentual - a.percentual)
        .findIndex(c => c.nome === cliente.nome) + 1
      return { ...cliente, posicao }
    })
    
    return clientesComRanking
  }, [sortByRoute, sortByPercentage, clientesData])
  
  // Funções para alternar ordenação
  const toggleSortByRoute = () => {
    setSortByPercentage(null)
    if (sortByRoute === null) {
      setSortByRoute('asc')
    } else if (sortByRoute === 'asc') {
      setSortByRoute('desc')
    } else {
      setSortByRoute(null)
    }
  }
  
  const toggleSortByPercentage = () => {
    setSortByRoute(null)
    if (sortByPercentage === null) {
      setSortByPercentage('desc')
    } else if (sortByPercentage === 'desc') {
      setSortByPercentage('asc')
    } else {
      setSortByPercentage(null)
    }
  }


  const handleLogout = () => {
    logout()
    navigate('/')
  }



  return (
    <div className="min-h-screen bg-gray-50">
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
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button 
              onClick={() => navigate('/inadimplentes')}
              className="bg-red-600 text-white p-2 sm:px-4 sm:py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
            >
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button 
              onClick={() => navigate('/rotas')}
              className="bg-primary text-white p-2 sm:px-4 sm:py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center"
            >
              <Map className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
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
                  Obj: {dashboardData?.metricas ? formatarMoeda(dashboardData.metricas.meta_mes || 0) : 'N/A'} | {dashboardData?.metricas ? `${Math.round(dashboardData.metricas.percentual_meta || 0)}%` : 'N/A'}
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

            {/* Meta Geral */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 relative">
              <div className="absolute top-3 right-3">
                <div className="bg-yellow-50 p-2 rounded-full">
                  <Target className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
              <div className="pr-12">
                <p className="text-xs font-medium text-gray-600">Meta Geral</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {clientesData.length > 0 ? 
                    Math.round(clientesData.reduce((acc, cliente) => acc + cliente.percentual, 0) / clientesData.length) 
                    : 0}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Média dos clientes
                </p>
              </div>
            </div>

            {/* Óticas Sem Vendas +90d */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 relative">
              <div className="absolute top-3 right-3">
                <div className="bg-red-50 p-2 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div className="pr-12">
                <p className="text-xs font-medium text-gray-600">Sem Vendas +90d</p>
                <p className="text-xl font-bold text-red-600 mt-1">
                  {vendedorRanking?.clientes_sem_vendas_90d || 
                   clientesData.filter(cliente => cliente.percentual === 0 || cliente.vendido === 0).length} óticas
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  De {vendedorRanking?.total_clientes || clientesData.length} total
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top 10 Cidades */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin h-5 w-5 text-primary mr-2" aria-hidden="true">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Top 10 Cidades</h3>
          </div>
          <div className="space-y-3">
            {loading ? (
              [...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center justify-between animate-pulse">
                  <div className="flex items-center">
                    <div className="w-6 h-3 bg-gray-200 rounded mr-2"></div>
                    <div className="w-20 h-3 bg-gray-200 rounded"></div>
                  </div>
                  <div className="w-16 h-3 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : dashboardData?.top10Cidades && dashboardData.top10Cidades.length > 0 ? (
              dashboardData.top10Cidades.map((cidade) => (
                <div key={cidade.cidade} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-gray-500 w-6">#{cidade.posicao}</span>
                    <span className="text-xs font-medium text-gray-900">{cidade.cidade}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-900">
                    {formatarMoeda(cidade.valor_vendas)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">{getEmptyStateMessage(user, 'dashboard').title}</p>
                <p className="text-xs">{getEmptyStateMessage(user, 'dashboard').subtitle}</p>
              </div>
            )}
          </div>
        </div>

        {/* Top 20 Clientes */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-building h-5 w-5 text-primary mr-2" aria-hidden="true">
              <rect width="16" height="20" x="4" y="2" rx="2" ry="2"></rect>
              <path d="M9 22v-4h6v4"></path>
              <path d="M8 6h.01"></path>
              <path d="M16 6h.01"></path>
              <path d="M12 6h.01"></path>
              <path d="M12 10h.01"></path>
              <path d="M12 14h.01"></path>
              <path d="M16 10h.01"></path>
              <path d="M16 14h.01"></path>
              <path d="M8 10h.01"></path>
              <path d="M8 14h.01"></path>
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Top 20 Clientes</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {/* Header da tabela */}
            <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-gray-600 border-b border-gray-200 pb-2 mb-2 px-2">
              <div className="col-span-5 text-left">Cliente</div>
              <div className="col-span-2 text-left flex items-center">
                <span>Rota</span>
                <button 
                  onClick={toggleSortByRoute}
                  className="ml-1 p-0.5 hover:bg-gray-100 rounded transition-colors"
                >
                  {sortByRoute === 'asc' ? (
                    <ChevronUp className="h-2.5 w-2.5" />
                  ) : sortByRoute === 'desc' ? (
                    <ChevronDown className="h-2.5 w-2.5" />
                  ) : (
                    <div className="flex flex-col">
                      <ChevronUp className="h-1.5 w-1.5 -mb-0.5" />
                      <ChevronDown className="h-1.5 w-1.5" />
                    </div>
                  )}
                </button>
              </div>
              <div className="col-span-5 text-center flex items-center justify-center">
                <span>Performance</span>
                <button 
                  onClick={toggleSortByPercentage}
                  className="ml-1 p-0.5 hover:bg-gray-100 rounded transition-colors"
                >
                  {sortByPercentage === 'desc' ? (
                    <ChevronDown className="h-2.5 w-2.5" />
                  ) : sortByPercentage === 'asc' ? (
                    <ChevronUp className="h-2.5 w-2.5" />
                  ) : (
                    <div className="flex flex-col">
                      <ChevronUp className="h-1.5 w-1.5 -mb-0.5" />
                      <ChevronDown className="h-1.5 w-1.5" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-gray-600">Carregando dados...</span>
              </div>
            ) : clientesOrdenados.length > 0 ? (
              (() => {
                // 1º: Garantir os TOP 20 maiores compradores por volume e adicionar posição original
                let top20Clientes = [...clientesOrdenados]
                  .sort((a, b) => b.vendido - a.vendido)
                  .slice(0, 20)
                  .map((cliente, index) => ({ ...cliente, posicaoOriginal: index + 1 }));

                // 2º: Aplicar ordenação escolhida pelo usuário
                if (sortByRoute === 'asc') {
                  top20Clientes.sort((a, b) => a.rota.localeCompare(b.rota));
                } else if (sortByRoute === 'desc') {
                  top20Clientes.sort((a, b) => b.rota.localeCompare(a.rota));
                } else if (sortByPercentage === 'desc') {
                  top20Clientes.sort((a, b) => b.percentual - a.percentual);
                } else if (sortByPercentage === 'asc') {
                  top20Clientes.sort((a, b) => a.percentual - b.percentual);
                } else {
                  // Padrão: manter ordenação por volume (maior → menor)
                  top20Clientes.sort((a, b) => b.vendido - a.vendido);
                }

                return top20Clientes;
              })()
                .map((cliente) => {
                  const maxValue = Math.max(cliente.meta, cliente.vendido);
                  const metaPercentage = (cliente.meta / maxValue) * 100;
                  const vendidoPercentage = (cliente.vendido / maxValue) * 100;
                  const isOverTarget = cliente.vendido > cliente.meta;
                  const nomeDisplay = cliente.nome.length > 20 ? cliente.nome.substring(0, 20) + '...' : cliente.nome;
                  
                  return (
                    <div key={cliente.codigo_cliente || cliente.nome} className="grid grid-cols-12 gap-2 items-center py-1.5 hover:bg-gray-50 rounded-lg px-2 transition-colors">
                      {/* Ranking + Nome */}
                      <div className="col-span-5 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-700 w-3 text-right">{cliente.posicaoOriginal}</span>
                        <span className="text-xs text-gray-900 truncate">{nomeDisplay}</span>
                      </div>
                      
                      {/* Rota */}
                      <div className="col-span-2 text-left">
                        <span className="text-[10px] text-gray-600">{cliente.rota}</span>
                      </div>
                      
                      {/* Performance + Valores */}
                      <div className="col-span-5 space-y-1">
                        <div className="text-right text-[9px] text-gray-600">
                          <span className="font-medium">VD {(cliente.vendido / 1000).toFixed(0)}k</span>
                          <span className="text-gray-400"> / MT {(cliente.meta / 1000).toFixed(0)}k</span>
                        </div>
                        
                        <div className="relative w-full h-1.5 bg-gray-400 rounded-sm overflow-hidden">
                          {/* Barra da Meta */}
                          <div 
                            className="absolute top-0 left-0 h-full bg-gray-300 transition-all duration-500"
                            style={{ width: `${metaPercentage}%` }}
                          />
                          
                          {/* Barra do Vendido */}
                          <div 
                            className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                              isOverTarget ? 'bg-primary' : 'bg-blue-500'
                            }`}
                            style={{ width: `${vendidoPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">{getEmptyStateMessage(user, 'clientes').title}</p>
                <p className="text-xs">{getEmptyStateMessage(user, 'clientes').subtitle}</p>
              </div>
            )}
          </div>
        </div>

        {/* Ranking Rotas */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-target h-5 w-5 text-primary mr-2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="6"></circle>
              <circle cx="12" cy="12" r="2"></circle>
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Ranking Rotas</h3>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-3 bg-gray-200 rounded"></div>
                    <div className="flex-1 h-5 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : dashboardData?.rankingRotas && dashboardData.rankingRotas.length > 0 ? (
            <div>
              <div>
                {/* Layout limpo sem escala de valores */}
                <div className="space-y-2 px-2 sm:px-4">
                  {dashboardData.rankingRotas.map((rota) => (
                    <div key={rota.rota} className="">
                      {/* Nome da rota sem número de ranking */}
                      <div className="mb-1">
                        <span className="text-xs sm:text-sm text-gray-700 font-medium">
                          {rota.rota}
                        </span>
                      </div>
                      
                      {/* Barra de progresso mais fina */}
                      <div className="relative">
                        <div className="h-3 sm:h-4 bg-gray-200 rounded relative">
                          <div 
                            className="h-3 sm:h-4 bg-primary rounded transition-all duration-300 relative flex items-center justify-center"
                            style={{width: `${Math.min(rota.percentual_meta, 100)}%`}}
                          >
                            <span className="text-[9px] sm:text-[10px] text-white font-medium">
                              {Math.round(rota.percentual_meta)}%
                            </span>
                          </div>
                          
                          {/* Valores vendido/meta - sempre mostra ambos */}
                          <div className="absolute right-1 top-0 h-3 sm:h-4 flex items-center">
                            <span className="text-[9px] sm:text-[10px] text-gray-600 font-medium bg-white/90 px-1 rounded shadow-sm">
                              {formatarValorGrande(rota.vendido_2025)}/{formatarValorGrande(rota.meta_2025)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center mt-3 space-x-4">
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 bg-gray-200 rounded mr-1.5"></div>
                    <span className="text-[10px] sm:text-xs text-gray-600 font-medium">Meta</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 bg-primary rounded mr-1.5"></div>
                    <span className="text-[10px] sm:text-xs text-gray-600 font-medium">Vendido</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">{getEmptyStateMessage(user, 'rotas').title}</p>
            </div>
          )}
        </div>
        
      </main>
    </div>
  )
}

export default Dashboard