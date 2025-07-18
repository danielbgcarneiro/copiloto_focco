import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, User, LogOut, AlertTriangle, Phone, MessageCircle, Filter } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'
import { supabase } from '../../lib/supabase'

const Inadimplentes: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { } = useUserData()
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [sortBy, setSortBy] = useState('nome')
  const [inadimplentesData, setInadimplentesData] = useState<any[]>([])
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

  // Função para calcular dias de atraso
  const calcularDiasAtraso = (dataVencimento: string): number => {
    const hoje = new Date()
    const vencimento = new Date(dataVencimento.split('/').reverse().join('-'))
    const diffTime = hoje.getTime() - vencimento.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  // Função para classificar status baseado no maior atraso
  const classificarStatus = (diasAtraso: number): { status: string, statusColor: string } => {
    if (diasAtraso > 30) {
      return { status: 'Crítico', statusColor: 'bg-red-100 text-red-800' }
    } else if (diasAtraso > 15) {
      return { status: 'Alto', statusColor: 'bg-orange-100 text-orange-800' }
    } else if (diasAtraso > 7) {
      return { status: 'Médio', statusColor: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { status: 'Baixo', statusColor: 'bg-blue-100 text-blue-800' }
    }
  }

  // Carregar inadimplentes reais do usuário logado
  useEffect(() => {
    carregarInadimplentes()
  }, [user])

  async function carregarInadimplentes() {
    try {
      setLoading(true)
      console.log('🔍 Carregando inadimplentes para usuário:', user?.id)
      
      // Buscar clientes inadimplentes respeitando RLS
      const { data, error } = await supabase
        .from('vw_clientes_completo')
        .select('*')
        .eq('status_financeiro', 'INADIMPLENTE')
        .order('dias_sem_comprar', { ascending: false })
      
      if (error) {
        console.error('❌ Erro ao carregar inadimplentes:', error)
        setInadimplentesData([]) // Retorna vazio se houver erro
        return
      }
      
      console.log('✅ Inadimplentes carregados:', data)
      
      // Transformar dados para o formato esperado pela interface
      const inadimplentesFormatados = (data || []).map(cliente => ({
        id: cliente.codigo_cliente,
        nome: cliente.nome_fantasia,
        codigo: cliente.codigo_cliente.toString(),
        rota: cliente.rota || 'Sem rota',
        valorTotal: 'R$ 0,00', // Dados reais de títulos virão de outra consulta
        ultimoPagamento: 'N/A', // Dados reais virão de outra consulta
        telefone: cliente.celular || 'N/A',
        titulosAbertos: [] // Dados reais virão de outra consulta
      }))
      
      setInadimplentesData(inadimplentesFormatados)
      
    } catch (error) {
      console.error('💥 Erro ao carregar inadimplentes:', error)
      setInadimplentesData([]) // Retorna vazio em caso de erro
    } finally {
      setLoading(false)
    }
  }

  // Processar dados calculando dias de atraso e status
  const inadimplentes = inadimplentesData.map(inadimplente => {
    const diasAtrasoTitulos = inadimplente.titulosAbertos.map(titulo => calcularDiasAtraso(titulo.vencimento))
    const maiorAtraso = Math.max(...diasAtrasoTitulos)
    const { status, statusColor } = classificarStatus(maiorAtraso)
    
    return {
      ...inadimplente,
      diasAtraso: maiorAtraso,
      status,
      statusColor
    }
  })

  const filteredInadimplentes = inadimplentes
    .filter(inadimplente => {
      const normalizedSearchTerm = normalizeText(searchTerm)
      return normalizeText(inadimplente.nome).includes(normalizedSearchTerm) ||
             normalizeText(inadimplente.codigo).includes(normalizedSearchTerm) ||
             normalizeText(inadimplente.rota).includes(normalizedSearchTerm)
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rota':
          return a.rota.localeCompare(b.rota)
        case 'valor-maior':
          return parseFloat(b.valorTotal.replace('R$ ', '').replace('.', '').replace(',', '.')) - parseFloat(a.valorTotal.replace('R$ ', '').replace('.', '').replace(',', '.'))
        case 'valor-menor':
          return parseFloat(a.valorTotal.replace('R$ ', '').replace('.', '').replace(',', '.')) - parseFloat(b.valorTotal.replace('R$ ', '').replace('.', '').replace(',', '.'))
        case 'az':
          return a.nome.localeCompare(b.nome)
        case 'za':
          return b.nome.localeCompare(a.nome)
        default:
          return a.nome.localeCompare(b.nome)
      }
    })

  // Cálculos dinâmicos para os cards
  const totalInadimplentes = filteredInadimplentes.length
  
  const valorTotalCalculado = filteredInadimplentes.reduce((total, cliente) => {
    return total + parseFloat(cliente.valorTotal.replace('R$ ', '').replace('.', '').replace(',', '.'))
  }, 0)
  
  const criticosCount = filteredInadimplentes.filter(cliente => cliente.diasAtraso > 30).length

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
        {/* Page Title */}
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Clientes Inadimplentes</h2>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Total Inadimplentes</p>
            <p className="text-sm sm:text-lg font-bold text-red-600">{totalInadimplentes}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Valor Total</p>
            <p className="text-sm sm:text-lg font-bold text-red-600">
              R$ {valorTotalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Críticos (&gt;30d)</p>
            <p className="text-sm sm:text-lg font-bold text-red-600">{criticosCount}</p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar inadimplentes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="relative flex-shrink-0">
            <button 
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <Filter className="h-4 w-4 text-gray-600" />
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-32">
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200"
                  onClick={() => { setSortBy('rota'); setShowFilterMenu(false) }}
                >
                  Rota
                </button>
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200"
                  onClick={() => { setSortBy('valor-maior'); setShowFilterMenu(false) }}
                >
                  Maior Valor
                </button>
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200"
                  onClick={() => { setSortBy('valor-menor'); setShowFilterMenu(false) }}
                >
                  Menor Valor
                </button>
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200"
                  onClick={() => { setSortBy('az'); setShowFilterMenu(false) }}
                >
                  A-Z
                </button>
                <button
                  className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50"
                  onClick={() => { setSortBy('za'); setShowFilterMenu(false) }}
                >
                  Z-A
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Inadimplentes List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-gray-600">Carregando inadimplentes...</span>
            </div>
          ) : filteredInadimplentes.length > 0 ? (
            filteredInadimplentes.map((inadimplente) => (
            <div
              key={inadimplente.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg hover:border-gray-300 transition-all"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1.5">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h3 className="text-base font-semibold text-gray-900">{inadimplente.nome}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inadimplente.statusColor}`}>
                    {inadimplente.status}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2 leading-tight">Código: {inadimplente.codigo}</p>
                
                <div className="grid grid-cols-2 gap-2 text-xs leading-tight mb-3">
                  <div>
                    <span className="text-red-600">Valor Total:</span>
                    <span className="ml-1 font-semibold text-red-700">{inadimplente.valorTotal}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-600">Rota:</span>
                    <span className="ml-1 font-semibold text-gray-800">{inadimplente.rota}</span>
                  </div>
                </div>
                
                {/* Lista de títulos em aberto */}
                <div className="border-t border-gray-100 pt-2 mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Títulos Atrasados:</p>
                  <div className="space-y-1">
                    {inadimplente.titulosAbertos.map((titulo, index) => {
                      const diasAtraso = calcularDiasAtraso(titulo.vencimento)
                      return (
                        <div key={index} className="grid grid-cols-3 gap-2 text-xs items-center">
                          <span className="text-gray-600">{titulo.vencimento}</span>
                          <span className="text-center text-red-600 font-medium">{diasAtraso}d</span>
                          <span className="font-semibold text-red-600 text-right">{titulo.valor}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* Botões de Ação */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => window.open(`tel:${inadimplente.telefone}`, '_self')}
                      className="w-full bg-primary text-white py-2 sm:py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="text-xs sm:text-sm">Ligar</span>
                    </button>
                    <button 
                      onClick={() => window.open(`https://wa.me/${inadimplente.telefone.replace(/\D/g, '')}`, '_blank')}
                      className="w-full bg-green-600 text-white py-2 sm:py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs sm:text-sm">WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">Nenhum inadimplente encontrado</p>
              <p className="text-sm">
                {searchTerm ? 'Tente ajustar o filtro de busca.' : 'Todos os clientes estão em dia!'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Inadimplentes