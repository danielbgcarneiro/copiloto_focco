import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Filter, User, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'

const Clientes: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { } = useUserData()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('nome')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  // Função para normalizar texto removendo acentos e caracteres especiais
  const normalizeText = (text: string): string => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/gi, '') // Remove caracteres especiais exceto espaços
      .toLowerCase()
      .trim()
  }

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

  const clientes = [
    {
      id: 1,
      nome: 'Ótica Paris',
      codigo: '100456',
      status: 'Liberado',
      statusColor: 'bg-green-100 text-green-800',
      oportunidade: 'R$19.000',
      limiteCred: 'R$25.000',
      meta: 'R$18.000',
      vendido: 'R$9.000',
      bairro: 'Aldeota',
      dsv: 45
    },
    {
      id: 2,
      nome: 'Ótica Silvano',
      codigo: '100789',
      status: 'Bloqueado',
      statusColor: 'bg-red-100 text-red-800',
      oportunidade: 'R$15.000',
      limiteCred: 'R$20.000',
      meta: 'R$18.000',
      vendido: 'R$9.000',
      bairro: 'Meireles',
      dsv: 120
    },
    {
      id: 3,
      nome: 'Ótica Visão',
      codigo: '100123',
      status: 'Liberado',
      statusColor: 'bg-green-100 text-green-800',
      oportunidade: 'R$10.000',
      limiteCred: 'R$15.000',
      meta: 'R$12.000',
      vendido: 'R$4.500',
      bairro: 'Centro',
      dsv: 30
    }
  ]

  const filteredClientes = clientes
    .filter(cliente => {
      const normalizedSearchTerm = normalizeText(searchTerm)
      return normalizeText(cliente.nome).includes(normalizedSearchTerm) ||
             normalizeText(cliente.codigo).includes(normalizedSearchTerm)
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'bairro-az':
          return a.bairro.localeCompare(b.bairro)
        case 'bairro-za':
          return b.bairro.localeCompare(a.bairro)
        case 'bairro':
          return a.bairro.localeCompare(b.bairro)
        case 'maior-oportunidade':
          return parseFloat(b.oportunidade.replace('R$', '').replace('.', '').replace(',', '.')) - parseFloat(a.oportunidade.replace('R$', '').replace('.', '').replace(',', '.'))
        case 'menor-oportunidade':
          return parseFloat(a.oportunidade.replace('R$', '').replace('.', '').replace(',', '.')) - parseFloat(b.oportunidade.replace('R$', '').replace('.', '').replace(',', '.'))
        default:
          return a.nome.localeCompare(b.nome)
      }
    })

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
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
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
          {filteredClientes.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
              onClick={() => navigate(`/cliente/${cliente.id}`)}
            >
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-semibold text-gray-900">{cliente.nome}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cliente.statusColor}`}>
                      {cliente.status}
                    </span>
                    <span className="text-xs text-gray-500">Ativo</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-600">DSV:</span>
                    <span className="text-xs font-semibold text-red-600">{cliente.dsv}d</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-2 leading-tight">Código: {cliente.codigo}</p>
                
                <div className="grid grid-cols-2 gap-2 text-xs leading-tight">
                  <div>
                    <span className="text-green-600">Oportunidade:</span>
                    <span className="ml-1 font-semibold text-green-700">{cliente.oportunidade}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-600">Limit Créd:</span>
                    <span className="ml-1 font-semibold text-gray-800">{cliente.limiteCred}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Meta:</span>
                    <span className="ml-1 font-semibold text-blue-700">{cliente.meta}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-600">Bairro:</span>
                    <span className="ml-1 font-semibold text-gray-800">{cliente.bairro}</span>
                  </div>
                  <div>
                    <span className="text-purple-600">Vendido:</span>
                    <span className="ml-1 font-semibold text-purple-700">{cliente.vendido}</span>
                  </div>
                  <div></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default Clientes