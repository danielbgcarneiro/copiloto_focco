import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Search, Filter, User, LogOut, AlertCircle, Check } from 'lucide-react'
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

  // Função para formatar valores
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor || 0)
  }

  // Função para formatar data da última visita
  const formatarUltimaVisita = (dataVisita: string | null) => {
    if (!dataVisita) return 'Sem Registro'
    
    try {
      const data = new Date(dataVisita)
      return data.toLocaleDateString('pt-BR')
    } catch {
      return 'sem registro de visita'
    }
  }

  // Função para determinar cor do texto da ação recomendada
  const getCorTextoAcao = (acaoRecomendada: string): string => {
    if (!acaoRecomendada) return 'text-gray-900';
    
    const acao = acaoRecomendada.toLowerCase();
    
    // Vermelho - Ações urgentes
    if (
      acao.includes('urgente') ||
      acao.includes('bloqueio') ||
      acao.includes('vai perder') ||
      acao.includes('cobrança') ||
      acao.includes('última tentativa') ||
      acao.includes('resolver situação')
    ) {
      return 'text-red-700';
    }
    
    // Amarelo - Ações de atenção
    if (
      acao.includes('reconquistar') ||
      acao.includes('aumentar frequência') ||
      acao.includes('reativar') ||
      acao.includes('desenvolver') ||
      acao.includes('ação de reativação') ||
      acao.includes('avaliar manutenção')
    ) {
      return 'text-yellow-700';
    }
    
    // Verde - Ações de manutenção
    if (
      acao.includes('manter') ||
      acao.includes('foco total') ||
      acao.includes('foco em') ||
      acao.includes('primeira venda') ||
      acao.includes('novo')
    ) {
      return 'text-green-700';
    }
    
    return 'text-gray-900';
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
        <div className="space-y-2">
          {clientesFiltrados.map((cliente) => {
            return (
              <div
                key={cliente.codigo_cliente}
                className="bg-white rounded-lg shadow-md border border-gray-200 p-3 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
                onClick={() => {
                  console.log('Clicou no cliente:', cliente.codigo_cliente);
                  const rotaPath = rotaNome ? encodeURIComponent(rotaNome) : 'sem-rota';
                  const cidadePath = cidadeDecodificada ? encodeURIComponent(cidadeDecodificada) : 'sem-cidade';
                  const detalhesUrl = `/rotas/${rotaPath}/cidades/${cidadePath}/clientes/${cliente.codigo_cliente}/detalhes`;
                  console.log('Navegando para:', detalhesUrl);
                  navigate(detalhesUrl);
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
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
                  <p className="text-xs text-gray-600 mb-1.5 leading-tight">Código: {cliente.codigo_cliente}</p>

                  
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs leading-none mb-2">
                    <div className="bg-gray-100 px-2 py-1.5 rounded">
                      <span className="text-blue-700 font-medium">Meta:</span>
                      <span className="ml-1 font-bold text-blue-800">{formatarMoeda(cliente.meta_ano_atual)}</span>
                    </div>
                    <div className="bg-gray-100 px-2 py-1.5 rounded text-right">
                      <span className="text-gray-700 font-medium">Limit Créd:</span>
                      <span className="ml-1 font-bold text-gray-800">{formatarMoeda(cliente.valor_limite_credito)}</span>
                    </div>
                    
                    <div className="bg-gray-100 px-2 py-1.5 rounded">
                      <span className="text-green-700 font-medium">Saldo:</span>
                      <span className="ml-1 font-bold text-green-800">{formatarMoeda(cliente.saldo_meta)}</span>
                    </div>
                    <div className="bg-gray-100 px-2 py-1.5 rounded text-right">
                      <span className="text-gray-700 font-medium">Bairro:</span>
                      <span className="ml-1 font-bold text-gray-800">{cliente.bairro || '-'}</span>
                    </div>
                    
                    <div className="bg-gray-100 px-2 py-1.5 rounded">
                      <span className="text-orange-700 font-medium">Oportunidade:</span>
                      <span className="ml-1 font-bold text-orange-800">{formatarMoeda(cliente.oportunidade)}</span>
                    </div>
                    <div className="bg-gray-100 px-2 py-1.5 rounded text-right">
                      <span className="text-gray-700 font-medium">Última visita:</span>
                      <span className="ml-1 font-bold text-gray-800">{formatarUltimaVisita(cliente.ultima_visita_data)}</span>
                    </div>
                  </div>

                  
                  {/* Ação Recomendada */}
                  {cliente.acao_recomendada && (
                    <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <AlertCircle className="h-4 w-4 flex-shrink-0 text-gray-600" />
                          <p className={`text-xs font-medium leading-tight ${getCorTextoAcao(cliente.acao_recomendada)}`}>
                            {cliente.acao_recomendada}
                          </p>
                        </div>
                        
                        {/* Check Button */}
                        <button
                          onClick={(e) => handleCheckClick(cliente, e)}
                          disabled={processandoVisita === cliente.codigo_cliente}
                          className={`
                            min-w-[44px] min-h-[44px] p-2 rounded-lg transition-all duration-200 ease-in-out flex items-center justify-center
                            ${cliente.visitado 
                              ? 'bg-green-500 text-white shadow-md hover:bg-green-600' 
                              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                            }
                            ${processandoVisita === cliente.codigo_cliente ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                          title={cliente.visitado ? 'Cliente visitado - Clique para cancelar' : 'Registrar visita'}
                        >
                          {processandoVisita === cliente.codigo_cliente ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          ) : (
                            <Check className="h-5 w-5" />
                          )}
                        </button>
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