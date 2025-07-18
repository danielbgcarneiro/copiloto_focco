import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, User, LogOut, MapPin } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'
import { getRotasCompleto, formatarMoeda, normalizeText, type RotaMapeada } from '../../lib/queries/rotas'
import { getEmptyStateMessage } from '../../lib/utils/userHelpers'
import { supabase } from '../../lib/supabase'

const Rotas: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { } = useUserData()
  const [searchTerm, setSearchTerm] = useState('')
  const [rotas, setRotas] = useState<RotaMapeada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  // Carregar rotas reais do usuário logado
  useEffect(() => {
    carregarRotas()
  }, [user])

  async function carregarRotas() {
    try {
      setLoading(true)
      setError(null)
      
      // Verificar se usuário está autenticado antes de continuar
      if (!user?.id) {
        console.log('❌ Usuário não autenticado, aguardando...')
        setLoading(false)
        return
      }
      
      console.log('🔍 Carregando rotas para usuário:', {
        userId: user.id,
        email: user.email
      })
      
      // Aguardar um pouco para garantir que a sessão está sincronizada
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verificar sessão dupla para garantir que RLS está ativo
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('❌ Sessão não encontrada, tentando novamente...')
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      const rotasData = await getRotasCompleto()
      console.log('✅ Rotas carregadas:', rotasData)
      setRotas(rotasData)
      
    } catch (error) {
      console.error('💥 Erro ao carregar rotas:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      setRotas([])
    } finally {
      setLoading(false)
    }
  }

  // Filtrar rotas baseado na busca
  const filteredRotas = rotas.filter(rota => {
    const normalizedSearchTerm = normalizeText(searchTerm)
    return normalizeText(rota.nome).includes(normalizedSearchTerm)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 relative">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/dashboard')}
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
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar rotas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-gray-600">Carregando rotas...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            <p className="text-lg mb-2">Erro ao carregar rotas</p>
            <p className="text-sm">{error}</p>
            <button 
              onClick={carregarRotas}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          /* Rotas List */
          <div className="space-y-3">
            {filteredRotas.length > 0 ? (
              filteredRotas.map((rota, index) => (
                <div
                  key={rota.nome || index}
                  className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
                  onClick={() => navigate(`/rotas/${encodeURIComponent(rota.nome || 'sem-rota')}/cidades`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1.5">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="text-base font-semibold text-gray-900">{rota.nome || 'Sem Rota'}</h3>
                      </div>
                      
                      <div className="mb-2"></div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs leading-tight">
                        <div>
                          <span className="text-green-600">Oportunidade:</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-700">{formatarMoeda(rota.somaOportunidades)}</p>
                        </div>
                        <div>
                          <span className="text-blue-600">Cidades:</span>
                          <span className="font-semibold text-blue-700 ml-1">{rota.totalCidades}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-600">Óticas:</span>
                          <span className="font-semibold text-purple-700 ml-1">{rota.totalOticas}</span>
                        </div>
                        <div>
                          <span className="text-red-600">Sem Vendas +90d:</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-red-700">{rota.semVendas90d} {rota.semVendas90d === 1 ? 'ótica' : 'óticas'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">{getEmptyStateMessage(user, 'rotas').title}</p>
                <p className="text-sm">
                  {searchTerm ? 'Tente ajustar o filtro de busca.' : getEmptyStateMessage(user, 'rotas').subtitle}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default Rotas