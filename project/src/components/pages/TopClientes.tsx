import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface Vendedor {
  id: string
  nome: string
}

interface Rota {
  id: string
  nome: string
}

interface ClienteData {
  id: string
  nome: string
  rota: string
  cidade: string
  vendedor: string
  vendedorId: string
  rotaId: string
  vendas: { [ano: number]: number }
  metas: { [ano: number]: number }
}

interface PotencialRealizadoData {
  totalMetas: number
  totalVendas: number
  atingimento: number
}

const TopClientes: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  // Estados para filtros de período
  const [anoBase, setAnoBase] = useState(2024)
  const [anoComparacao, setAnoComparacao] = useState(2025)
  const anosDisponiveis = [2023, 2024, 2025]

  const [vendedoresSelecionados, setVendedoresSelecionados] = useState<string[]>([])
  const [rotasSelecionadas, setRotasSelecionadas] = useState<string[]>([])
  const [dropdownVendedorAberto, setDropdownVendedorAberto] = useState(false)
  const [dropdownRotaAberto, setDropdownRotaAberto] = useState(false)

  const dropdownVendedorRef = useRef<HTMLDivElement>(null)
  const dropdownRotaRef = useRef<HTMLDivElement>(null)

  const vendedores = useMemo<Vendedor[]>(() => [
    { id: '1', nome: 'João Silva' },
    { id: '2', nome: 'Maria Santos' },
    { id: '3', nome: 'Pedro Costa' },
    { id: '4', nome: 'Ana Oliveira' },
    { id: '5', nome: 'Carlos Lima' },
    { id: '6', nome: 'Fernanda Rocha' },
    { id: '7', nome: 'Roberto Alves' }
  ], [])

  const rotas = useMemo<Rota[]>(() => [
    { id: '1', nome: 'Aracati' },
    { id: '2', nome: 'Fortaleza Centro' },
    { id: '3', nome: 'Caucaia' },
    { id: '4', nome: 'Maracanaú' },
    { id: '5', nome: 'Sobral' },
    { id: '6', nome: 'Juazeiro do Norte' },
    { id: '7', nome: 'Crato' },
    { id: '8', nome: 'Iguatu' },
    { id: '9', nome: 'Quixadá' },
    { id: '10', nome: 'Canindé' }
  ], [])

  const dadosClientes = useMemo<ClienteData[]>(() => [
    { id: '1', nome: 'Ótica Central', rota: 'Fortaleza Centro', cidade: 'Fortaleza', vendedor: 'João Silva', vendedorId: '1', rotaId: '2', vendas: { 2023: 265000, 2024: 285000, 2025: 195000 }, metas: { 2023: 280000, 2024: 300000, 2025: 320000 } },
    { id: '2', nome: 'Visão Perfeita', rota: 'Sobral', cidade: 'Sobral', vendedor: 'Ana Oliveira', vendedorId: '4', rotaId: '5', vendas: { 2023: 215000, 2024: 235000, 2025: 165000 }, metas: { 2023: 240000, 2024: 260000, 2025: 280000 } },
    { id: '3', nome: 'Óptica Moderna', rota: 'Caucaia', cidade: 'Caucaia', vendedor: 'Maria Santos', vendedorId: '2', rotaId: '3', vendas: { 2023: 180000, 2024: 195000, 2025: 145000 }, metas: { 2023: 195000, 2024: 210000, 2025: 220000 } },
    { id: '4', nome: 'Centro Oftálmico', rota: 'Juazeiro do Norte', cidade: 'Juazeiro do Norte', vendedor: 'Carlos Lima', vendedorId: '5', rotaId: '6', vendas: { 2023: 155000, 2024: 165000, 2025: 125000 }, metas: { 2023: 170000, 2024: 180000, 2025: 190000 } },
    { id: '5', nome: 'Ótica Cristal', rota: 'Maracanaú', cidade: 'Maracanaú', vendedor: 'Pedro Costa', vendedorId: '3', rotaId: '4', vendas: { 2023: 115000, 2024: 125000, 2025: 98000 }, metas: { 2023: 130000, 2024: 140000, 2025: 150000 } },
    { id: '6', nome: 'Vista Clara', rota: 'Iguatu', cidade: 'Iguatu', vendedor: 'Fernanda Rocha', vendedorId: '6', rotaId: '8', vendas: { 2023: 105000, 2024: 115000, 2025: 89000 }, metas: { 2023: 120000, 2024: 128000, 2025: 135000 } },
    { id: '7', nome: 'Óptica Ideal', rota: 'Quixadá', cidade: 'Quixadá', vendedor: 'Roberto Alves', vendedorId: '7', rotaId: '9', vendas: { 2023: 85000, 2024: 92000, 2025: 78000 }, metas: { 2023: 98000, 2024: 105000, 2025: 110000 } },
    { id: '8', nome: 'Ótica Premium', rota: 'Crato', cidade: 'Crato', vendedor: 'Carlos Lima', vendedorId: '5', rotaId: '7', vendas: { 2023: 92000, 2024: 98000, 2025: 76000 }, metas: { 2023: 105000, 2024: 115000, 2025: 120000 } },
    { id: '9', nome: 'Visão Total', rota: 'Fortaleza Centro', cidade: 'Fortaleza', vendedor: 'João Silva', vendedorId: '1', rotaId: '2', vendas: { 2023: 80000, 2024: 87000, 2025: 72000 }, metas: { 2023: 92000, 2024: 98000, 2025: 105000 } },
    { id: '10', nome: 'Óptica Nova', rota: 'Aracati', cidade: 'Aracati', vendedor: 'Maria Santos', vendedorId: '2', rotaId: '1', vendas: { 2023: 68000, 2024: 73000, 2025: 65000 }, metas: { 2023: 78000, 2024: 84000, 2025: 88000 } },
    { id: '11', nome: 'Centro da Visão', rota: 'Sobral', cidade: 'Sobral', vendedor: 'Ana Oliveira', vendedorId: '4', rotaId: '5', vendas: { 2023: 62000, 2024: 68000, 2025: 58000 }, metas: { 2023: 72000, 2024: 78000, 2025: 82000 } },
    { id: '12', nome: 'Ótica Express', rota: 'Caucaia', cidade: 'Caucaia', vendedor: 'Maria Santos', vendedorId: '2', rotaId: '3', vendas: { 2023: 60000, 2024: 65000, 2025: 55000 }, metas: { 2023: 70000, 2024: 74000, 2025: 78000 } },
    { id: '13', nome: 'Visão & Estilo', rota: 'Maracanaú', cidade: 'Maracanaú', vendedor: 'Pedro Costa', vendedorId: '3', rotaId: '4', vendas: { 2023: 53000, 2024: 58000, 2025: 48000 }, metas: { 2023: 62000, 2024: 66000, 2025: 70000 } },
    { id: '14', nome: 'Óptica Atual', rota: 'Iguatu', cidade: 'Iguatu', vendedor: 'Fernanda Rocha', vendedorId: '6', rotaId: '8', vendas: { 2023: 48000, 2024: 52000, 2025: 42000 }, metas: { 2023: 56000, 2024: 60000, 2025: 63000 } },
    { id: '15', nome: 'Vista Bela', rota: 'Canindé', cidade: 'Canindé', vendedor: 'Roberto Alves', vendedorId: '7', rotaId: '10', vendas: { 2023: 44000, 2024: 48000, 2025: 38000 }, metas: { 2023: 52000, 2024: 55000, 2025: 58000 } },
    { id: '16', nome: 'Ótica Família', rota: 'Juazeiro do Norte', cidade: 'Juazeiro do Norte', vendedor: 'Carlos Lima', vendedorId: '5', rotaId: '6', vendas: { 2023: 41000, 2024: 45000, 2025: 36000 }, metas: { 2023: 49000, 2024: 52000, 2025: 55000 } },
    { id: '17', nome: 'Visão Clara', rota: 'Crato', cidade: 'Crato', vendedor: 'Carlos Lima', vendedorId: '5', rotaId: '7', vendas: { 2023: 38000, 2024: 42000, 2025: 34000 }, metas: { 2023: 46000, 2024: 49000, 2025: 52000 } },
    { id: '18', nome: 'Óptica Sol', rota: 'Quixadá', cidade: 'Quixadá', vendedor: 'Roberto Alves', vendedorId: '7', rotaId: '9', vendas: { 2023: 36000, 2024: 39000, 2025: 31000 }, metas: { 2023: 43000, 2024: 46000, 2025: 48000 } },
    { id: '19', nome: 'Centro Ótico', rota: 'Aracati', cidade: 'Aracati', vendedor: 'Maria Santos', vendedorId: '2', rotaId: '1', vendas: { 2023: 33000, 2024: 36000, 2025: 28000 }, metas: { 2023: 40000, 2024: 43000, 2025: 45000 } },
    { id: '20', nome: 'Visão Moderna', rota: 'Fortaleza Centro', cidade: 'Fortaleza', vendedor: 'João Silva', vendedorId: '1', rotaId: '2', vendas: { 2023: 31000, 2024: 34000, 2025: 26000 }, metas: { 2023: 38000, 2024: 40000, 2025: 42000 } },
    { id: '21', nome: 'Óptica Smart', rota: 'Sobral', cidade: 'Sobral', vendedor: 'Ana Oliveira', vendedorId: '4', rotaId: '5', vendas: { 2023: 29000, 2024: 32000, 2025: 24000 }, metas: { 2023: 36000, 2024: 38000, 2025: 40000 } },
    { id: '22', nome: 'Vista & Cia', rota: 'Caucaia', cidade: 'Caucaia', vendedor: 'Maria Santos', vendedorId: '2', rotaId: '3', vendas: { 2023: 27000, 2024: 29000, 2025: 22000 }, metas: { 2023: 33000, 2024: 35000, 2025: 37000 } },
    { id: '23', nome: 'Ótica Brasil', rota: 'Maracanaú', cidade: 'Maracanaú', vendedor: 'Pedro Costa', vendedorId: '3', rotaId: '4', vendas: { 2023: 25000, 2024: 27000, 2025: 20000 }, metas: { 2023: 31000, 2024: 33000, 2025: 35000 } },
    { id: '24', nome: 'Visão Plus', rota: 'Iguatu', cidade: 'Iguatu', vendedor: 'Fernanda Rocha', vendedorId: '6', rotaId: '8', vendas: { 2023: 23000, 2024: 25000, 2025: 18000 }, metas: { 2023: 28000, 2024: 30000, 2025: 32000 } },
    { id: '25', nome: 'Óptica Vida', rota: 'Canindé', cidade: 'Canindé', vendedor: 'Roberto Alves', vendedorId: '7', rotaId: '10', vendas: { 2023: 21000, 2024: 23000, 2025: 16000 }, metas: { 2023: 26000, 2024: 28000, 2025: 30000 } },
    { id: '26', nome: 'Centro Visual', rota: 'Juazeiro do Norte', cidade: 'Juazeiro do Norte', vendedor: 'Carlos Lima', vendedorId: '5', rotaId: '6', vendas: { 2023: 19000, 2024: 21000, 2025: 14000 }, metas: { 2023: 24000, 2024: 26000, 2025: 28000 } },
    { id: '27', nome: 'Ótica Digital', rota: 'Crato', cidade: 'Crato', vendedor: 'Carlos Lima', vendedorId: '5', rotaId: '7', vendas: { 2023: 17000, 2024: 19000, 2025: 12000 }, metas: { 2023: 22000, 2024: 24000, 2025: 25000 } },
    { id: '28', nome: 'Visão Pro', rota: 'Quixadá', cidade: 'Quixadá', vendedor: 'Roberto Alves', vendedorId: '7', rotaId: '9', vendas: { 2023: 15000, 2024: 17000, 2025: 10000 }, metas: { 2023: 20000, 2024: 22000, 2025: 23000 } },
    { id: '29', nome: 'Óptica Top', rota: 'Aracati', cidade: 'Aracati', vendedor: 'Maria Santos', vendedorId: '2', rotaId: '1', vendas: { 2023: 13000, 2024: 15000, 2025: 8000 }, metas: { 2023: 18000, 2024: 19000, 2025: 20000 } },
    { id: '30', nome: 'Vista Real', rota: 'Fortaleza Centro', cidade: 'Fortaleza', vendedor: 'João Silva', vendedorId: '1', rotaId: '2', vendas: { 2023: 11000, 2024: 13000, 2025: 6000 }, metas: { 2023: 16000, 2024: 17000, 2025: 18000 } },
    { id: '31', nome: 'Óptica Elite', rota: 'Sobral', cidade: 'Sobral', vendedor: 'Ana Oliveira', vendedorId: '4', rotaId: '5', vendas: { 2023: 9000, 2024: 11000, 2025: 4000 }, metas: { 2023: 13000, 2024: 14000, 2025: 15000 } },
    { id: '32', nome: 'Visão Master', rota: 'Caucaia', cidade: 'Caucaia', vendedor: 'Maria Santos', vendedorId: '2', rotaId: '3', vendas: { 2023: 7000, 2024: 9000, 2025: 2000 }, metas: { 2023: 11000, 2024: 11500, 2025: 12000 } }
  ], [])

  const potencialRealizado = useMemo<PotencialRealizadoData>(() => {
    const totalMetas = dadosClientes.reduce((acc, cliente) => acc + (cliente.metas[anoComparacao] || 0), 0)
    const totalVendas = dadosClientes.reduce((acc, cliente) => acc + (cliente.vendas[anoComparacao] || 0), 0)
    const atingimento = totalMetas > 0 ? (totalVendas / totalMetas) * 100 : 0

    return { totalMetas, totalVendas, atingimento }
  }, [dadosClientes, anoComparacao])

  const clientesFiltrados = useMemo(() => {
    let filtered = dadosClientes

    if (vendedoresSelecionados.length > 0) {
      filtered = filtered.filter(cliente =>
        vendedoresSelecionados.includes(cliente.vendedorId)
      )
    }

    if (rotasSelecionadas.length > 0) {
      filtered = filtered.filter(cliente =>
        rotasSelecionadas.includes(cliente.rotaId)
      )
    }

    return filtered.sort((a, b) => (b.vendas[anoComparacao] || 0) - (a.vendas[anoComparacao] || 0)).slice(0, 30)
  }, [dadosClientes, vendedoresSelecionados, rotasSelecionadas, anoComparacao])

  const handleVendedorChange = (vendedorId: string) => {
    setVendedoresSelecionados(prev => 
      prev.includes(vendedorId) 
        ? prev.filter(id => id !== vendedorId)
        : [...prev, vendedorId]
    )
  }

  const handleRotaChange = (rotaId: string) => {
    setRotasSelecionadas(prev => 
      prev.includes(rotaId) 
        ? prev.filter(id => id !== rotaId)
        : [...prev, rotaId]
    )
  }

  const selecionarTodosVendedores = () => {
    if (vendedoresSelecionados.length === vendedores.length) {
      setVendedoresSelecionados([])
    } else {
      setVendedoresSelecionados(vendedores.map(v => v.id))
    }
  }

  const selecionarTodasRotas = () => {
    if (rotasSelecionadas.length === rotas.length) {
      setRotasSelecionadas([])
    } else {
      setRotasSelecionadas(rotas.map(r => r.id))
    }
  }

  const handleAnoBaseChange = (ano: number) => {
    if (ano === anoComparacao) {
      const novosAnos = anosDisponiveis.filter(a => a !== ano)
      if (novosAnos.length > 0) {
        setAnoComparacao(novosAnos[novosAnos.length - 1])
      }
    }
    setAnoBase(ano)
  }

  const handleAnoComparacaoChange = (ano: number) => {
    if (ano === anoBase) {
      const novosAnos = anosDisponiveis.filter(a => a !== ano)
      if (novosAnos.length > 0) {
        setAnoBase(novosAnos[0])
      }
    }
    setAnoComparacao(ano)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownVendedorRef.current && !dropdownVendedorRef.current.contains(event.target as Node)) {
        setDropdownVendedorAberto(false)
      }
      if (dropdownRotaRef.current && !dropdownRotaRef.current.contains(event.target as Node)) {
        setDropdownRotaAberto(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    if (user.cargo !== 'diretor') {
      navigate('/dashboard')
      return
    }

    setLoading(false)
  }, [user, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full sm:max-w-7xl sm:mx-auto px-2 sm:px-6 lg:px-8 py-4 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
            Top Clientes
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Análise dos principais clientes por vendedor e região
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Potencial x Realizado ({anoComparacao})</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="text-3xl font-bold text-blue-900 mb-2">R$ {potencialRealizado.totalMetas.toLocaleString()}</div>
              <div className="text-sm font-medium text-blue-700">Total de Metas (Potencial)</div>
            </div>
            
            <div className="text-center p-6 bg-green-50 rounded-lg border-l-4 border-green-500">
              <div className="text-3xl font-bold text-green-900 mb-2">R$ {potencialRealizado.totalVendas.toLocaleString()}</div>
              <div className="text-sm font-medium text-green-700">Total de Vendas (Realizado)</div>
            </div>
            
            <div className="text-center p-6 bg-purple-50 rounded-lg border-l-4 border-purple-500">
              <div className={`text-3xl font-bold mb-2 ${
                potencialRealizado.atingimento >= 100 ? 'text-green-900' :
                potencialRealizado.atingimento >= 80 ? 'text-yellow-900' : 'text-red-900'
              }`}>
                {potencialRealizado.atingimento.toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-purple-700">Atingimento Geral</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top 30 Clientes</h3>

          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={anoBase}
                  onChange={(e) => handleAnoBaseChange(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 font-medium text-sm"
                >
                  {anosDisponiveis.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>

                <span className="text-gray-500 font-semibold text-sm">vs</span>

                <select
                  value={anoComparacao}
                  onChange={(e) => handleAnoComparacaoChange(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 font-medium text-sm"
                >
                  {anosDisponiveis.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>

              <div className="hidden sm:block h-8 w-px bg-gray-300"></div>

              <div className="relative" ref={dropdownVendedorRef}>
                <button
                  onClick={() => setDropdownVendedorAberto(!dropdownVendedorAberto)}
                  className="flex items-center justify-between w-full sm:w-48 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                >
                  <span className="text-gray-700">
                    {vendedoresSelecionados.length === 0
                      ? 'Todos os vendedores'
                      : vendedoresSelecionados.length === vendedores.length
                      ? 'Todos selecionados'
                      : `${vendedoresSelecionados.length} vendedores`
                    }
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {dropdownVendedorAberto && (
                  <div className="absolute left-0 sm:right-0 mt-1 w-56 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      <button
                        onClick={selecionarTodosVendedores}
                        className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded"
                      >
                        {vendedoresSelecionados.length === vendedores.length ? 'Desmarcar todos' : 'Selecionar todos'}
                      </button>
                      <div className="border-t border-gray-200 my-2"></div>
                      {vendedores.map(vendedor => (
                        <label key={vendedor.id} className="flex items-center px-3 py-2 text-sm hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={vendedoresSelecionados.includes(vendedor.id)}
                            onChange={() => handleVendedorChange(vendedor.id)}
                            className="mr-2 text-primary focus:ring-primary"
                          />
                          {vendedor.nome}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={dropdownRotaRef}>
                <button
                  onClick={() => setDropdownRotaAberto(!dropdownRotaAberto)}
                  className="flex items-center justify-between w-full sm:w-40 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                >
                  <span className="text-gray-700">
                    {rotasSelecionadas.length === 0
                      ? 'Todas as rotas'
                      : rotasSelecionadas.length === rotas.length
                      ? 'Todas selecionadas'
                      : `${rotasSelecionadas.length} rotas`
                    }
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {dropdownRotaAberto && (
                  <div className="absolute left-0 sm:right-0 mt-1 w-56 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      <button
                        onClick={selecionarTodasRotas}
                        className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded"
                      >
                        {rotasSelecionadas.length === rotas.length ? 'Desmarcar todos' : 'Selecionar todas'}
                        </button>
                      <div className="border-t border-gray-200 my-2"></div>
                      {rotas.map(rota => (
                        <label key={rota.id} className="flex items-center px-3 py-2 text-sm hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rotasSelecionadas.includes(rota.id)}
                            onChange={() => handleRotaChange(rota.id)}
                            className="mr-2 text-primary focus:ring-primary"
                          />
                          {rota.nome}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Rota</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Cidade</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Vendas {anoBase}</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Meta {anoComparacao}</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Vendas {anoComparacao}</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Crescimento</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente, index) => {
                  const vendasBase = cliente.vendas[anoBase] || 0
                  const vendasComparacao = cliente.vendas[anoComparacao] || 0
                  const metaComparacao = cliente.metas[anoComparacao] || 0
                  const crescimento = vendasBase > 0 ? ((vendasComparacao - vendasBase) / vendasBase) * 100 : 0

                  return (
                    <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold mr-3 ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{cliente.nome}</div>
                            <div className="text-sm text-gray-500">{cliente.vendedor}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{cliente.rota}</td>
                      <td className="py-3 px-4 text-gray-700">{cliente.cidade}</td>
                      <td className="py-3 px-4 text-right text-gray-700">R$ {vendasBase.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-blue-700 font-medium">R$ {metaComparacao.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">R$ {vendasComparacao.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end">
                          <span className={`font-bold ${
                            crescimento > 0 ? 'text-green-600' :
                            crescimento < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {crescimento > 0 ? '+' : ''}{crescimento.toFixed(1)}%
                          </span>
                          {crescimento !== 0 && (
                            <span className={`ml-1 ${
                              crescimento > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {crescimento > 0 ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

export default TopClientes