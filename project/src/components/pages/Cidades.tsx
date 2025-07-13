import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, User, LogOut, MapPin, Building } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'
import { supabase } from '../../lib/supabase'

const Cidades: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { } = useUserData()
  const [searchTerm, setSearchTerm] = useState('')
  const [cidades, setCidades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Função para normalizar texto removendo acentos e caracteres especiais
  const normalizeText = (text: string): string => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/gi, '') // Remove caracteres especiais exceto espaços
      .toLowerCase()
      .trim()
  }
  // Carregar cidades reais do usuário logado
  useEffect(() => {
    carregarCidades()
  }, [user])

  async function carregarCidades() {
    try {
      setLoading(true)
      console.log('🔍 Carregando cidades para usuário:', user?.id)
      
      // Buscar cidades das rotas do vendedor logado respeitando RLS
      const { data, error } = await supabase
        .from('rotas_estado')
        .select(`
          codigo_ibge_cidade,
          rota,
          cidades (
            cidade,
            codigo_ibge_cidade,
            populacao,
            num_oticas,
            meta_n_oticas
          ),
          vendedor_rotas!inner (
            vendedor_id,
            ativo
          )
        `)
        .eq('vendedor_rotas.vendedor_id', user?.id)
        .eq('vendedor_rotas.ativo', true)
      
      if (error) {
        console.error('❌ Erro ao carregar cidades:', error)
        setCidades([]) // Retorna vazio se houver erro
        return
      }
      
      console.log('✅ Cidades carregadas:', data)
      setCidades(data || []) // Retorna dados reais ou array vazio
      
    } catch (error) {
      console.error('💥 Erro ao carregar cidades:', error)
      setCidades([]) // Retorna vazio em caso de erro
    } finally {
      setLoading(false)
    }
  }

  // Filtrar cidades baseado na busca
  const filteredCidades = cidades.filter(cidade => {
    const normalizedSearchTerm = normalizeText(searchTerm)
    return normalizeText(cidade.cidades?.cidade || '').includes(normalizedSearchTerm)
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
        ) : (
          /* Cidades List */
          <div className="space-y-3">
            {filteredCidades.length > 0 ? (
              filteredCidades.map((cidade, index) => (
                <div
                  key={cidade.codigo_ibge_cidade || index}
                  className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
                  onClick={() => navigate('/clientes')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1.5">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="text-base font-semibold text-gray-900">
                          {cidade.cidades?.cidade || 'Cidade sem nome'}
                        </h3>
                        <div className="flex items-center space-x-1">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="text-xs text-gray-600">
                            {cidade.cidades?.num_oticas || 0} óticas
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-2"></div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs leading-tight mb-2">
                        <span className="text-green-600">População:</span>
                        <p className="font-semibold text-green-700 text-right">
                          {cidade.cidades?.populacao || 0}
                        </p>
                        
                        <span className="text-blue-600">Meta Óticas:</span>
                        <p className="font-semibold text-blue-700 text-right">
                          {cidade.cidades?.meta_n_oticas || 0}
                        </p>
                        
                        <span className="text-purple-600">Rota:</span>
                        <p className="font-semibold text-purple-700 text-right">
                          {cidade.rota || 'Sem rota'}
                        </p>
                        
                        <span className="text-gray-600">Código IBGE:</span>
                        <p className="font-semibold text-gray-700 text-right">
                          {cidade.codigo_ibge_cidade || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">Nenhuma cidade encontrada</p>
                <p className="text-sm">
                  {searchTerm ? 'Tente ajustar o filtro de busca.' : 'Você não possui cidades ativas no momento.'}
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