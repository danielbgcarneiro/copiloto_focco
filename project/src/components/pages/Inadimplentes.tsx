import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, User, LogOut, AlertTriangle, Phone, MessageCircle, Filter } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'
import { getClientesInadimplentes, getStatusInadimplencia, formatarTelefone } from '../../lib/queries/inadimplentes'
import { formatarMoeda } from '../../lib/queries/dashboard'
import { getVendedorRanking } from '../../lib/queries/vendedores'
import { isAdmin } from '../../lib/utils/userHelpers'

const Inadimplentes: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { } = useUserData()
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [sortBy, setSortBy] = useState('nome')
  const [inadimplentesData, setInadimplentesData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [valorTotalInadimplencia, setValorTotalInadimplencia] = useState(0)

  // Função para normalizar texto removendo acentos e caracteres especiais
  const normalizeText = (text: string): string => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/gi, '') // Remove caracteres especiais exceto espaços
      .toLowerCase()
      .trim()
  }


  // Carregar inadimplentes reais do usuário logado
  useEffect(() => {
    carregarInadimplentes()
  }, [user])

  async function carregarInadimplentes() {
    try {
      setLoading(true)
      console.log('🔍 Carregando inadimplentes para usuário:', user?.id)
      
      // Buscar clientes inadimplentes com RLS aplicado
      const clientesInadimplentes = await getClientesInadimplentes()
      console.log('✅ Inadimplentes carregados:', clientesInadimplentes)
      
      // Buscar valor total de inadimplência da vw_ranking_vendedores
      try {
        const vendedorRanking = await getVendedorRanking()
        if (vendedorRanking) {
          setValorTotalInadimplencia(vendedorRanking.total_inadimplencia)
          console.log('✅ Valor total inadimplência carregado:', vendedorRanking.total_inadimplencia)
        }
      } catch (error) {
        console.warn('⚠️ Erro ao carregar valor total de inadimplência:', error)
      }
      
      // Transformar dados para o formato esperado pela interface
      const inadimplentesFormatados = clientesInadimplentes.map(cliente => {
        const { status, statusColor } = getStatusInadimplencia(cliente.maior_dias_atraso)
        
        return {
          id: cliente.codigo_cliente,
          nome: cliente.nome_fantasia,
          codigo: cliente.codigo_cliente.toString(),
          cidade: cliente.cidade,
          rota: cliente.rota,
          valorTotal: formatarMoeda(cliente.valor_total_titulos),
          ultimoPagamento: cliente.ultimo_pagamento || 'N/A',
          telefone: formatarTelefone(cliente.telefone),
          titulosAbertos: cliente.titulos,
          diasAtraso: cliente.maior_dias_atraso,
          status,
          statusColor
        }
      })
      
      setInadimplentesData(inadimplentesFormatados)
      
    } catch (error) {
      console.error('💥 Erro ao carregar inadimplentes:', error)
      setInadimplentesData([])
    } finally {
      setLoading(false)
    }
  }

  // Usar os dados já processados
  const inadimplentes = inadimplentesData

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
              {formatarMoeda(valorTotalInadimplencia)}
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
                <div className="flex items-center space-x-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h3 className="text-base font-semibold text-gray-900">{inadimplente.nome}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inadimplente.statusColor}`}>
                    {inadimplente.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs leading-tight mb-1">
                  <div>
                    <span className="text-gray-600">Código:</span>
                    <span className="ml-1 font-semibold text-gray-800">{inadimplente.codigo}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-600">Cidade:</span>
                    <span className="ml-1 font-semibold text-gray-800">{inadimplente.cidade}</span>
                  </div>
                </div>
                
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
                    {inadimplente.titulosAbertos.map((titulo: any, index: number) => {
                      const diasAtraso = titulo.dias_atraso || 0
                      return (
                        <div key={index} className="grid grid-cols-3 gap-2 text-xs items-center">
                          <span className="text-gray-600">{titulo.vencimento}</span>
                          <span className="text-center text-red-600 font-medium">{diasAtraso}d</span>
                          <span className="font-semibold text-red-600 text-right">{formatarMoeda(titulo.valor)}</span>
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
                {searchTerm ? 'Tente ajustar o filtro de busca.' : 
                  isAdmin(user) ? 'Não há clientes inadimplentes no sistema.' : 'Todos os seus clientes estão em dia!'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Inadimplentes