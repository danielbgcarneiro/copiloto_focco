import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, Shield, TrendingUp, MapPin, UserCheck, Home, ArrowLeft, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

interface RotaData {
  rota: string
  nome_rota: string
  vendedor_apelido: string
  vendedor_uuid: string
  qtd_oticas: number
  vendido_2025: number
  meta_2025: number
  percentual_meta: number
  ranking: number
}

interface CidadeData {
  cidade: string
  vendedor_apelido: string
  vendedor_uuid: string
  codigo_ibge_cidade: string
  qtd_oticas: number
  valor_vendas: number
  ranking: number
}

interface CidadeComMeta {
  cidade: string
  codigo_ibge_cidade: string
  rota: string
  vendedor_apelido: string
  meta_cidade: number
  vendas_cidade: number
  qtd_clientes: number
  percentual_atingimento: number
  saldo_meta: number
}

interface VendedorInfo {
  uuid: string
  nome: string
}

type RotaSortField = 'rota' | 'meta_2025' | 'vendido_2025' | 'percentual_meta'
type CidadeSortField = 'cidade' | 'valor_vendas'
type SortDirection = 'asc' | 'desc'

const DashboardRotas: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rotasData, setRotasData] = useState<RotaData[]>([])
  const [cidadesData, setCidadesData] = useState<CidadeData[]>([])
  const [vendedores, setVendedores] = useState<VendedorInfo[]>([])
  
  // Estados para filtros
  const [vendedoresSelecionadosRotas, setVendedoresSelecionadosRotas] = useState<string[]>([])
  const [vendedoresSelecionadosCidades, setVendedoresSelecionadosCidades] = useState<string[]>([])
  const [dropdownRotasAberto, setDropdownRotasAberto] = useState(false)
  const [dropdownCidadesAberto, setDropdownCidadesAberto] = useState(false)
  
  // Refs para detectar cliques fora dos dropdowns
  const dropdownRotasRef = useRef<HTMLDivElement>(null)
  const dropdownCidadesRef = useRef<HTMLDivElement>(null)
  
  // Estados para expansão de rotas
  const [expandedRota, setExpandedRota] = useState<string | null>(null)
  const [cidadesComMeta, setCidadesComMeta] = useState<Map<string, CidadeComMeta[]>>(new Map())
  const [loadingCidades, setLoadingCidades] = useState(false)
  const [sortCidadesExpandidas, setSortCidadesExpandidas] = useState<{ field: keyof CidadeComMeta; direction: SortDirection }>({ field: 'vendas_cidade', direction: 'desc' })
  
  // Estados para ordenação
  const [sortRotas, setSortRotas] = useState<{ field: RotaSortField; direction: SortDirection }>({ field: 'vendido_2025', direction: 'desc' })
  const [sortCidades, setSortCidades] = useState<{ field: CidadeSortField; direction: SortDirection }>({ field: 'valor_vendas', direction: 'desc' })

  // Carregar dados das views do Supabase
  useEffect(() => {
    const carregarDados = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Carregar dados de rotas
        const { data: rotasResponse, error: rotasError } = await supabase
          .from('vw_ranking_rotas')
          .select('*')
          .order('percentual_meta', { ascending: false })

        if (rotasError) {
          console.error('Erro ao carregar rotas:', rotasError)
        } else {
          setRotasData(rotasResponse || [])
        }

        // Carregar dados de cidades
        const { data: cidadesResponse, error: cidadesError } = await supabase
          .from('vw_top10_cidades')
          .select('*')
          .order('valor_vendas', { ascending: false })
          .limit(30)

        if (cidadesError) {
          console.error('Erro ao carregar cidades:', cidadesError)
        } else {
          setCidadesData(cidadesResponse || [])
        }

        // Carregar lista de vendedores únicos
        const vendedoresUnicos = new Map<string, string>()
        
        rotasResponse?.forEach(rota => {
          if (rota.vendedor_uuid && rota.vendedor_apelido) {
            vendedoresUnicos.set(rota.vendedor_uuid, rota.vendedor_apelido)
          }
        })

        cidadesResponse?.forEach(cidade => {
          if (cidade.vendedor_uuid && cidade.vendedor_apelido) {
            vendedoresUnicos.set(cidade.vendedor_uuid, cidade.vendedor_apelido)
          }
        })

        const vendedoresList = Array.from(vendedoresUnicos.entries()).map(([uuid, nome]) => ({
          uuid,
          nome
        }))

        setVendedores(vendedoresList)

      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    carregarDados()
  }, [user])

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRotasRef.current && !dropdownRotasRef.current.contains(event.target as Node)) {
        setDropdownRotasAberto(false)
      }
      if (dropdownCidadesRef.current && !dropdownCidadesRef.current.contains(event.target as Node)) {
        setDropdownCidadesAberto(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtrar dados baseado na seleção de vendedores
  const rotasFiltradas = useMemo(() => {
    if (vendedoresSelecionadosRotas.length === 0) return rotasData
    return rotasData.filter(rota => 
      vendedoresSelecionadosRotas.includes(rota.vendedor_uuid)
    )
  }, [rotasData, vendedoresSelecionadosRotas])

  const cidadesFiltradas = useMemo(() => {
    if (vendedoresSelecionadosCidades.length === 0) return cidadesData
    return cidadesData.filter(cidade => 
      vendedoresSelecionadosCidades.includes(cidade.vendedor_uuid)
    )
  }, [cidadesData, vendedoresSelecionadosCidades])

  // Ordenar dados
  const rotasOrdenadas = useMemo(() => {
    return [...rotasFiltradas].sort((a, b) => {
      const aValue = a[sortRotas.field]
      const bValue = b[sortRotas.field]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortRotas.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return sortRotas.direction === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })
  }, [rotasFiltradas, sortRotas])

  const cidadesOrdenadas = useMemo(() => {
    return [...cidadesFiltradas].sort((a, b) => {
      const aValue = a[sortCidades.field]
      const bValue = b[sortCidades.field]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortCidades.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return sortCidades.direction === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })
  }, [cidadesFiltradas, sortCidades])

  const handleSortRotas = (field: RotaSortField) => {
    setSortRotas(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  const handleSortCidades = (field: CidadeSortField) => {
    setSortCidades(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  const handleVendedorChangeRotas = (vendedorUuid: string) => {
    setVendedoresSelecionadosRotas(prev => 
      prev.includes(vendedorUuid) 
        ? prev.filter(uuid => uuid !== vendedorUuid)
        : [...prev, vendedorUuid]
    )
  }

  const handleVendedorChangeCidades = (vendedorUuid: string) => {
    setVendedoresSelecionadosCidades(prev => 
      prev.includes(vendedorUuid) 
        ? prev.filter(uuid => uuid !== vendedorUuid)
        : [...prev, vendedorUuid]
    )
  }

  const selecionarTodosRotas = () => {
    if (vendedoresSelecionadosRotas.length === vendedores.length) {
      setVendedoresSelecionadosRotas([])
    } else {
      setVendedoresSelecionadosRotas(vendedores.map(v => v.uuid))
    }
  }

  const selecionarTodosCidades = () => {
    if (vendedoresSelecionadosCidades.length === vendedores.length) {
      setVendedoresSelecionadosCidades([])
    } else {
      setVendedoresSelecionadosCidades(vendedores.map(v => v.uuid))
    }
  }

  const getSortIcon = (field: RotaSortField | CidadeSortField, currentSort: { field: RotaSortField | CidadeSortField; direction: SortDirection }) => {
    if (currentSort.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }
    return currentSort.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-primary" />
      : <ArrowDown className="h-4 w-4 text-primary" />
  }

  const carregarCidadesRota = async (rotaNome: string) => {
    if (cidadesComMeta.has(rotaNome)) return

    try {
      setLoadingCidades(true)
      const { data, error } = await supabase
        .from('vw_cidades_com_meta')
        .select('*')
        .eq('rota', rotaNome)
        .order('vendas_cidade', { ascending: false })

      if (error) throw error
      
      const novoMapa = new Map(cidadesComMeta)
      novoMapa.set(rotaNome, data || [])
      setCidadesComMeta(novoMapa)
    } catch (error) {
      console.error('Erro ao carregar cidades:', error)
    } finally {
      setLoadingCidades(false)
    }
  }

  const toggleRotaExpansao = (rotaNome: string) => {
    if (expandedRota === rotaNome) {
      setExpandedRota(null)
    } else {
      setExpandedRota(rotaNome)
      carregarCidadesRota(rotaNome)
    }
  }

  const handleSortCidadesExpandidas = (field: keyof CidadeComMeta) => {
    setSortCidadesExpandidas(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  const getCidadesOrdenadas = (cidades: CidadeComMeta[]): CidadeComMeta[] => {
    return [...cidades].sort((a, b) => {
      const aValue = a[sortCidadesExpandidas.field]
      const bValue = b[sortCidadesExpandidas.field]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortCidadesExpandidas.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return sortCidadesExpandidas.direction === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })
  }

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor)
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
              <h1 className="text-base sm:text-lg font-bold">Dashboard Rotas</h1>
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
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg whitespace-nowrap"
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
            Dashboard de Rotas
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Análise detalhada do desempenho por rotas e cidades
          </p>
        </div>

        {/* Top Rotas */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Ranking de Rotas</h3>
            
            {/* Filtro Vendedores */}
            <div className="relative" ref={dropdownRotasRef}>
              <button
                onClick={() => setDropdownRotasAberto(!dropdownRotasAberto)}
                className="flex items-center justify-between w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              >
                <span className="text-gray-700">
                  {vendedoresSelecionadosRotas.length === 0 
                    ? 'Todos os vendedores'
                    : vendedoresSelecionadosRotas.length === vendedores.length
                    ? 'Todos selecionados'
                    : `${vendedoresSelecionadosRotas.length} selecionados`
                  }
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              
              {dropdownRotasAberto && (
                <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <button
                      onClick={selecionarTodosRotas}
                      className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded"
                    >
                      {vendedoresSelecionadosRotas.length === vendedores.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                    <div className="border-t border-gray-200 my-2"></div>
                    {vendedores.map(vendedor => (
                      <label key={vendedor.uuid} className="flex items-center px-3 py-2 text-sm hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vendedoresSelecionadosRotas.includes(vendedor.uuid)}
                          onChange={() => handleVendedorChangeRotas(vendedor.uuid)}
                          className="mr-2 text-primary focus:ring-primary"
                        />
                        {vendedor.nome}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    <button
                      onClick={() => handleSortRotas('rota')}
                      className="flex items-center space-x-1 hover:text-gray-900"
                    >
                      <span>Rota</span>
                      {getSortIcon('rota', sortRotas)}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Vendedor</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    <button
                      onClick={() => handleSortRotas('meta_2025')}
                      className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                    >
                      <span>Meta</span>
                      {getSortIcon('meta_2025', sortRotas)}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    <button
                      onClick={() => handleSortRotas('vendido_2025')}
                      className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                    >
                      <span>Vendas</span>
                      {getSortIcon('vendido_2025', sortRotas)}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    <button
                      onClick={() => handleSortRotas('percentual_meta')}
                      className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                    >
                      <span>Atingimento</span>
                      {getSortIcon('percentual_meta', sortRotas)}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rotasOrdenadas.map((rota) => (
                  <React.Fragment key={`${rota.vendedor_uuid}-${rota.rota}`}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => toggleRotaExpansao(rota.rota)}>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        <div className="flex items-center space-x-2">
                          <span>{expandedRota === rota.rota ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                          <span>{rota.rota}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{rota.vendedor_apelido}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{formatarMoeda(rota.meta_2025)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatarMoeda(rota.vendido_2025)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold ${
                          rota.percentual_meta >= 100 ? 'text-green-600' :
                          rota.percentual_meta >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {rota.percentual_meta.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                    {expandedRota === rota.rota && (
                      <tr className="border-b border-gray-200">
                        <td colSpan={5} className="p-0">
                          <div className="bg-gray-50 p-4">
                            {loadingCidades ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                <span className="ml-2 text-sm text-gray-600">Carregando cidades...</span>
                              </div>
                            ) : (cidadesComMeta.get(rota.rota) || []).length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-200">
                                      <th className="text-left px-3 py-2 font-semibold text-gray-700">Cidade</th>
                                      <th className="text-right px-3 py-2 font-semibold text-gray-700">
                                        <button
                                          onClick={() => handleSortCidadesExpandidas('meta_cidade')}
                                          className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                                        >
                                          <span>Meta</span>
                                          {getSortIcon('meta_cidade', sortCidadesExpandidas)}
                                        </button>
                                      </th>
                                      <th className="text-right px-3 py-2 font-semibold text-gray-700">
                                        <button
                                          onClick={() => handleSortCidadesExpandidas('vendas_cidade')}
                                          className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                                        >
                                          <span>Vendas</span>
                                          {getSortIcon('vendas_cidade', sortCidadesExpandidas)}
                                        </button>
                                      </th>
                                      <th className="text-right px-3 py-2 font-semibold text-gray-700">
                                        <button
                                          onClick={() => handleSortCidadesExpandidas('percentual_atingimento')}
                                          className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                                        >
                                          <span>Atingimento</span>
                                          {getSortIcon('percentual_atingimento', sortCidadesExpandidas)}
                                        </button>
                                      </th>
                                      <th className="text-right px-3 py-2 font-semibold text-gray-700">
                                        <button
                                          onClick={() => handleSortCidadesExpandidas('qtd_clientes')}
                                          className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                                        >
                                          <span>Clientes</span>
                                          {getSortIcon('qtd_clientes', sortCidadesExpandidas)}
                                        </button>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {getCidadesOrdenadas(cidadesComMeta.get(rota.rota) || []).map((cidade) => (
                                      <tr key={cidade.codigo_ibge_cidade} className="border-b border-gray-200 hover:bg-white">
                                        <td className="px-3 py-2 text-gray-900 font-medium">{cidade.cidade}</td>
                                        <td className="text-right px-3 py-2 text-gray-700">{formatarMoeda(cidade.meta_cidade)}</td>
                                        <td className="text-right px-3 py-2 font-semibold text-gray-900">{formatarMoeda(cidade.vendas_cidade)}</td>
                                        <td className="text-right px-3 py-2">
                                          <span className={`font-bold ${
                                            cidade.percentual_atingimento >= 100 ? 'text-green-600' :
                                            cidade.percentual_atingimento >= 80 ? 'text-yellow-600' :
                                            'text-red-600'
                                          }`}>
                                            {cidade.percentual_atingimento.toFixed(1)}%
                                          </span>
                                        </td>
                                        <td className="text-right px-3 py-2 text-gray-700">{cidade.qtd_clientes}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-center text-gray-600 text-sm">Nenhuma cidade encontrada</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Cidades */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Top Cidades (30 com mais vendas)</h3>
            
            {/* Filtro Vendedores */}
            <div className="relative" ref={dropdownCidadesRef}>
              <button
                onClick={() => setDropdownCidadesAberto(!dropdownCidadesAberto)}
                className="flex items-center justify-between w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              >
                <span className="text-gray-700">
                  {vendedoresSelecionadosCidades.length === 0 
                    ? 'Todos os vendedores'
                    : vendedoresSelecionadosCidades.length === vendedores.length
                    ? 'Todos selecionados'
                    : `${vendedoresSelecionadosCidades.length} selecionados`
                  }
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              
              {dropdownCidadesAberto && (
                <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <button
                      onClick={selecionarTodosCidades}
                      className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded"
                    >
                      {vendedoresSelecionadosCidades.length === vendedores.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                    <div className="border-t border-gray-200 my-2"></div>
                    {vendedores.map(vendedor => (
                      <label key={vendedor.uuid} className="flex items-center px-3 py-2 text-sm hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vendedoresSelecionadosCidades.includes(vendedor.uuid)}
                          onChange={() => handleVendedorChangeCidades(vendedor.uuid)}
                          className="mr-2 text-primary focus:ring-primary"
                        />
                        {vendedor.nome}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    <button
                      onClick={() => handleSortCidades('cidade')}
                      className="flex items-center space-x-1 hover:text-gray-900"
                    >
                      <span>Cidade</span>
                      {getSortIcon('cidade', sortCidades)}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Vendedor</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Óticas</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    <button
                      onClick={() => handleSortCidades('valor_vendas')}
                      className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                    >
                      <span>Vendas</span>
                      {getSortIcon('valor_vendas', sortCidades)}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cidadesOrdenadas.map((cidade) => (
                  <tr key={`${cidade.vendedor_uuid}-${cidade.codigo_ibge_cidade}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{cidade.cidade}</td>
                    <td className="py-3 px-4 text-gray-700">{cidade.vendedor_apelido}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{cidade.qtd_oticas}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatarMoeda(cidade.valor_vendas)}</td>
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

export default DashboardRotas