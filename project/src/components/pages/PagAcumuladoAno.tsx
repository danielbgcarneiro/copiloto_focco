import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const [filtroVendedor, setFiltroVendedor] = useState<string>('')

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

        // Buscar tabelas e views em paralelo
        const [
          { data: vendas, error: vendasError },
          { data: metas, error: metasError },
          { data: clientes, error: clientesError },
          { data: cidades, error: cidadesError }
        ] = await Promise.all([
          supabase.from('vendas_mensais_vendedor').select('*'),
          supabase.from('metas_vendedores').select('*'),
          supabase.from('vw_clientes_unicos_mensais').select('*'),
          supabase.from('vw_cidades_com_vendas').select('*')
        ])

        if (vendasError) console.error('Erro ao buscar vendas:', vendasError)
        if (metasError) console.error('Erro ao buscar metas:', metasError)
        if (clientesError) console.error('Erro ao buscar clientes:', clientesError)
        if (cidadesError) console.error('Erro ao buscar cidades:', cidadesError)

        // Merge vendas com metas
        const vendasComMetas: VendaMensal[] = vendas?.map(venda => {
          const meta = metas?.find(m =>
            m.cod_vendedor === venda.cod_vendedor &&
            m.ano === venda.ano &&
            m.mes === venda.mes
          )

          const metaValor = meta?.meta_valor || 0
          const atingimento = metaValor > 0 ? (venda.total_vendas / metaValor) * 100 : 0

          return {
            ano: venda.ano,
            mes: venda.mes,
            cod_vendedor: venda.cod_vendedor,
            nome_vendedor: venda.nome_vendedor,
            total_vendas: venda.total_vendas,
            meta: metaValor,
            atingimento: Number(atingimento.toFixed(1))
          }
        }) || []

        setVendasMensais(vendasComMetas)
        setClientesUnicos(clientes || [])
        setCidadesVendas(cidades || [])

        // Extrair anos disponíveis
        const anosVendas = [...new Set(vendasComMetas.map(v => v.ano))]
        setAnosDisponiveis(anosVendas.sort((a, b) => b - a))

        // Extrair vendedores únicos
        const vendedoresUnicos = [...new Set(vendasComMetas.map(v => v.nome_vendedor))]
        setTodosVendedores(vendedoresUnicos.sort())

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
    return dadosRealizados.map((mes) => {
      const vendedoresFiltrados = filtroVendedor
        ? mes.vendedores.filter((v) => v.nome === filtroVendedor)
        : mes.vendedores

      const totalMeta = vendedoresFiltrados.reduce((acc, v) => acc + v.meta, 0)
      const totalVendas = vendedoresFiltrados.reduce((acc, v) => acc + v.vendas, 0)
      const atingimento = totalMeta > 0 ? (totalVendas / totalMeta) * 100 : 0

      return {
        ...mes,
        vendedores: vendedoresFiltrados,
        meta: totalMeta,
        vendas: totalVendas,
        atingimento
      }
    })
  }, [dadosRealizados, filtroVendedor])

  const filteredDadosClientesUnicos = useMemo(() => {
    return dadosClientesUnicos.map((mes) => {
      const vendedoresFiltrados = filtroVendedor
        ? mes.vendedores.filter((v) => v.nome === filtroVendedor)
        : mes.vendedores

      return {
        ...mes,
        vendedores: vendedoresFiltrados,
        totalAnoAnterior: vendedoresFiltrados.reduce((acc, v) => acc + v.clientesAnoAnterior, 0),
        totalAnoAtual: vendedoresFiltrados.reduce((acc, v) => acc + v.clientesAnoAtual, 0)
      }
    })
  }, [dadosClientesUnicos, filtroVendedor])

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

        {/* Card de Filtros */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ano Filter */}
            <div className="relative">
              <select
                value={selectedAno}
                onChange={(e) => setSelectedAno(parseInt(e.target.value))}
                className="w-full pl-3 pr-10 py-2 border rounded-lg text-sm shadow-sm appearance-none"
              >
                {anosDisponiveis.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>

            {/* Vendedor Filter */}
            <div className="relative">
              <select
                value={filtroVendedor}
                onChange={(e) => setFiltroVendedor(e.target.value)}
                className="w-full pl-3 pr-10 py-2 border rounded-lg text-sm shadow-sm appearance-none"
              >
                <option value="">Todos os Vendedores</option>
                {todosVendedores.map(vendedor => (
                  <option key={vendedor} value={vendedor}>{vendedor}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Realizado */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Realizado</h3>

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
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Clientes por mês</h3>

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
