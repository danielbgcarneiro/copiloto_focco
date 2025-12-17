import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, User, LogOut, MapPin, Home, AlertTriangle, TrendingUp } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'
import { getRotasCompleto, normalizeText, type RotaMapeada } from '../../lib/queries/rotas'
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

  useEffect(() => {
    carregarRotas()
  }, [user])

  async function carregarRotas() {
    try {
      setLoading(true)
      setError(null)

      if (!user?.id) {
        setLoading(false)
        return
      }

      await new Promise(resolve => setTimeout(resolve, 500))

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      const rotasData = await getRotasCompleto()
      setRotas(rotasData)


    } catch (error) {
      console.error('Erro ao carregar rotas:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      setRotas([])
    } finally {
      setLoading(false)
    }
  }

  const filteredRotas = rotas
    .filter(rota => {
      const normalizedSearchTerm = normalizeText(searchTerm)
      return normalizeText(rota.nome).includes(normalizedSearchTerm)
    })
    .sort((a, b) => (b.somaOportunidades || 0) - (a.somaOportunidades || 0))

  // Função para formatar valores em reais
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Componente do Card de Rota
  const RotaCard: React.FC<{ rota: RotaMapeada }> = ({ rota }) => {
    // Garantir que o atingimento está entre 0 e 100
    const atingimento = Math.min(100, Math.max(0, rota.percentualMeta || 0))

    // Calcular o ângulo para o gráfico de rosca
    const circumference = 2 * Math.PI * 54
    const greenOffset = circumference * (1 - atingimento / 100)

    return (
      <div
        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden"
        onClick={() => navigate(`/rotas/${encodeURIComponent(rota.nome || 'sem-rota')}/cidades`)}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-4">
            <Home className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <span className="text-base sm:text-lg font-bold text-gray-800 truncate">{rota.nome || 'Sem Rota'}</span>
            <span className="text-base sm:text-lg text-gray-500 flex-shrink-0">- {rota.totalOticas} óticas</span>
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
                  {formatCurrency(rota.saldoMeta)}
                </div>
                <div className="text-gray-600 text-[10px] sm:text-xs">Saldo</div>
                <div className="text-gray-500 text-[10px] sm:text-xs truncate">Meta: {formatCurrency(rota.metaAnoAtual)}</div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-2.5"></div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {/* Lojas */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-0.5">
                    <Home className="w-3 h-3 text-gray-500" />
                    <span className="font-bold text-xs sm:text-sm text-gray-800">{rota.totalOticas}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-gray-500">Lojas</span>
                </div>

                {/* Cidades */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-gray-500" />
                    <span className="font-bold text-xs sm:text-sm text-gray-800">{rota.totalCidades}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-gray-500">Cidades</span>
                </div>

                {/* Lojas sem venda */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span className="font-bold text-xs sm:text-sm text-red-500">{rota.semVendas90d}</span>
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
            Oportunidade de Venda: {formatCurrency(rota.somaOportunidades)}
          </span>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredRotas.length > 0 ? (
              filteredRotas.map((rota, index) => (
                <RotaCard key={rota.nome || index} rota={rota} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-500">
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