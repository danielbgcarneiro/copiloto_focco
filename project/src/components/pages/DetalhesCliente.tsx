import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BarChart3, User, LogOut, Phone, MessageCircle, Mic } from 'lucide-react'

const DetalhesCliente: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  
  // Usando o id do parâmetro da rota (pode ser usado para buscar dados específicos do cliente)
  console.log('Cliente ID:', id)

  const cliente = {
    nome: 'Ótica Silvano',
    endereco: 'S LIMA DA SILVA / 123456',
    status: 'Liberado',
    statusInativo: 'Inativo',
    dados2025: {
      valor: 'R$ 5.250,00',
      qnt: 'QNT 2'
    },
    dados2024: {
      valor: 'R$ 12.523,00',
      qnt: 'QNT 5'
    },
    oportunidade: 'R$ 7.500,00',
    meta: 'R$ 13.500,00',
    atingimento: 'Ating 39%',
    mixProdutos: [
      { produto: 'RX FEM', ob: '35%', pw: '10%' },
      { produto: 'RX MAS', ob: '12%', pw: '10%' },
      { produto: 'SOL FEM', ob: '23%', pw: '-' },
      { produto: 'SOL MAS', ob: '10%', pw: '-' },
      { produto: 'TOTAL', ob: '80%', pw: '20%' }
    ]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/clientes')}
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Cliente Info */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{cliente.nome}</h2>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                {cliente.status}
              </span>
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm">
                {cliente.statusInativo}
              </span>
            </div>
            <p className="text-gray-600">{cliente.endereco}</p>
          </div>

          {/* Dados Financeiros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">2025:</span>
                <div className="text-right">
                  <span className="font-semibold">{cliente.dados2025.valor}</span>
                  <span className="ml-2 text-blue-600 text-sm">{cliente.dados2025.qnt}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">2024:</span>
                <div className="text-right">
                  <span className="font-semibold">{cliente.dados2024.valor}</span>
                  <span className="ml-2 text-blue-600 text-sm">{cliente.dados2024.qnt}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-orange-600">● Oport:</span>
                <span className="font-semibold">{cliente.oportunidade}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-600">● Meta:</span>
                <span className="font-semibold">{cliente.meta}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600"></span>
                <span className="text-blue-600 text-sm">📈 {cliente.atingimento}</span>
              </div>
            </div>
          </div>

          {/* Mix de Produtos */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mix de Produtos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2"></th>
                    <th className="text-center py-2 text-gray-600">OB</th>
                    <th className="text-center py-2 text-gray-600">PW</th>
                  </tr>
                </thead>
                <tbody>
                  {cliente.mixProdutos.map((item, index) => (
                    <tr key={index} className={index === cliente.mixProdutos.length - 1 ? 'border-t font-semibold' : ''}>
                      <td className="py-2">{item.produto}</td>
                      <td className="text-center py-2">{item.ob}</td>
                      <td className="text-center py-2">{item.pw}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-3">
            <button className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <Phone className="h-5 w-5" />
              Ligar
            </button>
            <button className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
              <MessageCircle className="h-5 w-5" />
              WhatsApp
            </button>
            <button className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center gap-2">
              <Mic className="h-5 w-5" />
              Gravar Áudio
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DetalhesCliente