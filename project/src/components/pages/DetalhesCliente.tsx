import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User, LogOut, Phone, MessageCircle, Mic } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'

const DetalhesCliente: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { } = useUserData()
  const { id } = useParams()
  
  // Usando o id do parâmetro da rota (pode ser usado para buscar dados específicos do cliente)
  console.log('Cliente ID:', id)

  const cliente = {
    nome: 'Ótica Silvano',
    endereco: 'S LIMA DA SILVA / 123456',
    status: 'Liberado',
    statusInativo: 'Inativo',
    dsv: 120,
    dados2025: {
      valor: 'R$ 5.550,20',
      qnt: 'Qnt: 2'
    },
    dados2024: {
      valor: 'R$ 12.000,00',
      qnt: 'Qnt: 5'
    },
    oportunidade: 'R$ 7.000,00',
    meta: 'R$ 13.500,00',
    atingimento: 'Ating: 39%',
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 relative">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/clientes')}
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
      <main className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          {/* Cliente Info */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-gray-900">{cliente.nome}</h2>
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  {cliente.status}
                </span>
                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs">
                  {cliente.statusInativo}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-600">DSV:</span>
                <span className="text-xs font-semibold text-red-600">{cliente.dsv}d</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-2 leading-tight">{cliente.endereco}</p>
          </div>

          {/* Dados Financeiros */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-2 text-xs leading-tight">
              <div className="leading-tight">
                <span className="text-gray-600">2025: </span>
                <span className="font-semibold">{cliente.dados2025.valor}</span>
              </div>
              <div className="text-right leading-tight">
                <span className="text-gray-600">{cliente.dados2025.qnt}</span>
              </div>
              
              <div className="leading-tight">
                <span className="text-gray-600">2024: </span>
                <span className="font-semibold">{cliente.dados2024.valor}</span>
              </div>
              <div className="text-right leading-tight">
                <span className="text-gray-600">{cliente.dados2024.qnt}</span>
              </div>
              
              <div className="leading-tight">
                <span className="text-green-600">Oport: </span>
                <span className="font-semibold text-green-700">{cliente.oportunidade}</span>
              </div>
              <div></div>
              
              <div className="leading-tight">
                <span className="text-blue-600">Meta: </span>
                <span className="font-semibold text-blue-700">{cliente.meta}</span>
              </div>
              <div className="text-right leading-tight">
                <span className="text-gray-600">{cliente.atingimento}</span>
              </div>
            </div>
          </div>

          {/* Mix de Produtos */}
          <div className="mb-4 pb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Mix de Produtos</h3>
            <div className="overflow-x-auto bg-white rounded-lg shadow-lg border-2 border-primary/60">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-primary/25 border-b-2 border-primary/70">
                    <th className="text-left py-2 px-3 font-bold text-gray-900">Produto</th>
                    <th className="text-center py-2 px-3 font-bold text-gray-900">OB</th>
                    <th className="text-center py-2 px-3 font-bold text-gray-900">PW</th>
                  </tr>
                </thead>
                <tbody>
                  {cliente.mixProdutos.map((item, index) => (
                    <tr key={index} className={`
                      ${index === cliente.mixProdutos.length - 1 
                        ? 'border-t-2 border-primary bg-primary/20 font-bold' 
                        : index % 2 === 0 ? 'bg-gray-200' : 'bg-white'
                      }
                      hover:bg-primary/25 transition-colors
                    `}>
                      <td className="py-2 px-3 text-black font-semibold">{item.produto}</td>
                      <td className="text-center py-2 px-3 text-black font-bold">{item.ob}</td>
                      <td className="text-center py-2 px-3 text-black font-bold">{item.pw}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-4 border-t border-gray-200">
            <div className="space-y-2">
              <button className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <Phone className="h-4 w-4" />
                <span className="text-sm">Ligar</span>
              </button>
              <button className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">WhatsApp</span>
              </button>
              <button className="w-full bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center gap-2">
                <Mic className="h-4 w-4" />
                <span className="text-sm">Gravar Áudio</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DetalhesCliente