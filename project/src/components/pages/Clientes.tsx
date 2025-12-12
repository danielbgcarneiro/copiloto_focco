import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Search, Filter, User, LogOut, Check, Clock, MapPin, AlertTriangle, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'
import { getClientesPorVendedor, fazerCheckInVisita, cancelarVisita } from '../../lib/queries/clientes'
import { getEmptyStateMessage } from '../../lib/utils/userHelpers'

const Clientes: React.FC = () => {
  const navigate = useNavigate()
  const { rotaId, cidadeNome } = useParams<{ rotaId: string; cidadeNome: string }>()
  const { user, logout } = useAuth()
  const { } = useUserData()
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('nome')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [clienteParaCancelar, setClienteParaCancelar] = useState<number | null>(null)
  const [processandoVisita, setProcessandoVisita] = useState<number | null>(null)

  // Decodificar parâmetros da URL
  const rotaNome = rotaId ? decodeURIComponent(rotaId) : null
  const cidadeDecodificada = cidadeNome ? decodeURIComponent(cidadeNome) : null

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
  }, [user, cidadeDecodificada])

  async function carregarClientes() {
    try {
      setLoading(true)
      console.log('🔍 Carregando clientes para cidade:', cidadeDecodificada)
      
      // Buscar clientes direto com filtro por cidade (se especificada)
      const dados = await getClientesPorVendedor(undefined, cidadeDecodificada || undefined)
      console.log('✅ Clientes carregados:', dados)
      
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



  // Filtrar e ordenar clientes
  const clientesFiltrados = clientes
    .filter(cliente => {
      const normalizedSearchTerm = normalizeText(searchTerm)
      return normalizeText(cliente.nome_fantasia).includes(normalizedSearchTerm) ||
             normalizeText(cliente.codigo_cliente.toString()).includes(normalizedSearchTerm) ||
             normalizeText(cliente.bairro || '').includes(normalizedSearchTerm)
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'nome':
          return a.nome_fantasia.localeCompare(b.nome_fantasia)
        case 'nome-za':
          return b.nome_fantasia.localeCompare(a.nome_fantasia)
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

  // Função para lidar com click no check button
  const handleCheckClick = async (cliente: any, event: React.MouseEvent) => {
    event.stopPropagation() // Evita navegação para detalhes do cliente
    
    if (processandoVisita === cliente.codigo_cliente) {
      return // Já está processando
    }

    if (cliente.visitado) {
      // Se já visitado, mostrar modal de confirmação para cancelar
      setClienteParaCancelar(cliente.codigo_cliente)
      setShowConfirmModal(true)
    } else {
      // Se não visitado, fazer check-in
      await realizarCheckIn(cliente.codigo_cliente)
    }
  }

  // Função para realizar check-in
  const realizarCheckIn = async (codigoCliente: number) => {
    try {
      setProcessandoVisita(codigoCliente)
      await fazerCheckInVisita(codigoCliente)
      
      // Atualizar estado local imediatamente
      setClientes(prev => prev.map(c => 
        c.codigo_cliente === codigoCliente 
          ? { ...c, visitado: true }
          : c
      ))
      
      // Mensagem de sucesso
      alert('✅ Visita registrada com sucesso!')
    } catch (error) {
      console.error('Erro ao fazer check-in:', error)
      const message = error instanceof Error ? error.message : 'Erro ao registrar visita. Tente novamente.'
      alert('❌ ' + message)
    } finally {
      setProcessandoVisita(null)
    }
  }

  // Função para confirmar cancelamento
  const confirmarCancelamento = async () => {
    if (!clienteParaCancelar) return

    try {
      setProcessandoVisita(clienteParaCancelar)
      await cancelarVisita(clienteParaCancelar)
      
      // Atualizar estado local imediatamente
      setClientes(prev => prev.map(c => 
        c.codigo_cliente === clienteParaCancelar 
          ? { ...c, visitado: false }
          : c
      ))
      
      // Mensagem de sucesso
      alert('✅ Visita cancelada com sucesso!')
    } catch (error) {
      console.error('Erro ao cancelar visita:', error)
      const message = error instanceof Error ? error.message : 'Erro ao cancelar visita. Tente novamente.'
      alert('❌ ' + message)
    } finally {
      setProcessandoVisita(null)
      setShowConfirmModal(false)
      setClienteParaCancelar(null)
    }
  }

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
                onClick={() => navigate(`/rotas/${encodeURIComponent(rotaNome || '')}/cidades`)}
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
        {/* Breadcrumb */}
        {(rotaNome || cidadeDecodificada) && (
          <div className="mb-4 px-2">
            <div className="flex items-center text-sm text-gray-600">
              {rotaNome && <span>Rota: <span className="font-semibold text-primary">{rotaNome}</span></span>}
              {rotaNome && cidadeDecodificada && <span className="mx-2">•</span>}
              {cidadeDecodificada && <span>Cidade: <span className="font-semibold text-primary">{cidadeDecodificada}</span></span>}
            </div>
          </div>
        )}
        
        {/* Search Bar */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar óticas / bairro..."
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
                  onClick={() => { setSortBy('nome'); setShowSortMenu(false) }}
                >
                  Nome A-Z
                </button>
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200"
                  onClick={() => { setSortBy('nome-za'); setShowSortMenu(false) }}
                >
                  Nome Z-A
                </button>
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200"
                  onClick={() => { setSortBy('bairro-az'); setShowSortMenu(false) }}
                >
                  Bairro A-Z
                </button>
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200"
                  onClick={() => { setSortBy('bairro-za'); setShowSortMenu(false) }}
                >
                  Bairro Z-A
                </button>
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200"
                  onClick={() => { setSortBy('maior-oportunidade'); setShowSortMenu(false) }}
                >
                  Maior Oport
                </button>
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200"
                  onClick={() => { setSortBy('menor-oportunidade'); setShowSortMenu(false) }}
                >
                  Menor Oport
                </button>
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50"
                  onClick={() => { setSortBy('dsv'); setShowSortMenu(false) }}
                >
                  Maior DSV
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Clientes List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {clientesFiltrados.map((cliente) => {
            const isInadimplente = cliente.status_financeiro === 'INADIMPLENTE'

            // Calcular atingimento com validação
            const saldoAtual = cliente.saldo_meta || 0
            const metaAtual = cliente.meta_ano_atual || 0
            const atingimento = metaAtual > 0
              ? Math.min(100, Math.max(0, (saldoAtual / metaAtual) * 100))
              : 0

            // Calcular o ângulo para o gráfico de rosca
            const circumference = 2 * Math.PI * 54
            const greenOffset = circumference * (1 - atingimento / 100)

            // Função para formatar valores em reais
            const formatCurrency = (value: number) => {
              return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)
            }

            return (
              <div
                key={cliente.codigo_cliente}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                onClick={() => {
                  const rotaPath = rotaNome ? encodeURIComponent(rotaNome) : 'sem-rota'
                  const cidadePath = cidadeDecodificada ? encodeURIComponent(cidadeDecodificada) : 'sem-cidade'
                  navigate(`/rotas/${rotaPath}/cidades/${cidadePath}/clientes/${cliente.codigo_cliente}/detalhes`)
                }}
              >
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 truncate flex-1">
                      {cliente.nome_fantasia}
                    </h3>
                    {isInadimplente && (
                      <span className="bg-orange-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                        INADIMPLENTE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Código: {cliente.codigo_cliente}</p>

                  {/* Content - Horizontal */}
                  <div className="flex items-center gap-4 sm:gap-6">
                    {/* Donut Chart */}
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        {/* Background circle (red) */}
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          fill="none"
                          stroke="#DC2626"
                          strokeWidth="12"
                        />
                        {/* Progress circle (green) */}
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          fill="none"
                          stroke="#16A34A"
                          strokeWidth="12"
                          strokeDasharray={circumference}
                          strokeDashoffset={greenOffset}
                          strokeLinecap="butt"
                        />
                      </svg>
                      {/* Center text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl sm:text-2xl font-bold text-gray-900">{atingimento.toFixed(1)}%</span>
                        <span className="text-[10px] sm:text-xs text-gray-600">Atingimento</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex-1 min-w-0">
                      {/* Saldo */}
                      <div className="mb-2.5">
                        <div className="text-xl sm:text-2xl font-bold text-green-600 truncate">
                          {formatCurrency(cliente.saldo_meta)}
                        </div>
                        <div className="text-gray-600 text-[10px] sm:text-xs">Saldo</div>
                        <div className="text-gray-500 text-[10px] sm:text-xs truncate">Meta: {formatCurrency(cliente.meta_ano_atual)}</div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200 my-2.5"></div>

                      {/* Metrics row */}
                      <div className="grid grid-cols-2 gap-2 text-center">
                        {/* DSV */}
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="font-bold text-xs sm:text-sm text-gray-800">{cliente.dias_sem_comprar || 0}</span>
                          </div>
                          <span className="text-[9px] sm:text-[10px] text-gray-500">DSV</span>
                        </div>

                        {/* Bairro */}
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-gray-500" />
                            <span className="font-bold text-xs sm:text-sm text-gray-800 truncate max-w-[60px]">{cliente.bairro || '-'}</span>
                          </div>
                          <span className="text-[9px] sm:text-[10px] text-gray-500">Bairro</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ação Recomendada ou Oportunidade */}
                {cliente.acao_recomendada ? (
                  <div className="bg-orange-50 py-2.5 px-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span className="text-orange-600 font-semibold text-xs sm:text-sm truncate">
                      {cliente.acao_recomendada}
                    </span>
                  </div>
                ) : (
                  <div className="bg-orange-50 py-2.5 px-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span className="text-orange-600 font-semibold text-xs sm:text-sm truncate">
                      Oportunidade: {formatCurrency(cliente.oportunidade)}
                    </span>
                  </div>
                )}

                {/* Check Button */}
                <div className="p-4 pt-3">
                  <button
                    onClick={(e) => handleCheckClick(cliente, e)}
                    disabled={processandoVisita === cliente.codigo_cliente}
                    className={`
                      w-full py-2.5 rounded-lg transition-all duration-200 ease-in-out flex items-center justify-center gap-2 font-medium text-sm
                      ${cliente.visitado
                        ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }
                      ${processandoVisita === cliente.codigo_cliente ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    title={cliente.visitado ? 'Cliente visitado - Clique para cancelar' : 'Registrar visita'}
                  >
                    {processandoVisita === cliente.codigo_cliente ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        {cliente.visitado ? 'Visitado' : 'Registrar Visita'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Mensagem se não houver clientes */}
        {clientesFiltrados.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">{getEmptyStateMessage(user, 'clientes').title}</p>
            <p className="text-sm">
              {searchTerm ? 'Tente ajustar os filtros para encontrar os clientes desejados.' : getEmptyStateMessage(user, 'clientes').subtitle}
            </p>
          </div>
        )}
      </main>

      {/* Modal de Confirmação */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancelar Visita</h3>
            <p className="text-gray-600 mb-6">Deseja cancelar esta visita?</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setClienteParaCancelar(null)
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Não
              </button>
              <button
                onClick={confirmarCancelamento}
                disabled={processandoVisita !== null}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {processandoVisita ? 'Cancelando...' : 'Sim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clientes