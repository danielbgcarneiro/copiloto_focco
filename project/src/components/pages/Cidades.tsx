/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, User, MapPin, Home, AlertTriangle, TrendingUp } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getCidadesCompleto, normalizeText, type CidadeMapeada } from '../../lib/queries/cidades'
import { getEmptyStateMessage } from '../../lib/utils/userHelpers'
import { Card } from '../atoms'
import { PageHeader } from '../molecules'
import { formatCurrency } from '../../utils'

const Cidades: React.FC = () => {
  const navigate = useNavigate()
  const { rotaId } = useParams<{ rotaId: string }>()
  const { user, logout } = useAuth()
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

  // Componente do Card de Cidade
  const CidadeCard: React.FC<{ cidade: CidadeMapeada }> = ({ cidade }) => {
    // Garantir que o atingimento está entre 0 e 100
    const atingimento = Math.min(100, Math.max(0, cidade.atingimento || 0))

    // Calcular o ângulo para o gráfico de rosca
    const circumference = 2 * Math.PI * 54
    const greenOffset = circumference * (1 - atingimento / 100)

    return (
      <Card
        variant="interactive"
        padding="none"
        onClick={() => navigate(`/rotas/${encodeURIComponent(rotaNome || '')}/cidades/${encodeURIComponent(cidade.nome)}/clientes`)}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-4">
            <MapPin className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <span className="text-base sm:text-lg font-bold text-gray-800 truncate">{cidade.nome}</span>
            <span className="text-base sm:text-lg text-gray-500 flex-shrink-0">- {cidade.totalClientes} óticas</span>
          </div>

          {/* Content - Horizontal em todos os tamanhos */}
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
                  {formatCurrency(cidade.saldoMetas, true)}
                </div>
                <div className="text-gray-600 text-[10px] sm:text-xs">Saldo</div>
                <div className="text-gray-500 text-[10px] sm:text-xs truncate">Meta: {formatCurrency(cidade.somaMetas, true)}</div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-2.5"></div>

              {/* Metrics row */}
              <div className="grid grid-cols-2 gap-2 text-center">
                {/* Lojas */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-0.5">
                    <Home className="w-3 h-3 text-gray-500" />
                    <span className="font-bold text-xs sm:text-sm text-gray-800">{cidade.totalClientes}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-gray-500">Lojas</span>
                </div>

                {/* Lojas sem venda */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span className="font-bold text-xs sm:text-sm text-red-500">{cidade.clientesSemVenda90d}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-gray-500">Lojas s/ venda</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Oportunidade de Venda */}
        <div className="bg-orange-50 py-2.5 px-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span className="text-orange-600 font-semibold text-xs sm:text-sm truncate">
            Oportunidade de Venda: {formatCurrency(cidade.somaOportunidades, true)}
          </span>
        </div>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Copiloto"
        variant="centered"
        showBack
        onBack={() => navigate('/rotas')}
        onLogout={() => { logout(); navigate('/') }}
        rightAction={
          <div className="flex items-center space-x-1.5">
            <User className="h-4 w-4" />
            <span className="text-sm">{user?.apelido || user?.nome || user?.email || 'Usuário'}</span>
          </div>
        }
      />

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredCidades.length > 0 ? (
              filteredCidades.map((cidade, index) => (
                <CidadeCard key={`${cidade.nome}-${index}`} cidade={cidade} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-500">
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