import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Filter, BarChart3, User, LogOut } from 'lucide-react'

const Clientes: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')

  const clientes = [
    {
      id: 1,
      nome: 'Ótica Paris',
      codigo: '100456',
      status: 'Liberado',
      statusColor: 'bg-green-100 text-green-800',
      oportk: 'R$19k',
      meta: 'R$18k',
      ating: 'R$9k (50%)',
      crec: 'R$133',
      bairro: 'Aldeota'
    },
    {
      id: 2,
      nome: 'Ótica Silvano',
      codigo: '100789',
      status: 'Bloqueado',
      statusColor: 'bg-red-100 text-red-800',
      oportk: 'R$8k',
      meta: 'R$10k',
      ating: 'R$3.5k (35%)',
      crec: 'R$1.5k',
      bairro: 'Meireles'
    },
    {
      id: 3,
      nome: 'Ótica Visão',
      codigo: '100123',
      status: 'Liberado',
      statusColor: 'bg-green-100 text-green-800',
      oportk: 'R$10k',
      meta: 'R$12k',
      ating: 'R$4.5k (38%)',
      crec: 'R$1.5k',
      bairro: 'Centro'
    }
  ]

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.codigo.includes(searchTerm)
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
              placeholder="Buscar Óticas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button className="ml-4 p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Clientes List */}
        <div className="space-y-4">
          {filteredClientes.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/cliente/${cliente.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{cliente.nome}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cliente.statusColor}`}>
                      {cliente.status}
                    </span>
                    <span className="text-sm text-gray-500">Ativo</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Código: {cliente.codigo}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Oport:</span>
                      <span className="ml-1 font-medium">{cliente.oportk}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Meta:</span>
                      <span className="ml-1 font-medium">{cliente.meta}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Ating:</span>
                      <span className="ml-1 font-medium">{cliente.ating}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Crec:</span>
                      <span className="ml-1 font-medium">{cliente.crec}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Bairro: {cliente.bairro}</p>
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