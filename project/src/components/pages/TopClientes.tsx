import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, Shield, TrendingUp, MapPin, UserCheck, Home, ArrowLeft, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface Vendedor {
  id: string
  nome: string
}

interface Rota {
  id: string
  nome: string
}

interface ClienteData {
  id: string
  nome: string
  rota: string
  cidade: string
  vendedor: string
  vendedorId: string
  rotaId: string
  vendas2024: number
  meta2025: number
  vendas2025: number
}

interface PotencialRealizadoData {
  totalMetas: number
  totalVendas: number
  atingimento: number
}

const TopClientes: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  
  // Estados para filtros
  const [vendedoresSelecionados, setVendedoresSelecionados] = useState<string[]>([])
  const [rotasSelecionadas, setRotasSelecionadas] = useState<string[]>([])
  const [dropdownVendedorAberto, setDropdownVendedorAberto] = useState(false)
  const [dropdownRotaAberto, setDropdownRotaAberto] = useState(false)

  // Dados mockados com memo para otimização
  const vendedores = useMemo<Vendedor[]>(() => [
    { id: '1', nome: 'João Silva' },
    { id: '2', nome: 'Maria Santos' },
    { id: '3', nome: 'Pedro Costa' },
    { id: '4', nome: 'Ana Oliveira' },
    { id: '5', nome: 'Carlos Lima' },
    { id: '6', nome: 'Fernanda Rocha' },
    { id: '7', nome: 'Roberto Alves' }
  ], [])

  const rotas = useMemo<Rota[]>(() => [
    { id: '1', nome: 'Aracati' },
    { id: '2', nome: 'Fortaleza Centro' },
    { id: '3', nome: 'Caucaia' },
    { id: '4', nome: 'Maracanaú' },
    { id: '5', nome: 'Sobral' },
    { id: '6', nome: 'Juazeiro do Norte' },
    { id: '7', nome: 'Crato' },
    { id: '8', nome: 'Iguatu' },
    { id: '9', nome: 'Quixadá' },
    { id: '10', nome: 'Canindé' }
  ], [])

  // Dados dos clientes com memo para otimização
  const dadosClientes = useMemo<ClienteData[]>(() => [
    { id: '1', nome: 'Ótica Central', rota: 'Fortaleza Centro', cidade: 'Fortaleza', vendedor: 'João Silva', vendedorId: '1', rotaId: '2', vendas2024: 285000, meta2025: 320000, vendas2025: 195000 },
    { id: '2', nome: 'Visão Perfeita', rota: 'Sobral', cidade: 'Sobral', vendedor: 'Ana Oliveira', vendedorId: '4', rotaId: '5', vendas2024: 235000, meta2025: 280000, vendas2025: 165000 },
    { id: '3', nome: 'Óptica Moderna', rota: 'Caucaia', cidade: 'Caucaia', vendedor: 'Maria Santos', vendedorId: '2', rotaId: '3', vendas2024: 195000, meta2025: 220000, vendas2025: 145000 },
    { id: '4', nome: 'Centro Oftálmico', rota: 'Juazeiro do Norte', cidade: 'Juazeiro do Norte', vendedor: 'Carlos Lima', vendedorId: '5', rotaId: '6', vendas2024: 165000, meta2025: 190000, vendas2025: 125000 },
    { id: '5', nome: 'Ótica Cristal', rota: 'Maracanaú', cidade: 'Maracanaú', vendedor: 'Pedro Costa', vendedorId: '3', rotaId: '4', vendas2024: 125000, meta2025: 150000, vendas2025: 98000 },
    { id: '6', nome: 'Vista Clara', rota: 'Iguatu', cidade: 'Iguatu', vendedor: 'Fernanda Rocha', vendedorId: '6', rotaId: '8', vendas2024: 115000, meta2025: 135000, vendas2025: 89000 },
    { id: '7', nome: 'Óptica Ideal', rota: 'Quixadá', cidade: 'Quixadá', vendedor: 'Roberto Alves', vendedorId: '7', rotaId: '9', vendas2024: 92000, meta2025: 110000, vendas2025: 78000 },
    { id: '8', nome: 'Ótica Premium', rota: 'Crato', cidade: 'Crato', vendedor: 'Carlos Lima', vendedorId: '5', rotaId: '7', vendas2024: 98000, meta2025: 120000, vendas2025: 76000 },
    { id: '9', nome: 'Visão Total', rota: 'Fortaleza Centro', cidade: 'Fortaleza', vendedor: 'João Silva', vendedorId: '1', rotaId: '2', vendas2024: 87000, meta2025: 105000, vendas2025: 72000 },
    { id: '10', nome: 'Óptica Nova', rota: 'Aracati', cidade: 'Aracati', vendedor: 'Maria Santos', vendedorId: '2', rotaId: '1', vendas2024: 73000, meta2025: 88000, vendas2025: 65000 },
    { id: '11', nome: 'Centro da Visão', rota: 'Sobral', cidade: 'Sobral', vendedor: 'Ana Oliveira', vendedorId: '4', rotaId: '5', vendas2024: 68000, meta2025: 82000, vendas2025: 58000 },
    { id: '12', nome: 'Ótica Express', rota: 'Caucaia', cidade: 'Caucaia', vendedor: 'Maria Santos', vendedorId: '2', rotaId: '3', vendas2024: 65000, meta2025: 78000, vendas2025: 55000 },
    { id: '13', nome: 'Visão & Estilo', rota: 'Maracanaú', cidade: 'Maracanaú', vendedor: 'Pedro Costa', vendedorId: '3', rotaId: '4', vendas2024: 58000, meta2025: 70000, vendas2025: 48000 },
    { id: '14', nome: 'Óptica Atual', rota: 'Iguatu', cidade: 'Iguatu', vendedor: 'Fernanda Rocha', vendedorId: '6', rotaId: '8', vendas2024: 52000, meta2025: 63000, vendas2025: 42000 },
    { id: '15', nome: 'Vista Bela', rota: 'Canindé', cidade: 'Canindé', vendedor: 'Roberto Alves', vendedorId: '7', rotaId: '10', vendas2024: 48000, meta2025: 58000, vendas2025: 38000 },
    { id: '16', nome: 'Ótica Família', rota: 'Juazeiro do Norte', cidade: 'Juazeiro do Norte', vendedor: 'Carlos Lima', vendedorId: '5', rotaId: '6', vendas2024: 45000, meta2025: 55000, vendas2025: 36000 },
    { id: '17', nome: 'Visão Clara', rota: 'Crato', cidade: 'Crato', vendedor: 'Carlos Lima', vendedorId: '5', rotaId: '7', vendas2024: 42000, meta2025: 52000, vendas2025: 34000 },
    { id: '18', nome: 'Óptica Sol', rota: 'Quixadá', cidade: 'Quixadá', vendedor: 'Roberto Alves', vendedorId: '7', rotaId: '9', vendas2024: 39000, meta2025: 48000, vendas2025: 31000 },
    { id: '19', nome: 'Centro Ótico', rota: 'Aracati', cidade: 'Aracati', vendedor: 'Maria Santos', vendedorId: '2', rotaId: '1', vendas2024: 36000, meta2025: 45000, vendas2025: 28000 },
    { id: '20', nome: 'Visão Moderna', rota: 'Fortaleza Centro', cidade: 'Fortaleza', vendedor: 'João Silva', vendedorId: '1', rotaId: '2', vendas2024: 34000, meta2025: 42000, vendas2025: 26000 },
    { id: '21', nome: 'Óptica Smart', rota: 'Sobral', cidade: 'Sobral', vendedor: 'Ana Oliveira', vendedorId: '4', rotaId: '5', vendas2024: 32000, meta2025: 40000, vendas2025: 24000 },
    { id: '22', nome: 'Vista & Cia', rota: 'Caucaia', cidade: 'Caucaia', vendedor: 'Maria Santos', vendedorId: '2', rotaId: '3', vendas2024: 29000, meta2025: 37000, vendas2025: 22000 },
    { id: '23', nome: 'Ótica Brasil', rota: 'Maracanaú', cidade: 'Maracanaú', vendedor: 'Pedro Costa', vendedorId: '3', rotaId: '4', vendas2024: 27000, meta2025: 35000, vendas2025: 20000 },
    { id: '24', nome: 'Visão Plus', rota: 'Iguatu', cidade: 'Iguatu', vendedor: 'Fernanda Rocha', vendedorId: '6', rotaId: '8', vendas2024: 25000, meta2025: 32000, vendas2025: 18000 },
    { id: '25', nome: 'Óptica Vida', rota: 'Canindé', cidade: 'Canindé', vendedor: 'Roberto Alves', vendedorId: '7', rotaId: '10', vendas2024: 23000, meta2025: 30000, vendas2025: 16000 },
    { id: '26', nome: 'Centro Visual', rota: 'Juazeiro do Norte', cidade: 'Juazeiro do Norte', vendedor: 'Carlos Lima', vendedorId: '5', rotaId: '6', vendas2024: 21000, meta2025: 28000, vendas2025: 14000 },
    { id: '27', nome: 'Ótica Digital', rota: 'Crato', cidade: 'Crato', vendedor: 'Carlos Lima', vendedorId: '5', rotaId: '7', vendas2024: 19000, meta2025: 25000, vendas2025: 12000 },
    { id: '28', nome: 'Visão Pro', rota: 'Quixadá', cidade: 'Quixadá', vendedor: 'Roberto Alves', vendedorId: '7', rotaId: '9', vendas2024: 17000, meta2025: 23000, vendas2025: 10000 },
    { id: '29', nome: 'Óptica Top', rota: 'Aracati', cidade: 'Aracati', vendedor: 'Maria Santos', vendedorId: '2', rotaId: '1', vendas2024: 15000, meta2025: 20000, vendas2025: 8000 },
    { id: '30', nome: 'Vista Real', rota: 'Fortaleza Centro', cidade: 'Fortaleza', vendedor: 'João Silva', vendedorId: '1', rotaId: '2', vendas2024: 13000, meta2025: 18000, vendas2025: 6000 },
    { id: '31', nome: 'Óptica Elite', rota: 'Sobral', cidade: 'Sobral', vendedor: 'Ana Oliveira', vendedorId: '4', rotaId: '5', vendas2024: 11000, meta2025: 15000, vendas2025: 4000 },
    { id: '32', nome: 'Visão Master', rota: 'Caucaia', cidade: 'Caucaia', vendedor: 'Maria Santos', vendedorId: '2', rotaId: '3', vendas2024: 9000, meta2025: 12000, vendas2025: 2000 }
  ], [])

  // Calcular Potencial x Realizado com memo
  const potencialRealizado = useMemo<PotencialRealizadoData>(() => {
    const totalMetas = dadosClientes.reduce((acc, cliente) => acc + cliente.meta2025, 0)
    const totalVendas = dadosClientes.reduce((acc, cliente) => acc + cliente.vendas2025, 0)
    const atingimento = totalMetas > 0 ? (totalVendas / totalMetas) * 100 : 0

    return { totalMetas, totalVendas, atingimento }
  }, [dadosClientes])

  // Filtrar dados baseado na seleção de vendedores e rotas com memo
  const clientesFiltrados = useMemo(() => {
    let filtered = dadosClientes

    if (vendedoresSelecionados.length > 0) {
      filtered = filtered.filter(cliente => 
        vendedoresSelecionados.includes(cliente.vendedorId)
      )
    }

    if (rotasSelecionadas.length > 0) {
      filtered = filtered.filter(cliente => 
        rotasSelecionadas.includes(cliente.rotaId)
      )
    }

    // Sempre retornar apenas os 30 maiores por vendas 2025
    return filtered.sort((a, b) => b.vendas2025 - a.vendas2025).slice(0, 30)
  }, [dadosClientes, vendedoresSelecionados, rotasSelecionadas])

  const handleVendedorChange = (vendedorId: string) => {
    setVendedoresSelecionados(prev => 
      prev.includes(vendedorId) 
        ? prev.filter(id => id !== vendedorId)
        : [...prev, vendedorId]
    )
  }

  const handleRotaChange = (rotaId: string) => {
    setRotasSelecionadas(prev => 
      prev.includes(rotaId) 
        ? prev.filter(id => id !== rotaId)
        : [...prev, rotaId]
    )
  }

  const selecionarTodosVendedores = () => {
    if (vendedoresSelecionados.length === vendedores.length) {
      setVendedoresSelecionados([])
    } else {
      setVendedoresSelecionados(vendedores.map(v => v.id))
    }
  }

  const selecionarTodasRotas = () => {
    if (rotasSelecionadas.length === rotas.length) {
      setRotasSelecionadas([])
    } else {
      setRotasSelecionadas(rotas.map(r => r.id))
    }
  }

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    if (user.cargo !== 'diretor') {
      navigate('/dashboard')
      return
    }

    setLoading(false)
  }, [user, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="w-full sm:max-w-7xl sm:mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-14">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard-gestao')}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Voltar ao Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium hidden sm:inline">Gestão</span>
              </div>
            </div>
            <div className="flex items-center">
              <h1 className="text-base sm:text-lg font-bold">Top Clientes</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5">
                <User className="h-4 w-4" />
                <span className="text-xs sm:text-sm hidden sm:inline">{user?.apelido || user?.nome || user?.email || 'Diretor'}</span>
              </div>
              <button 
                onClick={() => { logout(); navigate('/') }}
                className="p-2 sm:p-1.5 hover:bg-white/10 rounded-full transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Menu de Navegação */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full sm:max-w-7xl sm:mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 py-3 overflow-x-auto">
            <button
              onClick={() => navigate('/dashboard-gestao')}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
            <span className="text-gray-300">/</span>
            <button
              onClick={() => navigate('/acumulado-ano')}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Acumulado Ano</span>
            </button>
            <span className="text-gray-300">/</span>
            <button
              onClick={() => navigate('/dashboard-rotas')}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <MapPin className="h-4 w-4" />
              <span>Rotas</span>
            </button>
            <span className="text-gray-300">/</span>
            <button
              onClick={() => navigate('/top-clientes')}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg whitespace-nowrap"
            >
              <UserCheck className="h-4 w-4" />
              <span>Top Clientes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full sm:max-w-7xl sm:mx-auto px-2 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
            Top Clientes
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Análise dos principais clientes por vendedor e região
          </p>
        </div>

        {/* Potencial x Realizado */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Potencial x Realizado (2025)</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="text-3xl font-bold text-blue-900 mb-2">R$ {potencialRealizado.totalMetas.toLocaleString()}</div>
              <div className="text-sm font-medium text-blue-700">Total de Metas (Potencial)</div>
            </div>
            
            <div className="text-center p-6 bg-green-50 rounded-lg border-l-4 border-green-500">
              <div className="text-3xl font-bold text-green-900 mb-2">R$ {potencialRealizado.totalVendas.toLocaleString()}</div>
              <div className="text-sm font-medium text-green-700">Total de Vendas (Realizado)</div>
            </div>
            
            <div className="text-center p-6 bg-purple-50 rounded-lg border-l-4 border-purple-500">
              <div className={`text-3xl font-bold mb-2 ${
                potencialRealizado.atingimento >= 100 ? 'text-green-900' :
                potencialRealizado.atingimento >= 80 ? 'text-yellow-900' : 'text-red-900'
              }`}>
                {potencialRealizado.atingimento.toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-purple-700">Atingimento Geral</div>
            </div>
          </div>
        </div>

        {/* Top 30 Clientes */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 lg:mb-0">Top 30 Clientes (2024 x 2025)</h3>
            
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Filtro Vendedores */}
              <div className="relative">
                <button
                  onClick={() => setDropdownVendedorAberto(!dropdownVendedorAberto)}
                  className="flex items-center justify-between w-full sm:w-56 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                >
                  <span className="text-gray-700">
                    {vendedoresSelecionados.length === 0 
                      ? 'Todos os vendedores'
                      : vendedoresSelecionados.length === vendedores.length
                      ? 'Todos selecionados'
                      : `${vendedoresSelecionados.length} vendedores`
                    }
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                
                {dropdownVendedorAberto && (
                  <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      <button
                        onClick={selecionarTodosVendedores}
                        className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded"
                      >
                        {vendedoresSelecionados.length === vendedores.length ? 'Desmarcar todos' : 'Selecionar todos'}
                      </button>
                      <div className="border-t border-gray-200 my-2"></div>
                      {vendedores.map(vendedor => (
                        <label key={vendedor.id} className="flex items-center px-3 py-2 text-sm hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={vendedoresSelecionados.includes(vendedor.id)}
                            onChange={() => handleVendedorChange(vendedor.id)}
                            className="mr-2 text-primary focus:ring-primary"
                          />
                          {vendedor.nome}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Filtro Rotas */}
              <div className="relative">
                <button
                  onClick={() => setDropdownRotaAberto(!dropdownRotaAberto)}
                  className="flex items-center justify-between w-full sm:w-56 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                >
                  <span className="text-gray-700">
                    {rotasSelecionadas.length === 0 
                      ? 'Todas as rotas'
                      : rotasSelecionadas.length === rotas.length
                      ? 'Todas selecionadas'
                      : `${rotasSelecionadas.length} rotas`
                    }
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                
                {dropdownRotaAberto && (
                  <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      <button
                        onClick={selecionarTodasRotas}
                        className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded"
                      >
                        {rotasSelecionadas.length === rotas.length ? 'Desmarcar todas' : 'Selecionar todas'}
                      </button>
                      <div className="border-t border-gray-200 my-2"></div>
                      {rotas.map(rota => (
                        <label key={rota.id} className="flex items-center px-3 py-2 text-sm hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rotasSelecionadas.includes(rota.id)}
                            onChange={() => handleRotaChange(rota.id)}
                            className="mr-2 text-primary focus:ring-primary"
                          />
                          {rota.nome}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Rota</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Cidade</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Vendas 2024</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Meta 2025</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Vendas 2025</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente, index) => (
                  <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold mr-3 ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{cliente.nome}</div>
                          <div className="text-sm text-gray-500">{cliente.vendedor}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{cliente.rota}</td>
                    <td className="py-3 px-4 text-gray-700">{cliente.cidade}</td>
                    <td className="py-3 px-4 text-right text-gray-700">R$ {cliente.vendas2024.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-blue-700 font-medium">R$ {cliente.meta2025.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">R$ {cliente.vendas2025.toLocaleString()}</td>
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

export default TopClientes