import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, User, LogOut, MapPin } from 'lucide-react'

const Rotas: React.FC = () => {
  const navigate = useNavigate()
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
                <span className="text-sm">Charles</span>
              </div>
              <button 
                onClick={() => navigate('/')}
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

        {/* Rotas List */}
        <div className="space-y-3">
          {filteredRotas.map((rota) => (
            <div
              key={rota.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
              onClick={() => navigate('/cidades')}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-semibold text-gray-900">{rota.nome}</h3>
                  </div>
                  
                  <div className="mb-2"></div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs leading-tight">
                    <div>
                      <span className="text-green-600">Oportunidade:</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-700">{rota.oportunidade}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Cidades:</span>
                      <span className="font-semibold text-blue-700 ml-1">{rota.cidades}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-purple-600">Óticas:</span>
                      <span className="font-semibold text-purple-700 ml-1">{rota.oticas}</span>
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