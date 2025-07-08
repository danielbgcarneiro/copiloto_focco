import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, BarChart3, User, LogOut, MapPin } from 'lucide-react'

const Rotas: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')

  const rotas = [
    {
      id: 1,
      nome: 'Rota Centro',
      oportunidade: 'R$ 10.573,00',
      cidades: 5,
      oticas: 25
    },
    {
      id: 2,
      nome: 'Rota Norte',
      oportunidade: 'R$ 8.250,00',
      cidades: 3,
      oticas: 15
    },
    {
      id: 3,
      nome: 'Rota Sul',
      oportunidade: 'R$ 12.800,00',
      cidades: 4,
      oticas: 20
    },
    {
      id: 4,
      nome: 'Rota Leste',
      oportunidade: 'R$ 15.400,00',
      cidades: 6,
      oticas: 30
    }
  ]

  const filteredRotas = rotas.filter(rota =>
    rota.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/dashboard')}
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
              placeholder="Buscar rotas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Rotas List */}
        <div className="space-y-4">
          {filteredRotas.map((rota) => (
            <div
              key={rota.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/cidades')}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-gray-900">{rota.nome}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Oportunidade:</span>
                      <p className="font-medium text-gray-900">{rota.oportunidade}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Cidades:</span>
                      <p className="font-medium text-gray-900">{rota.cidades} Cidades</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Óticas:</span>
                      <p className="font-medium text-gray-900">{rota.oticas} Óticas</p>
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

export default Rotas