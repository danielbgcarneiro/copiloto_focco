import React from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Users, Target, MapPin, User, LogOut, BarChart3, Map, Building } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const topCidades = [
    { nome: 'Fortaleza', valor: 'R$ 450.000,00', posicao: 1 },
    { nome: 'Caucaia', valor: 'R$ 280.000,00', posicao: 2 },
    { nome: 'Maracanaú', valor: 'R$ 250.000,00', posicao: 3 },
    { nome: 'Sobral', valor: 'R$ 220.000,00', posicao: 4 },
    { nome: 'Juazeiro do Norte', valor: 'R$ 200.000,00', posicao: 5 },
  ]

  const topClientes = [
    { nome: 'Ótica Visão Perfeita', valor: 'R$ 180.000,00', posicao: 1 },
    { nome: 'Ótica Foco', valor: 'R$ 150.000,00', posicao: 2 },
    { nome: 'Ótica Olhar Certo', valor: 'R$ 130.000,00', posicao: 3 },
    { nome: 'Ótica Visão Global', valor: 'R$ 120.000,00', posicao: 4 },
    { nome: 'Ótica Visão & Cia', valor: 'R$ 110.000,00', posicao: 5 },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 mr-3" />
              <h1 className="text-xl font-bold">Copiloto</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm capitalize">
                {user?.role || 'Usuário'}
              </span>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>{user?.apelido || user?.nome || user?.login || 'Usuário'}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <LogOut className="h-5 w-5" />
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
            <p className="text-gray-600">Bem-vindo, {user?.vendedor_responsavel || user?.nome || user?.login || 'Usuário'}! Aqui estão suas métricas</p>
          </div>
          <button 
            onClick={() => navigate('/rotas')}
            className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Map className="h-5 w-5" />
            Ver Rotas
          </button>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Vendas Totais */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vendas Totais</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">R$ 125.000,00</p>
                <p className="text-sm text-gray-500 mt-1">
                  Anterior: R$ 100.000,00 
                  <span className="text-green-600 ml-2">↗ 25,0%</span>
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Óticas Ativas */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Óticas Ativas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">15</p>
                <p className="text-sm text-gray-500 mt-1">Total: 18</p>
              </div>
              <div className="bg-green-50 p-3 rounded-full">
                <Building className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Meta</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">83%</p>
                <p className="text-sm text-gray-500 mt-1">R$ 150.000,00</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-full">
                <Target className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top 5 Cidades */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <MapPin className="h-5 w-5 text-primary mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Top 5 Cidades</h3>
            </div>
            <div className="space-y-4">
              {topCidades.map((cidade) => (
                <div key={cidade.posicao} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 w-8">#{cidade.posicao}</span>
                    <span className="text-sm font-medium text-gray-900">{cidade.nome}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="bg-primary h-2 rounded-full mr-3" style={{ width: `${cidade.posicao === 1 ? '100' : cidade.posicao === 2 ? '70' : cidade.posicao === 3 ? '60' : cidade.posicao === 4 ? '50' : '40'}px` }}></div>
                    <span className="text-sm font-medium text-gray-900">{cidade.valor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 Clientes */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <Building className="h-5 w-5 text-primary mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Top 5 Clientes</h3>
            </div>
            <div className="space-y-4">
              {topClientes.map((cliente) => (
                <div key={cliente.posicao} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 w-8">#{cliente.posicao}</span>
                    <span className="text-sm font-medium text-gray-900">{cliente.nome}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="bg-primary h-2 rounded-full mr-3" style={{ width: `${cliente.posicao === 1 ? '100' : cliente.posicao === 2 ? '85' : cliente.posicao === 3 ? '75' : cliente.posicao === 4 ? '65' : '60'}px` }}></div>
                    <span className="text-sm font-medium text-gray-900">{cliente.valor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard