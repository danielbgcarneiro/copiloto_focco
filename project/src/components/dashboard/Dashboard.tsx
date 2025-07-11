import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Target, User, LogOut, Map, Building, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'
import '../../styles/dashboard.css'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { } = useUserData()
  
  // Estados para controlar ordenação
  const [sortByRoute, setSortByRoute] = useState<'asc' | 'desc' | null>(null)
  const [sortByPercentage, setSortByPercentage] = useState<'asc' | 'desc' | null>(null)
  
  // Dados dos clientes
  const clientesData = [
    { nome: 'Ótica Visão Perfeita', rota: 'Centro', meta: 200000, vendido: 180000, percentual: 90 },
    { nome: 'Ótica Foco', rota: 'Norte', meta: 170000, vendido: 150000, percentual: 88 },
    { nome: 'Ótica Olhar Certo', rota: 'Sul', meta: 150000, vendido: 130000, percentual: 87 },
    { nome: 'Ótica Visão Global', rota: 'Leste', meta: 140000, vendido: 120000, percentual: 86 },
    { nome: 'Ótica Visão & Cia', rota: 'Centro', meta: 130000, vendido: 110000, percentual: 85 },
    { nome: 'Ótica Moderna', rota: 'Norte', meta: 120000, vendido: 105000, percentual: 88 },
    { nome: 'Ótica Prime', rota: 'Sul', meta: 110000, vendido: 95000, percentual: 86 },
    { nome: 'Ótica Central', rota: 'Leste', meta: 100000, vendido: 85000, percentual: 85 },
    { nome: 'Ótica Ideal', rota: 'Centro', meta: 95000, vendido: 80000, percentual: 84 },
    { nome: 'Ótica Plus', rota: 'Norte', meta: 90000, vendido: 75000, percentual: 83 },
    { nome: 'Ótica Master', rota: 'Sul', meta: 85000, vendido: 70000, percentual: 82 },
    { nome: 'Ótica Elite', rota: 'Leste', meta: 80000, vendido: 65000, percentual: 81 },
    { nome: 'Ótica Top', rota: 'Centro', meta: 75000, vendido: 60000, percentual: 80 },
    { nome: 'Ótica Nova', rota: 'Norte', meta: 70000, vendido: 55000, percentual: 79 },
    { nome: 'Ótica Class', rota: 'Sul', meta: 65000, vendido: 50000, percentual: 77 },
    { nome: 'Ótica Style', rota: 'Leste', meta: 60000, vendido: 45000, percentual: 75 },
    { nome: 'Ótica Trend', rota: 'Centro', meta: 55000, vendido: 40000, percentual: 73 },
    { nome: 'Ótica Flash', rota: 'Norte', meta: 50000, vendido: 35000, percentual: 70 },
    { nome: 'Ótica Smart', rota: 'Sul', meta: 45000, vendido: 30000, percentual: 67 },
    { nome: 'Ótica Pro', rota: 'Leste', meta: 40000, vendido: 25000, percentual: 63 }
  ]
  
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
  }, [sortByRoute, sortByPercentage])
  
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

  // Dados dos cards de métricas
  const metricas = {
    oticasPositivadas: 15,
    oticasPositivadasAnterior: 12,
    semVendas90d: 3,
    semVendas90dAnterior: 5
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Vendas do Mês */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Vendas do Mês</p>
                <p className="text-xl font-bold text-gray-900 mt-1">R$ 125.000,00</p>
                <p className="text-xs text-gray-500 mt-1">
                  Anterior: R$ 100.000,00
                </p>
              </div>
              <div className="bg-blue-50 p-2 rounded-full">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Óticas Positivadas */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Óticas Positivadas</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {metricas.oticasPositivadas} {metricas.oticasPositivadas === 1 ? 'ótica' : 'óticas'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Anterior: {metricas.oticasPositivadasAnterior} {metricas.oticasPositivadasAnterior === 1 ? 'ótica' : 'óticas'}
                </p>
              </div>
              <div className="bg-green-50 p-2 rounded-full">
                <Building className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Meta</p>
                <p className="text-xl font-bold text-gray-900 mt-1">83%</p>
                <p className="text-xs text-gray-500 mt-1">
                  Anterior: 75%
                </p>
              </div>
              <div className="bg-yellow-50 p-2 rounded-full">
                <Target className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Óticas Sem Vendas +90d */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Sem Vendas +90d</p>
                <p className="text-xl font-bold text-red-600 mt-1">
                  {metricas.semVendas90d} {metricas.semVendas90d === 1 ? 'ótica' : 'óticas'}
                </p>
              </div>
              <div className="bg-red-50 p-2 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

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
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-xs font-medium text-gray-500 w-6">#1</span>
                <span className="text-xs font-medium text-gray-900">Fortaleza</span>
              </div>
              <span className="text-xs font-medium text-gray-900">R$ 450.000,00</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-xs font-medium text-gray-500 w-6">#2</span>
                <span className="text-xs font-medium text-gray-900">Caucaia</span>
              </div>
              <span className="text-xs font-medium text-gray-900">R$ 280.000,00</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-xs font-medium text-gray-500 w-6">#3</span>
                <span className="text-xs font-medium text-gray-900">Maracanaú</span>
              </div>
              <span className="text-xs font-medium text-gray-900">R$ 250.000,00</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-xs font-medium text-gray-500 w-6">#4</span>
                <span className="text-xs font-medium text-gray-900">Sobral</span>
              </div>
              <span className="text-xs font-medium text-gray-900">R$ 220.000,00</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-xs font-medium text-gray-500 w-6">#5</span>
                <span className="text-xs font-medium text-gray-900">Juazeiro do Norte</span>
              </div>
              <span className="text-xs font-medium text-gray-900">R$ 200.000,00</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-xs font-medium text-gray-500 w-6">#6</span>
                <span className="text-xs font-medium text-gray-900">Crato</span>
              </div>
              <span className="text-xs font-medium text-gray-900">R$ 180.000,00</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-xs font-medium text-gray-500 w-6">#7</span>
                <span className="text-xs font-medium text-gray-900">Iguatu</span>
              </div>
              <span className="text-xs font-medium text-gray-900">R$ 160.000,00</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-xs font-medium text-gray-500 w-6">#8</span>
                <span className="text-xs font-medium text-gray-900">Quixadá</span>
              </div>
              <span className="text-xs font-medium text-gray-900">R$ 140.000,00</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-xs font-medium text-gray-500 w-6">#9</span>
                <span className="text-xs font-medium text-gray-900">Canindé</span>
              </div>
              <span className="text-xs font-medium text-gray-900">R$ 120.000,00</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-xs font-medium text-gray-500 w-6">#10</span>
                <span className="text-xs font-medium text-gray-900">Ceará-Mirim</span>
              </div>
              <span className="text-xs font-medium text-gray-900">R$ 100.000,00</span>
            </div>
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
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-600 border-b border-gray-200 pb-2 mb-2">
              <div className="text-left">Cliente</div>
              <div className="text-center flex items-center justify-center">
                <span>Rota</span>
                <button 
                  onClick={toggleSortByRoute}
                  className="ml-1 p-0.5 hover:bg-gray-100 rounded transition-colors"
                >
                  {sortByRoute === 'asc' ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : sortByRoute === 'desc' ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <div className="flex flex-col">
                      <ChevronUp className="h-2 w-2 -mb-0.5" />
                      <ChevronDown className="h-2 w-2" />
                    </div>
                  )}
                </button>
              </div>
              <div className="text-center flex items-center justify-center">
                <span>Meta x Vendido</span>
                <button 
                  onClick={toggleSortByPercentage}
                  className="ml-1 p-0.5 hover:bg-gray-100 rounded transition-colors"
                >
                  {sortByPercentage === 'desc' ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : sortByPercentage === 'asc' ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <div className="flex flex-col">
                      <ChevronUp className="h-2 w-2 -mb-0.5" />
                      <ChevronDown className="h-2 w-2" />
                    </div>
                  )}
                </button>
              </div>
            </div>
            {clientesOrdenados.map((cliente) => (
              <div key={cliente.nome} className="grid grid-cols-3 gap-2 text-xs items-center py-1">
                <div className="flex items-center">
                  <span className="font-medium text-gray-500 w-6">#{cliente.posicao}</span>
                  <span className="font-medium text-gray-900 truncate">{cliente.nome}</span>
                </div>
                <div className="text-center text-gray-600">{cliente.rota}</div>
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded h-6 sm:h-5 relative">
                    <div className="bg-primary h-6 sm:h-5 rounded transition-all duration-300" style={{width: `${cliente.percentual}%`}}></div>
                    <div className="absolute inset-0 flex items-center justify-center px-2 sm:px-4">
                      <span className="text-[9px] sm:text-[10px] text-white font-medium tracking-tight">
                        <span className="hidden xs:inline">{cliente.meta.toLocaleString('pt-BR')} | {cliente.vendido.toLocaleString('pt-BR')} | </span>{cliente.percentual}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
          <div>
            <div className="relative">
              <div className="flex justify-between mb-2 px-8 sm:px-12">
                <span className="text-[8px] sm:text-[9px] text-gray-500">0</span>
                <span className="text-[8px] sm:text-[9px] text-gray-500">100k</span>
                <span className="text-[8px] sm:text-[9px] text-gray-500">200k</span>
                <span className="text-[8px] sm:text-[9px] text-gray-500">300k</span>
                <span className="text-[8px] sm:text-[9px] text-gray-500">400k</span>
                <span className="text-[8px] sm:text-[9px] text-gray-500">500k</span>
              </div>
              <div className="absolute top-5 left-8 sm:left-12 right-2 sm:right-4 h-24 sm:h-32 pointer-events-none">
                <div className="absolute top-0 bottom-0 w-px bg-gray-200 chart-grid-line-0"></div>
                <div className="absolute top-0 bottom-0 w-px bg-gray-200 chart-grid-line-20"></div>
                <div className="absolute top-0 bottom-0 w-px bg-gray-200 chart-grid-line-40"></div>
                <div className="absolute top-0 bottom-0 w-px bg-gray-200 chart-grid-line-60"></div>
                <div className="absolute top-0 bottom-0 w-px bg-gray-200 chart-grid-line-80"></div>
                <div className="absolute top-0 bottom-0 w-px bg-gray-200 chart-grid-line-100"></div>
              </div>
              <div className="space-y-2 sm:space-y-3 pl-8 sm:pl-12 pr-2 sm:pr-4">
                <div className="flex items-center">
                  <div className="w-8 sm:w-12 text-right pr-1 sm:pr-2">
                    <span className="text-[8px] sm:text-[9px] text-gray-700 font-medium">Centro</span>
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-4 sm:h-5 bg-gray-200 rounded relative chart-bar-full">
                      <div className="h-4 sm:h-5 bg-primary rounded transition-all duration-300 relative flex items-center justify-center chart-progress-90">
                        <span className="text-[7px] sm:text-[8px] text-white font-medium">90%</span>
                      </div>
                      <div className="absolute right-0.5 sm:right-1 top-0 h-4 sm:h-5 flex items-center">
                        <span className="text-[7px] sm:text-[8px] text-gray-600 font-medium">
                          <span className="hidden sm:inline">450k/500k</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-8 sm:w-12 text-right pr-1 sm:pr-2">
                    <span className="text-[8px] sm:text-[9px] text-gray-700 font-medium">Norte</span>
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-4 sm:h-5 bg-gray-200 rounded relative chart-bar-80">
                      <div className="h-4 sm:h-5 bg-primary rounded transition-all duration-300 relative flex items-center justify-center chart-progress-80">
                        <span className="text-[7px] sm:text-[8px] text-white font-medium">80%</span>
                      </div>
                      <div className="absolute right-0.5 sm:right-1 top-0 h-4 sm:h-5 flex items-center">
                        <span className="text-[7px] sm:text-[8px] text-gray-600 font-medium">
                          <span className="hidden sm:inline">320k/400k</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-8 sm:w-12 text-right pr-1 sm:pr-2">
                    <span className="text-[8px] sm:text-[9px] text-gray-700 font-medium">Sul</span>
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-4 sm:h-5 bg-gray-200 rounded relative chart-bar-90">
                      <div className="h-4 sm:h-5 bg-primary rounded transition-all duration-300 relative flex items-center justify-center chart-progress-70">
                        <span className="text-[7px] sm:text-[8px] text-white font-medium">70%</span>
                      </div>
                      <div className="absolute right-0.5 sm:right-1 top-0 h-4 sm:h-5 flex items-center">
                        <span className="text-[7px] sm:text-[8px] text-gray-600 font-medium">
                          <span className="hidden sm:inline">315k/450k</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-8 sm:w-12 text-right pr-1 sm:pr-2">
                    <span className="text-[8px] sm:text-[9px] text-gray-700 font-medium">Leste</span>
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-4 sm:h-5 bg-gray-200 rounded relative chart-bar-70">
                      <div className="h-4 sm:h-5 bg-primary rounded transition-all duration-300 relative flex items-center justify-center chart-progress-60">
                        <span className="text-[7px] sm:text-[8px] text-white font-medium">60%</span>
                      </div>
                      <div className="absolute right-0.5 sm:right-1 top-0 h-4 sm:h-5 flex items-center">
                        <span className="text-[7px] sm:text-[8px] text-gray-600 font-medium">
                          <span className="hidden sm:inline">210k/350k</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center mt-2 sm:mt-3 space-x-3 sm:space-x-4">
                <div className="flex items-center">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-200 rounded mr-1"></div>
                  <span className="text-[8px] sm:text-[9px] text-gray-600">Meta</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-primary rounded mr-1"></div>
                  <span className="text-[8px] sm:text-[9px] text-gray-600">Vendido</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </main>
    </div>
  )
}

export default Dashboard