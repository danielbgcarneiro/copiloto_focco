import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

interface DadosMensal {
  mes: string
  meta: number
  vendas: number
  atingimento: number
  vendedores: {
    nome: string
    meta: number
    vendas: number
    atingimento: number
  }[]
}

interface ClientesMensal {
  mes: string
  totalAnoAnterior: number
  totalAnoAtual: number
  vendedores: {
    nome: string
    clientesAnoAnterior: number
    clientesAnoAtual: number
  }[]
}

interface CidadesERP {
  totalCidades: number
  comVendaAnoAnterior: number
  comVendaAnoAtual: number
}

interface VendaMensal {
  ano: number
  mes: number
  cod_vendedor: number
  nome_vendedor: string
  total_vendas: number
  meta: number
  atingimento: number
}

interface ClienteUnico {
  ano: number
  mes: number
  cod_vendedor: number
  nome_vendedor: string
  qtd_clientes_unicos: number
}

interface CidadeVenda {
  ano: number
  cidades_com_venda: number
  total_cidades: number
}

const PagAcumuladoAno: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [anoAtual] = useState(new Date().getFullYear())
  const [selectedAno, setSelectedAno] = useState(2025)
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[]>([])
  const [todosVendedores, setTodosVendedores] = useState<string[]>([])
  const [selectedVendedoresRealizado, setSelectedVendedoresRealizado] = useState<string[]>([])
  const [selectedVendedoresClientes, setSelectedVendedoresClientes] = useState<string[]>([])
  const [expandidoVendedores, setExpandidoVendedores] = useState(false)
  const [expandidoVendedoresClientesDropdown, setExpandidoVendedoresClientesDropdown] = useState(false)

  const dropdownVendedoresRealizadoRef = useRef<HTMLDivElement>(null)
  const dropdownVendedoresClientesRef = useRef<HTMLDivElement>(null)

  // Estados para dados das views
  const [vendasMensais, setVendasMensais] = useState<VendaMensal[]>([])
  const [clientesUnicos, setClientesUnicos] = useState<ClienteUnico[]>([])
  const [cidadesVendas, setCidadesVendas] = useState<CidadeVenda[]>([])

  // Buscar dados das views
  useEffect(() => {
    const carregarDados = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Buscar todas as views em paralelo
        const [
          { data: vendas, error: vendasError },
          { data: clientes, error: clientesError },
          { data: cidades, error: cidadesError }
        ] = await Promise.all([
          supabase.from('vw_vendas_mensais_vendedor').select('*'),
          supabase.from('vw_clientes_unicos_mensais').select('*'),
          supabase.from('vw_cidades_com_vendas').select('*')
        ])

        if (vendasError) console.error('Erro ao buscar vendas:', vendasError)
        if (clientesError) console.error('Erro ao buscar clientes:', clientesError)
        if (cidadesError) console.error('Erro ao buscar cidades:', cidadesError)

        setVendasMensais(vendas || [])
        setClientesUnicos(clientes || [])
        setCidadesVendas(cidades || [])

        // Extrair anos disponíveis
        const anosVendas = [...new Set(vendas?.map(v => v.ano) || [])]
        setAnosDisponiveis(anosVendas.sort((a, b) => b - a))

        // Extrair vendedores únicos
        const vendedoresUnicos = [...new Set(vendas?.map(v => v.nome_vendedor) || [])]
        setTodosVendedores(vendedoresUnicos.sort())

        // Selecionar todos os vendedores por padrão
        setSelectedVendedoresRealizado(vendedoresUnicos)
        setSelectedVendedoresClientes(vendedoresUnicos)

      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    carregarDados()
  }, [user])

  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  // Processar dados de vendas para o formato da UI
  const dadosRealizados = useMemo<DadosMensal[]>(() => {
    const vendasDoAno = vendasMensais.filter(v => v.ano === selectedAno)

    return Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1
      const vendasDoMes = vendasDoAno.filter(v => v.mes === mes)

      const vendedores = vendasDoMes.map(v => ({
        nome: v.nome_vendedor,
        meta: v.meta,
        vendas: v.total_vendas,
        atingimento: v.atingimento
      }))

      const meta = vendedores.reduce((acc, v) => acc + v.meta, 0)
      const vendas = vendedores.reduce((acc, v) => acc + v.vendas, 0)
      const atingimento = meta > 0 ? (vendas / meta) * 100 : 0

      return {
        mes: nomesMeses[i],
        meta,
        vendas,
        atingimento,
        vendedores
      }
    })
  }, [vendasMensais, selectedAno])

  // Processar dados de clientes únicos
  const dadosClientesUnicos = useMemo<ClientesMensal[]>(() => {
    const anoAnterior = selectedAno - 1
    const clientesAnoAnterior = clientesUnicos.filter(c => c.ano === anoAnterior)
    const clientesAnoAtual = clientesUnicos.filter(c => c.ano === selectedAno)

    return Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1
      const clientesMesAnterior = clientesAnoAnterior.filter(c => c.mes === mes)
      const clientesMesAtual = clientesAnoAtual.filter(c => c.mes === mes)

      const vendedores = todosVendedores.map(nome => {
        const dadosAnterior = clientesMesAnterior.find(c => c.nome_vendedor === nome)
        const dadosAtual = clientesMesAtual.find(c => c.nome_vendedor === nome)

        return {
          nome,
          clientesAnoAnterior: dadosAnterior?.qtd_clientes_unicos || 0,
          clientesAnoAtual: dadosAtual?.qtd_clientes_unicos || 0
        }
      })

      return {
        mes: nomesMeses[i],
        totalAnoAnterior: vendedores.reduce((acc, v) => acc + v.clientesAnoAnterior, 0),
        totalAnoAtual: vendedores.reduce((acc, v) => acc + v.clientesAnoAtual, 0),
        vendedores
      }
    })
  }, [clientesUnicos, selectedAno, todosVendedores])

  // Processar dados de cidades
  const cidadesERP = useMemo<CidadesERP>(() => {
    const anoAnterior = selectedAno - 1
    const dadosAnoAnterior = cidadesVendas.find(c => c.ano === anoAnterior)
    const dadosAnoAtual = cidadesVendas.find(c => c.ano === selectedAno)

    return {
      totalCidades: dadosAnoAtual?.total_cidades || dadosAnoAnterior?.total_cidades || 0,
      comVendaAnoAnterior: dadosAnoAnterior?.cidades_com_venda || 0,
      comVendaAnoAtual: dadosAnoAtual?.cidades_com_venda || 0
    }
  }, [cidadesVendas, selectedAno])

  const calcularTotaisAno = () => {
    const totalMeta = filteredDadosRealizados.reduce((acc, mes) => acc + mes.meta, 0)
    const totalVendas = filteredDadosRealizados.reduce((acc, mes) => acc + mes.vendas, 0)
    const atingimentoGeral = (totalVendas / totalMeta) * 100

    return { totalMeta, totalVendas, atingimentoGeral }
  }

  const calcularTotaisClientesAno = () => {
    const totalAnoAnterior = filteredDadosClientesUnicos.reduce((acc, mes) => acc + mes.totalAnoAnterior, 0)
    const totalAnoAtual = filteredDadosClientesUnicos.reduce((acc, mes) => acc + mes.totalAnoAtual, 0)

    return { totalAnoAnterior, totalAnoAtual }
  }

  const filteredDadosRealizados = useMemo(() => {
    return dadosRealizados.map((mes) => ({
      ...mes,
      vendedores: mes.vendedores.filter((v) => selectedVendedoresRealizado.includes(v.nome)),
      meta: mes.vendedores
        .filter((v) => selectedVendedoresRealizado.includes(v.nome))
        .reduce((acc, v) => acc + v.meta, 0),
      vendas: mes.vendedores
        .filter((v) => selectedVendedoresRealizado.includes(v.nome))
        .reduce((acc, v) => acc + v.vendas, 0),
      atingimento: (() => {
        const filteredVendedores = mes.vendedores.filter((v) => selectedVendedoresRealizado.includes(v.nome))
        const totalMeta = filteredVendedores.reduce((acc, v) => acc + v.meta, 0)
        const totalVendas = filteredVendedores.reduce((acc, v) => acc + v.vendas, 0)
        return totalMeta > 0 ? (totalVendas / totalMeta) * 100 : 0
      })()
    }))
  }, [dadosRealizados, selectedVendedoresRealizado])

  const filteredDadosClientesUnicos = useMemo(() => {
    return dadosClientesUnicos.map((mes) => ({
      ...mes,
      vendedores: mes.vendedores.filter((v) => selectedVendedoresClientes.includes(v.nome)),
      totalAnoAnterior: mes.vendedores
        .filter((v) => selectedVendedoresClientes.includes(v.nome))
        .reduce((acc, v) => acc + v.clientesAnoAnterior, 0),
      totalAnoAtual: mes.vendedores
        .filter((v) => selectedVendedoresClientes.includes(v.nome))
        .reduce((acc, v) => acc + v.clientesAnoAtual, 0)
    }))
  }, [dadosClientesUnicos, selectedVendedoresClientes])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownVendedoresRealizadoRef.current && !dropdownVendedoresRealizadoRef.current.contains(event.target as Node)) {
        setExpandidoVendedores(false)
      }
      if (dropdownVendedoresClientesRef.current && !dropdownVendedoresClientesRef.current.contains(event.target as Node)) {
        setExpandidoVendedoresClientesDropdown(false)
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
  }, [user, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const { totalMeta, totalVendas, atingimentoGeral } = calcularTotaisAno()
  const { totalAnoAnterior, totalAnoAtual } = calcularTotaisClientesAno()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="w-full sm:max-w-7xl sm:mx-auto px-2 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
            Painel Acumulado
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Visão completa do desempenho anual por mês e análise de clientes únicos
          </p>
        </div>

        {/* Realizado */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Realizado</h3>

            {/* Filtros dentro da tabela */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
              {/* Ano Filter */}
              <div>
                <select
                  value={selectedAno}
                  onChange={(e) => setSelectedAno(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white hover:border-gray-400 text-gray-900 font-medium text-sm"
                >
                  {anosDisponiveis.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>

              {/* Vendedor Filter */}
              {expandidoVendedores ? (
                <div className="relative" ref={dropdownVendedoresRealizadoRef}>
                  <button
                    onClick={() => setExpandidoVendedores(!expandidoVendedores)}
                    className="w-full px-4 py-2 text-left border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white hover:border-gray-400 text-gray-900 font-medium text-sm flex items-center justify-between"
                  >
                    <span>
                      <span className="font-semibold">Vendedores</span>
                      <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full inline-block">
                        {selectedVendedoresRealizado.length}/{todosVendedores.length}
                      </span>
                    </span>
                    <ChevronUp className="h-4 w-4 text-gray-500 transition-transform flex-shrink-0" />
                  </button>

                  <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 rounded-lg bg-white p-3 space-y-2 z-10 shadow-lg">
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {todosVendedores.map((vendedor) => (
                        <label key={vendedor} className="flex items-center cursor-pointer group text-sm">
                          <input
                            type="checkbox"
                            checked={selectedVendedoresRealizado.includes(vendedor)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVendedoresRealizado([...selectedVendedoresRealizado, vendedor])
                              } else {
                                setSelectedVendedoresRealizado(selectedVendedoresRealizado.filter(v => v !== vendedor))
                              }
                            }}
                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer transition-all"
                          />
                          <span className="ml-2 text-gray-700 group-hover:text-primary transition-colors">{vendedor}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div ref={dropdownVendedoresRealizadoRef}>
                  <button
                    onClick={() => setExpandidoVendedores(!expandidoVendedores)}
                    className="w-full px-4 py-2 text-left border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white hover:border-gray-400 text-gray-900 font-medium text-sm flex items-center justify-between"
                  >
                    <span>
                      <span className="font-semibold">Vendedores</span>
                      <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full inline-block">
                        {selectedVendedoresRealizado.length}/{todosVendedores.length}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-500 transition-transform flex-shrink-0" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Mês</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Meta</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Vendas</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Atingimento</th>
                </tr>
              </thead>
              <tbody>
                {filteredDadosRealizados.map((mesData) => (
                  <React.Fragment key={mesData.mes}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{mesData.mes}</td>
                      <td className="py-3 px-4 text-right text-gray-700">R$ {mesData.meta.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">R$ {mesData.vendas.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold ${
                          mesData.atingimento >= 100 ? 'text-green-600' :
                          mesData.atingimento >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {mesData.atingimento.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                  <td className="py-3 px-4 text-gray-900">Total Geral</td>
                  <td className="py-3 px-4 text-right text-gray-900">R$ {totalMeta.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-gray-900">R$ {totalVendas.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`${
                      atingimentoGeral >= 100 ? 'text-green-600' :
                      atingimentoGeral >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {atingimentoGeral.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Clientes únicos por mês */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Clientes por mês</h3>

            {/* Filtro de Vendedor */}
            {expandidoVendedoresClientesDropdown ? (
              <div className="relative w-full sm:w-auto" ref={dropdownVendedoresClientesRef}>
                <button
                  onClick={() => setExpandidoVendedoresClientesDropdown(!expandidoVendedoresClientesDropdown)}
                  className="w-full px-4 py-2 text-left border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white hover:border-gray-400 text-gray-900 font-medium text-sm flex items-center justify-between"
                >
                  <span>
                    <span className="font-semibold">Vendedores</span>
                    <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full inline-block">
                      {selectedVendedoresClientes.length}/{todosVendedores.length}
                    </span>
                  </span>
                  <ChevronUp className="h-4 w-4 text-gray-500 transition-transform flex-shrink-0" />
                </button>

                <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 rounded-lg bg-white p-3 space-y-2 z-10 shadow-lg">
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {todosVendedores.map((vendedor) => (
                      <label key={vendedor} className="flex items-center cursor-pointer group text-sm">
                        <input
                          type="checkbox"
                          checked={selectedVendedoresClientes.includes(vendedor)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVendedoresClientes([...selectedVendedoresClientes, vendedor])
                            } else {
                              setSelectedVendedoresClientes(selectedVendedoresClientes.filter(v => v !== vendedor))
                            }
                          }}
                          className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer transition-all"
                        />
                        <span className="ml-2 text-gray-700 group-hover:text-primary transition-colors">{vendedor}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div ref={dropdownVendedoresClientesRef}>
                <button
                  onClick={() => setExpandidoVendedoresClientesDropdown(!expandidoVendedoresClientesDropdown)}
                  className="w-full sm:w-auto px-4 py-2 text-left border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white hover:border-gray-400 text-gray-900 font-medium text-sm flex items-center justify-between"
                >
                  <span>
                    <span className="font-semibold">Vendedores</span>
                    <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full inline-block">
                      {selectedVendedoresClientes.length}/{todosVendedores.length}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500 transition-transform flex-shrink-0" />
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Mês</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">{selectedAno - 1}</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">{selectedAno}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDadosClientesUnicos.map((mesData) => (
                  <React.Fragment key={mesData.mes}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{mesData.mes}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{mesData.totalAnoAnterior}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">{mesData.totalAnoAtual}</td>
                    </tr>
                  </React.Fragment>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                  <td className="py-3 px-4 text-gray-900">Total Geral</td>
                  <td className="py-3 px-4 text-right text-gray-900">{totalAnoAnterior}</td>
                  <td className="py-3 px-4 text-right text-gray-900">{totalAnoAtual}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Total de cidades com clientes no ERP */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Total de cidades com clientes no ERP</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="text-3xl font-bold text-blue-900 mb-2">{cidadesERP.totalCidades}</div>
              <div className="text-sm font-medium text-blue-700">Total de Cidades</div>
            </div>

            <div className="text-center p-6 bg-orange-50 rounded-lg border-l-4 border-orange-500">
              <div className="text-3xl font-bold text-orange-900 mb-2">{cidadesERP.comVendaAnoAnterior}</div>
              <div className="text-sm font-medium text-orange-700">Com Venda em {selectedAno - 1}</div>
            </div>

            <div className="text-center p-6 bg-green-50 rounded-lg border-l-4 border-green-500">
              <div className="text-3xl font-bold text-green-900 mb-2">{cidadesERP.comVendaAnoAtual}</div>
              <div className="text-sm font-medium text-green-700">Com Venda em {selectedAno}</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 text-center">
              <strong>Cobertura:</strong> {cidadesERP.totalCidades > 0 ? ((cidadesERP.comVendaAnoAtual / cidadesERP.totalCidades) * 100).toFixed(1) : 0}% das cidades com vendas em {selectedAno}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PagAcumuladoAno
