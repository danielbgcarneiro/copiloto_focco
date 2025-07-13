import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Filter, User, LogOut, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'
import { getClientesPorVendedor, getCorPrioridade } from '../../lib/queries/clientes'

const Clientes: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { } = useUserData()
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('nome')

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Carregar clientes ao montar o componente
  useEffect(() => {
    carregarClientes()
  }, [user])

  async function carregarClientes() {
    try {
      setLoading(true)
      const dados = await getClientesPorVendedor(user?.id)
      console.log('Dados carregados:', dados)
      console.log('Primeiro cliente:', dados[0])
      setClientes(dados)
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Função para normalizar texto removendo acentos e caracteres especiais
  const normalizeText = (text: string): string => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/gi, '') // Remove caracteres especiais exceto espaços
      .toLowerCase()
      .trim()
  }

  // Função para formatar valores
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor || 0)
  }

  // Filtrar e ordenar clientes
  const clientesFiltrados = clientes
    .filter(cliente => {
      const normalizedSearchTerm = normalizeText(searchTerm)
      return normalizeText(cliente.nome_fantasia).includes(normalizedSearchTerm) ||
             normalizeText(cliente.codigo_cliente.toString()).includes(normalizedSearchTerm)
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'bairro-az':
          return (a.bairro || '').localeCompare(b.bairro || '')
        case 'bairro-za':
          return (b.bairro || '').localeCompare(a.bairro || '')
        case 'maior-oportunidade':
          return (b.oportunidade || 0) - (a.oportunidade || 0)
        case 'menor-oportunidade':
          return (a.oportunidade || 0) - (b.oportunidade || 0)
        case 'dsv':
          return (b.dias_sem_comprar || 0) - (a.dias_sem_comprar || 0)
        default:
          return a.nome_fantasia.localeCompare(b.nome_fantasia)
      }
    })


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando clientes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 relative">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/cidades')}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
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
                onClick={() => { logout(); navigate('/') }}
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
        {/* Search Bar */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar Óticas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="relative flex-shrink-0" ref={sortMenuRef}>
            <button 
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              onClick={() => setShowSortMenu(!showSortMenu)}
            >
              <Filter className="h-4 w-4 text-gray-600" />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-36">
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200"
                  onClick={() => { setSortBy('bairro-az'); setShowSortMenu(false) }}
                >
                  A-Z
                </button>
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200"
                  onClick={() => { setSortBy('bairro-za'); setShowSortMenu(false) }}
                >
                  Z-A
                </button>
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200"
                  onClick={() => { setSortBy('bairro'); setShowSortMenu(false) }}
                >
                  Bairro
                </button>
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200"
                  onClick={() => { setSortBy('maior-oportunidade'); setShowSortMenu(false) }}
                >
                  Maior Oport
                </button>
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50"
                  onClick={() => { setSortBy('menor-oportunidade'); setShowSortMenu(false) }}
                >
                  Menor Oport
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Clientes List */}
        <div className="space-y-3">
          {clientesFiltrados.map((cliente) => {
            const corPrioridade = getCorPrioridade(cliente.acao_recomendada)
            
            return (
              <div
                key={cliente.codigo_cliente}
                className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer ${corPrioridade}`}
                onClick={() => {
                  console.log('Clicou no cliente:', cliente.codigo_cliente);
                  console.log('Navegando para:', `/clientes/detalhes/${cliente.codigo_cliente}`);
                  navigate(`/clientes/detalhes/${cliente.codigo_cliente}`);
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-semibold text-gray-900">{cliente.nome_fantasia}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        cliente.status_financeiro === 'INADIMPLENTE' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {cliente.status_financeiro}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-600">DSV:</span>
                      <span className="text-xs font-semibold text-red-600">{cliente.dias_sem_comprar || 0}d</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 leading-tight">Código: {cliente.codigo_cliente}</p>

                  
                  <div className="grid grid-cols-2 gap-2 text-xs leading-tight">
                    <div>
                      <span className="text-green-600">Oportunidade:</span>
                      <span className="ml-1 font-semibold text-green-700">{formatarMoeda(cliente.oportunidade)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-600">Limit Créd:</span>
                      <span className="ml-1 font-semibold text-gray-800">{formatarMoeda(cliente.valor_limite_credito)}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">Meta:</span>
                      <span className="ml-1 font-semibold text-blue-700">{formatarMoeda(cliente.meta_2025)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-600">Bairro:</span>
                      <span className="ml-1 font-semibold text-gray-800">{cliente.bairro || '-'}</span>
                    </div>
                    <div>
                      <span className="text-purple-600">Vendido:</span>
                      <span className="ml-1 font-semibold text-purple-700">{formatarMoeda(cliente.valor_vendas_2025)}</span>
                    </div>
                    <div></div>
                  </div>

                  
                  {/* Ação Recomendada */}
                  {cliente.acao_recomendada && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-600" />
                        <p className="text-xs font-medium text-gray-900 leading-tight">
                          {cliente.acao_recomendada}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Mensagem se não houver clientes */}
        {clientesFiltrados.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">Nenhum cliente encontrado</p>
            <p className="text-sm">Tente ajustar os filtros para encontrar os clientes desejados.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default Clientes