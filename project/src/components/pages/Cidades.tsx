import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, BarChart3, User, LogOut, MapPin, Building } from 'lucide-react'

const Cidades: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const cidades = [
    {
      id: 1,
      nome: 'Fortaleza',
      somaOportunidade: 'R$ 7.300,00',
      saldoMetas: 'R$ 13.500,00',
      nLojas: 12,
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
      indicadores: {
        at: 2,
        inad: 0,
        in: 1
      }
    }
  ]

  const filteredCidades = cidades.filter(cidade =>
    cidade.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/rotas')}
                className="p-2 hover:bg-white/10 rounded-full transition-colors mr-3"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <BarChart3 className="h-8 w-8 mr-3" />
              <h1 className="text-xl font-bold">Copiloto</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Representante</span>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Charles</span>
              </div>
              <button 
                onClick={() => navigate('/')}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <LogOut className="h-5 w-5" />
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Cidades List */}
        <div className="space-y-4">
          {filteredCidades.map((cidade) => (
            <div
              key={cidade.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/clientes')}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-gray-900">{cidade.nome}</h3>
                    <div className="flex items-center space-x-1">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{cidade.nLojas} óticas</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                    <span className="text-gray-500">Soma Oportunidade:</span>
                    <p className="font-medium text-gray-900 text-right">{cidade.somaOportunidade}</p>
                    
                    <span className="text-gray-500">Saldo de Metas:</span>
                    <p className="font-medium text-gray-900 text-right">{cidade.saldoMetas}</p>
                    
                    <span className="text-gray-500">N Lojas:</span>
                    <div className="flex items-center justify-end space-x-3 text-xs">
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