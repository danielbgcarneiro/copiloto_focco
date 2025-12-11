import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, Shield, ChevronDown, ChevronUp, TrendingUp, MapPin, UserCheck, Home, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface DadosMensal {
  mes: string
  meta: number
  vendas: number
  atingimento: number
  vendedores: {
    nome: string
    meta: number
    vendas: number
    atingimento: number
  }[]
}

interface ClientesMensal {
  mes: string
  total2024: number
  total2025: number
  vendedores: {
    nome: string
    clientes2024: number
    clientes2025: number
  }[]
}

interface CidadesERP {
  totalCidades: number
  comVenda2024: number
  comVenda2025: number
}

const PagAcumuladoAno: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [anoAtual] = useState(new Date().getFullYear())
  const [selectedAno, setSelectedAno] = useState(2025)
  const [selectedVendedoresRealizado, setSelectedVendedoresRealizado] = useState<string[]>([
    'João Silva',
    'Maria Santos',
    'Pedro Costa',
    'Ana Oliveira',
    'Carlos Lima'
  ])
  const [selectedVendedoresClientes, setSelectedVendedoresClientes] = useState<string[]>([
    'João Silva',
    'Maria Santos',
    'Pedro Costa',
    'Ana Oliveira',
    'Carlos Lima'
  ])
  const [expandidoVendedores, setExpandidoVendedores] = useState(false)
  const [expandidoVendedoresClientesDropdown, setExpandidoVendedoresClientesDropdown] = useState(false)

  const dropdownVendedoresRealizadoRef = useRef<HTMLDivElement>(null)
  const dropdownVendedoresClientesRef = useRef<HTMLDivElement>(null)

  const [dadosRealizados] = useState<DadosMensal[]>([
    {
      mes: 'Janeiro',
      meta: 100000,
      vendas: 127000,
      atingimento: 127,
      vendedores: [
        { nome: 'João Silva', meta: 25000, vendas: 32000, atingimento: 128 },
        { nome: 'Maria Santos', meta: 22000, vendas: 26500, atingimento: 120.5 },
        { nome: 'Pedro Costa', meta: 20000, vendas: 18500, atingimento: 92.5 },
        { nome: 'Ana Oliveira', meta: 18000, vendas: 19200, atingimento: 106.7 },
        { nome: 'Carlos Lima', meta: 15000, vendas: 12800, atingimento: 85.3 }
      ]
    },
    {
      mes: 'Fevereiro',
      meta: 95000,
      vendas: 115000,
      atingimento: 121.1,
      vendedores: [
        { nome: 'João Silva', meta: 24000, vendas: 28500, atingimento: 118.8 },
        { nome: 'Maria Santos', meta: 21000, vendas: 25000, atingimento: 119.0 },
        { nome: 'Pedro Costa', meta: 19000, vendas: 17000, atingimento: 89.5 },
        { nome: 'Ana Oliveira', meta: 17000, vendas: 18500, atingimento: 108.8 },
        { nome: 'Carlos Lima', meta: 14000, vendas: 11500, atingimento: 82.1 }
      ]
    },
    {
      mes: 'Março',
      meta: 110000,
      vendas: 135000,
      atingimento: 122.7,
      vendedores: [
        { nome: 'João Silva', meta: 27000, vendas: 35000, atingimento: 129.6 },
        { nome: 'Maria Santos', meta: 24000, vendas: 28000, atingimento: 116.7 },
        { nome: 'Pedro Costa', meta: 22000, vendas: 19500, atingimento: 88.6 },
        { nome: 'Ana Oliveira', meta: 20000, vendas: 20000, atingimento: 100.0 },
        { nome: 'Carlos Lima', meta: 17000, vendas: 13500, atingimento: 79.4 }
      ]
    },
    {
      mes: 'Abril',
      meta: 105000,
      vendas: 125000,
      atingimento: 119.0,
      vendedores: [
        { nome: 'João Silva', meta: 26000, vendas: 31000, atingimento: 119.2 },
        { nome: 'Maria Santos', meta: 23000, vendas: 27500, atingimento: 119.6 },
        { nome: 'Pedro Costa', meta: 21000, vendas: 18000, atingimento: 85.7 },
        { nome: 'Ana Oliveira', meta: 19000, vendas: 19500, atingimento: 102.6 },
        { nome: 'Carlos Lima', meta: 16000, vendas: 12000, atingimento: 75.0 }
      ]
    },
    {
      mes: 'Maio',
      meta: 115000,
      vendas: 130000,
      atingimento: 113.0,
      vendedores: [
        { nome: 'João Silva', meta: 28000, vendas: 33500, atingimento: 119.6 },
        { nome: 'Maria Santos', meta: 25000, vendas: 26000, atingimento: 104.0 },
        { nome: 'Pedro Costa', meta: 23000, vendas: 19000, atingimento: 82.6 },
        { nome: 'Ana Oliveira', meta: 21000, vendas: 19000, atingimento: 90.5 },
        { nome: 'Carlos Lima', meta: 18000, vendas: 13000, atingimento: 72.2 }
      ]
    },
    {
      mes: 'Junho',
      meta: 108000,
      vendas: 120000,
      atingimento: 111.1,
      vendedores: [
        { nome: 'João Silva', meta: 26500, vendas: 30000, atingimento: 113.2 },
        { nome: 'Maria Santos', meta: 23500, vendas: 27000, atingimento: 114.9 },
        { nome: 'Pedro Costa', meta: 21500, vendas: 18500, atingimento: 86.0 },
        { nome: 'Ana Oliveira', meta: 19500, vendas: 19500, atingimento: 100.0 },
        { nome: 'Carlos Lima', meta: 17000, vendas: 12500, atingimento: 73.5 }
      ]
    },
    {
      mes: 'Julho',
      meta: 112000,
      vendas: 125000,
      atingimento: 111.6,
      vendedores: [
        { nome: 'João Silva', meta: 27500, vendas: 32000, atingimento: 116.4 },
        { nome: 'Maria Santos', meta: 24500, vendas: 26500, atingimento: 108.2 },
        { nome: 'Pedro Costa', meta: 22500, vendas: 18500, atingimento: 82.2 },
        { nome: 'Ana Oliveira', meta: 20500, vendas: 19200, atingimento: 93.7 },
        { nome: 'Carlos Lima', meta: 17000, vendas: 12800, atingimento: 75.3 }
      ]
    }
  ])

  const [dadosClientesUnicos] = useState<ClientesMensal[]>([
    {
      mes: 'Janeiro',
      total2024: 175,
      total2025: 103,
      vendedores: [
        { nome: 'João Silva', clientes2024: 45, clientes2025: 25 },
        { nome: 'Maria Santos', clientes2024: 38, clientes2025: 21 },
        { nome: 'Pedro Costa', clientes2024: 29, clientes2025: 15 },
        { nome: 'Ana Oliveira', clientes2024: 31, clientes2025: 16 },
        { nome: 'Carlos Lima', clientes2024: 22, clientes2025: 11 }
      ]
    },
    {
      mes: 'Fevereiro',
      total2024: 163,
      total2025: 91,
      vendedores: [
        { nome: 'João Silva', clientes2024: 42, clientes2025: 23 },
        { nome: 'Maria Santos', clientes2024: 36, clientes2025: 19 },
        { nome: 'Pedro Costa', clientes2024: 27, clientes2025: 14 },
        { nome: 'Ana Oliveira', clientes2024: 29, clientes2025: 15 },
        { nome: 'Carlos Lima', clientes2024: 20, clientes2025: 10 }
      ]
    },
    {
      mes: 'Março',
      total2024: 181,
      total2025: 105,
      vendedores: [
        { nome: 'João Silva', clientes2024: 48, clientes2025: 26 },
        { nome: 'Maria Santos', clientes2024: 40, clientes2025: 22 },
        { nome: 'Pedro Costa', clientes2024: 31, clientes2025: 16 },
        { nome: 'Ana Oliveira', clientes2024: 33, clientes2025: 17 },
        { nome: 'Carlos Lima', clientes2024: 24, clientes2025: 12 }
      ]
    },
    {
      mes: 'Abril',
      total2024: 170,
      total2025: 96,
      vendedores: [
        { nome: 'João Silva', clientes2024: 44, clientes2025: 24 },
        { nome: 'Maria Santos', clientes2024: 37, clientes2025: 20 },
        { nome: 'Pedro Costa', clientes2024: 28, clientes2025: 15 },
        { nome: 'Ana Oliveira', clientes2024: 30, clientes2025: 16 },
        { nome: 'Carlos Lima', clientes2024: 21, clientes2025: 11 }
      ]
    },
    {
      mes: 'Maio',
      total2024: 185,
      total2025: 109,
      vendedores: [
        { nome: 'João Silva', clientes2024: 46, clientes2025: 25 },
        { nome: 'Maria Santos', clientes2024: 39, clientes2025: 21 },
        { nome: 'Pedro Costa', clientes2024: 30, clientes2025: 16 },
        { nome: 'Ana Oliveira', clientes2024: 32, clientes2025: 17 },
        { nome: 'Carlos Lima', clientes2024: 23, clientes2025: 12 }
      ]
    },
    {
      mes: 'Junho',
      total2024: 165,
      total2025: 93,
      vendedores: [
        { nome: 'João Silva', clientes2024: 43, clientes2025: 23 },
        { nome: 'Maria Santos', clientes2024: 36, clientes2025: 19 },
        { nome: 'Pedro Costa', clientes2024: 27, clientes2025: 14 },
        { nome: 'Ana Oliveira', clientes2024: 29, clientes2025: 15 },
        { nome: 'Carlos Lima', clientes2024: 20, clientes2025: 10 }
      ]
    },
    {
      mes: 'Julho',
      total2024: 173,
      total2025: 98,
      vendedores: [
        { nome: 'João Silva', clientes2024: 45, clientes2025: 25 },
        { nome: 'Maria Santos', clientes2024: 38, clientes2025: 21 },
        { nome: 'Pedro Costa', clientes2024: 29, clientes2025: 15 },
        { nome: 'Ana Oliveira', clientes2024: 31, clientes2025: 16 },
        { nome: 'Carlos Lima', clientes2024: 22, clientes2025: 11 }
      ]
    }
  ])

  const [cidadesERP] = useState<CidadesERP>({
    totalCidades: 534,
    comVenda2024: 350,
    comVenda2025: 235
  })

  const calcularTotaisAno = () => {
    const totalMeta = filteredDadosRealizados.reduce((acc, mes) => acc + mes.meta, 0)
    const totalVendas = filteredDadosRealizados.reduce((acc, mes) => acc + mes.vendas, 0)
    const atingimentoGeral = (totalVendas / totalMeta) * 100

    return { totalMeta, totalVendas, atingimentoGeral }
  }

  const calcularTotaisClientesAno = () => {
    const total2024 = filteredDadosClientesUnicos.reduce((acc, mes) => acc + mes.total2024, 0)
    const total2025 = filteredDadosClientesUnicos.reduce((acc, mes) => acc + mes.total2025, 0)

    return { total2024, total2025 }
  }

  const filteredDadosRealizados = useMemo(() => {
    return dadosRealizados.map((mes) => ({
      ...mes,
      vendedores: mes.vendedores.filter((v) => selectedVendedoresRealizado.includes(v.nome)),
      meta: mes.vendedores
        .filter((v) => selectedVendedoresRealizado.includes(v.nome))
        .reduce((acc, v) => acc + v.meta, 0),
      vendas: mes.vendedores
        .filter((v) => selectedVendedoresRealizado.includes(v.nome))
        .reduce((acc, v) => acc + v.vendas, 0),
      atingimento: (() => {
        const filteredVendedores = mes.vendedores.filter((v) => selectedVendedoresRealizado.includes(v.nome))
        const totalMeta = filteredVendedores.reduce((acc, v) => acc + v.meta, 0)
        const totalVendas = filteredVendedores.reduce((acc, v) => acc + v.vendas, 0)
        return totalMeta > 0 ? (totalVendas / totalMeta) * 100 : 0
      })()
    }))
  }, [dadosRealizados, selectedVendedoresRealizado])

  const filteredDadosClientesUnicos = useMemo(() => {
    return dadosClientesUnicos.map((mes) => ({
      ...mes,
      vendedores: mes.vendedores.filter((v) => selectedVendedoresClientes.includes(v.nome)),
      total2024: mes.vendedores
        .filter((v) => selectedVendedoresClientes.includes(v.nome))
        .reduce((acc, v) => acc + v.clientes2024, 0),
      total2025: mes.vendedores
        .filter((v) => selectedVendedoresClientes.includes(v.nome))
        .reduce((acc, v) => acc + v.clientes2025, 0)
    }))
  }, [dadosClientesUnicos, selectedVendedoresClientes])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownVendedoresRealizadoRef.current && !dropdownVendedoresRealizadoRef.current.contains(event.target as Node)) {
        setExpandidoVendedores(false)
      }
      if (dropdownVendedoresClientesRef.current && !dropdownVendedoresClientesRef.current.contains(event.target as Node)) {
        setExpandidoVendedoresClientesDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const { totalMeta, totalVendas, atingimentoGeral } = calcularTotaisAno()
  const { total2024, total2025 } = calcularTotaisClientesAno()

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
              <h1 className="text-base sm:text-lg font-bold">Acumulado do Ano</h1>
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
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg whitespace-nowrap"
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
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
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
            Painel Acumulado
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Visão completa do desempenho anual por mês e análise de clientes únicos
          </p>
        </div>

        {/* Realizado 2025 */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Realizado</h3>
            
            {/* Filtros dentro da tabela */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
              {/* Ano Filter */}
              <div>
                <select
                  value={selectedAno}
                  onChange={(e) => setSelectedAno(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white hover:border-gray-400 text-gray-900 font-medium text-sm"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                </select>
              </div>

              {/* Vendedor Filter */}
              {expandidoVendedores ? (
                <div className="relative" ref={dropdownVendedoresRealizadoRef}>
                  <button
                    onClick={() => setExpandidoVendedores(!expandidoVendedores)}
                    className="w-full px-4 py-2 text-left border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white hover:border-gray-400 text-gray-900 font-medium text-sm flex items-center justify-between"
                  >
                    <span>
                      <span className="font-semibold">Vendedores</span>
                      <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full inline-block">
                        {selectedVendedoresRealizado.length}/{5}
                      </span>
                    </span>
                    <ChevronUp className="h-4 w-4 text-gray-500 transition-transform flex-shrink-0" />
                  </button>

                  <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 rounded-lg bg-white p-3 space-y-2 z-10 shadow-lg">
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira', 'Carlos Lima'].map((vendedor) => (
                        <label key={vendedor} className="flex items-center cursor-pointer group text-sm">
                          <input
                            type="checkbox"
                            checked={selectedVendedoresRealizado.includes(vendedor)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVendedoresRealizado([...selectedVendedoresRealizado, vendedor])
                              } else {
                                setSelectedVendedoresRealizado(selectedVendedoresRealizado.filter(v => v !== vendedor))
                              }
                            }}
                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer transition-all"
                          />
                          <span className="ml-2 text-gray-700 group-hover:text-primary transition-colors">{vendedor}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div ref={dropdownVendedoresRealizadoRef}>
                  <button
                    onClick={() => setExpandidoVendedores(!expandidoVendedores)}
                    className="w-full px-4 py-2 text-left border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white hover:border-gray-400 text-gray-900 font-medium text-sm flex items-center justify-between"
                  >
                    <span>
                      <span className="font-semibold">Vendedores</span>
                      <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full inline-block">
                        {selectedVendedoresRealizado.length}/{5}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-500 transition-transform flex-shrink-0" />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Mês</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Meta</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Vendas</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Atingimento</th>
                </tr>
              </thead>
              <tbody>
                {filteredDadosRealizados.map((mesData) => (
                  <React.Fragment key={mesData.mes}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{mesData.mes}</td>
                      <td className="py-3 px-4 text-right text-gray-700">R$ {mesData.meta.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">R$ {mesData.vendas.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold ${
                          mesData.atingimento >= 100 ? 'text-green-600' :
                          mesData.atingimento >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {mesData.atingimento.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                  <td className="py-3 px-4 text-gray-900">Total Geral</td>
                  <td className="py-3 px-4 text-right text-gray-900">R$ {totalMeta.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-gray-900">R$ {totalVendas.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`${
                      atingimentoGeral >= 100 ? 'text-green-600' :
                      atingimentoGeral >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {atingimentoGeral.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Clientes únicos por mês */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Clientes por mês</h3>
            
            {/* Filtro de Vendedor */}
            {expandidoVendedoresClientesDropdown ? (
              <div className="relative w-full sm:w-auto" ref={dropdownVendedoresClientesRef}>
                <button
                  onClick={() => setExpandidoVendedoresClientesDropdown(!expandidoVendedoresClientesDropdown)}
                  className="w-full px-4 py-2 text-left border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white hover:border-gray-400 text-gray-900 font-medium text-sm flex items-center justify-between"
                >
                  <span>
                    <span className="font-semibold">Vendedores</span>
                    <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full inline-block">
                      {selectedVendedoresClientes.length}/{5}
                    </span>
                  </span>
                  <ChevronUp className="h-4 w-4 text-gray-500 transition-transform flex-shrink-0" />
                </button>

                <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 rounded-lg bg-white p-3 space-y-2 z-10 shadow-lg">
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira', 'Carlos Lima'].map((vendedor) => (
                      <label key={vendedor} className="flex items-center cursor-pointer group text-sm">
                        <input
                          type="checkbox"
                          checked={selectedVendedoresClientes.includes(vendedor)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVendedoresClientes([...selectedVendedoresClientes, vendedor])
                            } else {
                              setSelectedVendedoresClientes(selectedVendedoresClientes.filter(v => v !== vendedor))
                            }
                          }}
                          className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer transition-all"
                        />
                        <span className="ml-2 text-gray-700 group-hover:text-primary transition-colors">{vendedor}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div ref={dropdownVendedoresClientesRef}>
                <button
                  onClick={() => setExpandidoVendedoresClientesDropdown(!expandidoVendedoresClientesDropdown)}
                  className="w-full sm:w-auto px-4 py-2 text-left border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white hover:border-gray-400 text-gray-900 font-medium text-sm flex items-center justify-between"
                >
                  <span>
                    <span className="font-semibold">Vendedores</span>
                    <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full inline-block">
                      {selectedVendedoresClientes.length}/{5}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500 transition-transform flex-shrink-0" />
                </button>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Mês</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">2024</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">2025</th>
                </tr>
              </thead>
              <tbody>
                {filteredDadosClientesUnicos.map((mesData) => (
                  <React.Fragment key={mesData.mes}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{mesData.mes}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{mesData.total2024}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">{mesData.total2025}</td>
                    </tr>
                  </React.Fragment>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                  <td className="py-3 px-4 text-gray-900">Total Geral</td>
                  <td className="py-3 px-4 text-right text-gray-900">{total2024}</td>
                  <td className="py-3 px-4 text-right text-gray-900">{total2025}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Total de cidades com clientes no ERP */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Total de cidades com clientes no ERP</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="text-3xl font-bold text-blue-900 mb-2">{cidadesERP.totalCidades}</div>
              <div className="text-sm font-medium text-blue-700">Total de Cidades</div>
            </div>
            
            <div className="text-center p-6 bg-orange-50 rounded-lg border-l-4 border-orange-500">
              <div className="text-3xl font-bold text-orange-900 mb-2">{cidadesERP.comVenda2024}</div>
              <div className="text-sm font-medium text-orange-700">Com Venda em 2024</div>
            </div>
            
            <div className="text-center p-6 bg-green-50 rounded-lg border-l-4 border-green-500">
              <div className="text-3xl font-bold text-green-900 mb-2">{cidadesERP.comVenda2025}</div>
              <div className="text-sm font-medium text-green-700">Com Venda em 2025</div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 text-center">
              <strong>Cobertura:</strong> {((cidadesERP.comVenda2025 / cidadesERP.totalCidades) * 100).toFixed(1)}% das cidades com vendas em {anoAtual}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PagAcumuladoAno