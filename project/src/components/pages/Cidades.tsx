import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, User, LogOut, MapPin, Building } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'

const Cidades: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { } = useUserData()
  const [searchTerm, setSearchTerm] = useState('')

  // Função para normalizar texto removendo acentos e caracteres especiais
  const normalizeText = (text: string): string => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/gi, '') // Remove caracteres especiais exceto espaços
      .toLowerCase()
      .trim()
  }
  const cidades = [
    {
      id: 1,
      nome: 'Fortaleza',
      somaOportunidade: 'R$ 7.300,00',
      saldoMetas: 'R$ 13.500,00',
      nLojas: 12,
      semVendas90d: 2,
      indicadores: {
        at: 2,
        inad: 1,
        in: 1
      }
    },
    {
      id: 2,
      nome: 'Caucaia',
      somaOportunidade: 'R$ 5.200,00',
      saldoMetas: 'R$ 8.000,00',
      nLojas: 8,
      semVendas90d: 1,
      indicadores: {
        at: 1,
        inad: 2,
        in: 0
      }
    },
    {
      id: 3,
      nome: 'Maracanaú',
      somaOportunidade: 'R$ 4.100,00',
      saldoMetas: 'R$ 6.000,00',
      nLojas: 6,
      semVendas90d: 0,
      indicadores: {
        at: 3,
        inad: 1,
        in: 0
      }
    },
    {
      id: 4,
      nome: 'Eusébio',
      somaOportunidade: 'R$ 3.200,00',
      saldoMetas: 'R$ 4.500,00',
      nLojas: 4,
      semVendas90d: 1,
      indicadores: {
        at: 2,
        inad: 0,
        in: 1
      }
    }
  ]

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
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

        {/* Cidades List */}
        <div className="space-y-3">
          {filteredCidades.map((cidade) => (
            <div
              key={cidade.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
              onClick={() => navigate('/clientes')}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-semibold text-gray-900">{cidade.nome}</h3>
                    <div className="flex items-center space-x-1">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="text-xs text-gray-600">{cidade.nLojas} óticas</span>
                    </div>
                  </div>
                  
                  <div className="mb-2"></div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs leading-tight mb-2">
                    <span className="text-green-600">Soma Oportunidade:</span>
                    <p className="font-semibold text-green-700 text-right">{cidade.somaOportunidade}</p>
                    
                    <span className="text-blue-600">Saldo de Metas:</span>
                    <p className="font-semibold text-blue-700 text-right">{cidade.saldoMetas}</p>
                    
                    <span className="text-red-600">Sem Vendas +90d:</span>
                    <p className="font-semibold text-red-700 text-right">{cidade.semVendas90d} {cidade.semVendas90d === 1 ? 'ótica' : 'óticas'}</p>
                    
                    <span className="text-purple-600">N Lojas:</span>
                    <div className="flex items-center justify-end space-x-2 text-xs">
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-gray-600">{cidade.indicadores.at} AT</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        <span className="text-gray-600">{cidade.indicadores.inad} PEN</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        <span className="text-gray-600">{cidade.indicadores.in} INA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default Cidades