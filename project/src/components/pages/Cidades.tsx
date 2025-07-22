import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Search, User, LogOut, MapPin, Building } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'
import { getCidadesCompleto, formatarMoeda, normalizeText, type CidadeMapeada } from '../../lib/queries/cidades'
import { getEmptyStateMessage } from '../../lib/utils/userHelpers'

const Cidades: React.FC = () => {
  const navigate = useNavigate()
  const { rotaId } = useParams<{ rotaId: string }>()
  const { user, logout } = useAuth()
  const { } = useUserData()
  const [searchTerm, setSearchTerm] = useState('')
  const [cidades, setCidades] = useState<CidadeMapeada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Decodificar o nome da rota
  const rotaNome = rotaId ? decodeURIComponent(rotaId) : null

  // Carregar cidades reais do usuário logado
  useEffect(() => {
    carregarCidades()
  }, [user, rotaNome])

  async function carregarCidades() {
    try {
      setLoading(true)
      setError(null)
      
      // Verificar se usuário está autenticado antes de continuar
      if (!user?.id) {
        console.log('❌ Usuário não autenticado, aguardando...')
        return
      }
      
      console.log('🔍 Carregando cidades para usuário:', {
        userId: user.id,
        email: user.email,
        rota: rotaNome
      })
      
      const cidadesData = await getCidadesCompleto(rotaNome === 'sem-rota' ? null : rotaNome || undefined)
      console.log('✅ Cidades carregadas:', cidadesData)
      
      setCidades(cidadesData)
      
    } catch (error) {
      console.error('💥 Erro ao carregar cidades:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      setCidades([])
    } finally {
      setLoading(false)
    }
  }

  // Filtrar cidades baseado na busca
  const filteredCidades = cidades.filter(cidade => {
    const normalizedSearchTerm = normalizeText(searchTerm)
    return normalizeText(cidade.nome).includes(normalizedSearchTerm)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 relative">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/rotas')}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Breadcrumb */}
        {rotaNome && (
          <div className="mb-4 px-2">
            <div className="flex items-center text-sm text-gray-600">
              <span>Rota:</span>
              <span className="ml-2 font-semibold text-primary">{rotaNome === 'sem-rota' ? 'Sem Rota' : rotaNome}</span>
            </div>
          </div>
        )}
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-gray-600">Carregando cidades...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            <p className="text-lg mb-2">Erro ao carregar cidades</p>
            <p className="text-sm">{error}</p>
            <button 
              onClick={carregarCidades}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          /* Cidades List */
          <div className="space-y-3">
            {filteredCidades.length > 0 ? (
              filteredCidades.map((cidade, index) => (
                <div
                  key={`${cidade.nome}-${index}`}
                  className="bg-white rounded-lg shadow-md border border-gray-200 p-3 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
                  onClick={() => navigate(`/rotas/${encodeURIComponent(rotaNome || '')}/cidades/${encodeURIComponent(cidade.nome)}/clientes`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1.5">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="text-base font-semibold text-gray-900">
                          {cidade.nome}
                        </h3>
                        <div className="flex items-center space-x-1">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="text-xs text-gray-600">
                            {cidade.totalClientes} óticas
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-1"></div>
                      
                      <div className="space-y-0.5 mb-3">
                        <div className="flex justify-between items-center bg-gray-100 px-2 py-1.5 rounded">
                          <span className="text-xs text-blue-700 font-medium">Meta da Cidade:</span>
                          <p className="text-xs font-bold text-blue-800">{formatarMoeda(cidade.somaMetas)}</p>
                        </div>
                        
                        <div className="flex justify-between items-center bg-gray-100 px-2 py-1.5 rounded">
                          <span className="text-xs text-green-700 font-medium">Saldo:</span>
                          <p className="text-xs font-bold text-green-800">{formatarMoeda(cidade.vendasAnoAtual)}</p>
                        </div>
                        
                        <div className="flex justify-between items-center bg-gray-100 px-2 py-1.5 rounded">
                          <span className="text-xs text-orange-700 font-medium">Soma das Oportunidades:</span>
                          <p className="text-xs font-bold text-orange-800">{formatarMoeda(cidade.somaOportunidades)}</p>
                        </div>
                        
                        <div className="flex justify-between items-center bg-gray-100 px-2 py-1.5 rounded">
                          <span className="text-xs text-purple-700 font-medium">nº de Lojas:</span>
                          <p className="text-xs font-bold text-purple-800">{cidade.totalClientes}</p>
                        </div>
                        
                        <div className="flex justify-between items-center bg-gray-100 px-2 py-1.5 rounded">
                          <span className="text-xs text-red-700 font-medium">Lojas s/ venda +90d:</span>
                          <p className="text-xs font-bold text-red-800">{cidade.clientesSemVenda90d}</p>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs text-gray-600">Atingimento</span>
                          <span className="text-xs font-semibold text-gray-800">{cidade.atingimento.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              cidade.atingimento >= 100 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                              cidade.atingimento >= 80 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                              cidade.atingimento >= 60 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                              'bg-gradient-to-r from-red-400 to-red-600'
                            }`}
                            style={{ width: `${Math.min(Math.max(cidade.atingimento, 0), 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">{getEmptyStateMessage(user, 'cidades').title}</p>
                <p className="text-sm">
                  {searchTerm ? 'Tente ajustar o filtro de busca.' : getEmptyStateMessage(user, 'cidades').subtitle}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default Cidades