import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

interface RotaData {
  rota: string
  nome_rota: string
  vendedor_apelido: string
  vendedor_uuid: string
  qtd_oticas: number
  total_oticas: number
  vendido_2025: number
  meta_2025: number
  percentual_meta: number
  ranking: number
  total_cidades: number
  qtd_cidades: number
  clientes_sem_venda_90d: number
  oticas_sem_vendas_90d: number
  soma_oportunidades: number
}

// Interface CidadeData removida - Top Cidades não existe mais

interface CidadeComMeta {
  cidade: string
  codigo_ibge_cidade: string
  rota: string
  vendedor_apelido: string
  meta_cidade: number
  vendas_cidade: number
  qtd_clientes: number
  percentual_atingimento: number
  saldo_meta: number
}

interface VendedorInfo {
  uuid: string
  nome: string
}

type RotaSortField = 'rota' | 'meta_2025' | 'vendido_2025' | 'percentual_meta'
type SortDirection = 'asc' | 'desc'

const DashboardRotas: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rotasData, setRotasData] = useState<RotaData[]>([])
  const [vendedores, setVendedores] = useState<VendedorInfo[]>([])

  const [vendedoresSelecionadosRotas, setVendedoresSelecionadosRotas] = useState<string[]>([])
  const [dropdownRotasAberto, setDropdownRotasAberto] = useState(false)

  const dropdownRotasRef = useRef<HTMLDivElement>(null)

  const [expandedRota, setExpandedRota] = useState<string | null>(null)
  const [cidadesComMeta, setCidadesComMeta] = useState<Map<string, CidadeComMeta[]>>(new Map())
  const [loadingCidades, setLoadingCidades] = useState(false)
  const [sortCidadesExpandidas, setSortCidadesExpandidas] = useState<{ field: keyof CidadeComMeta; direction: SortDirection }>({ field: 'vendas_cidade', direction: 'desc' })

  const [sortRotas, setSortRotas] = useState<{ field: RotaSortField; direction: SortDirection }>({ field: 'vendido_2025', direction: 'desc' })

  useEffect(() => {
    const carregarDados = async () => {
      if (!user) return

      try {
        setLoading(true)

        // 1. Buscar todas as rotas ativas de todos os vendedores
        const { data: rotasVendedor, error: rotasError } = await supabase
          .from('vendedor_rotas')
          .select('rota, vendedor_id')
          .eq('ativo', true)

        if (rotasError) {
          console.error('Erro ao buscar rotas:', rotasError)
          return
        }

        if (!rotasVendedor || rotasVendedor.length === 0) {
          setRotasData([])
          return
        }

        // 2. Buscar perfis dos vendedores
        const vendedorIds = [...new Set(rotasVendedor.map(r => r.vendedor_id))]
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, apelido, cod_vendedor')
          .in('id', vendedorIds)

        if (profilesError) {
          console.error('Erro ao buscar perfis:', profilesError)
          return
        }

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])

        // 3. Buscar mapeamento cidade -> rota
        const rotasUnicas = [...new Set(rotasVendedor.map(r => r.rota))]
        const { data: rotasEstado, error: rotasEstadoError } = await supabase
          .from('rotas_estado')
          .select('codigo_ibge_cidade, rota')
          .in('rota', rotasUnicas)

        if (rotasEstadoError) {
          console.error('Erro ao buscar rotas_estado:', rotasEstadoError)
          return
        }

        const cidadeRotaMap = new Map<string, string>()
        rotasEstado?.forEach(re => {
          if (re.codigo_ibge_cidade) {
            cidadeRotaMap.set(re.codigo_ibge_cidade, re.rota)
          }
        })

        // 4. Buscar todos os clientes com dados RFM
        const codigosVendedor = profiles?.map(p => p.cod_vendedor).filter(Boolean) || []
        const { data: clientes, error: clientesError } = await supabase
          .from('tabela_clientes')
          .select(`
            codigo_cliente,
            codigo_ibge_cidade,
            cidade,
            cod_vendedor,
            analise_rfm (
              valor_ano_atual,
              meta_ano_atual,
              previsao_pedido,
              dias_sem_comprar
            )
          `)
          .in('cod_vendedor', codigosVendedor)

        if (clientesError) {
          console.error('Erro ao buscar clientes:', clientesError)
          return
        }

        // 5. Agrupar dados por vendedor + rota
        interface RotaStats {
          rota: string
          vendedor_uuid: string
          vendedor_apelido: string
          totalCidades: Set<string>
          totalOticas: number
          somaOportunidades: number
          semVendas90d: number
          metaAnoAtual: number
          valorAnoAtual: number
        }

        const rotasStatsMap = new Map<string, RotaStats>()

        // Inicializar todas as rotas
        rotasVendedor.forEach(rv => {
          const profile = profilesMap.get(rv.vendedor_id)
          if (profile) {
            const key = `${rv.vendedor_id}-${rv.rota}`
            rotasStatsMap.set(key, {
              rota: rv.rota,
              vendedor_uuid: rv.vendedor_id,
              vendedor_apelido: profile.apelido || 'Sem nome',
              totalCidades: new Set<string>(),
              totalOticas: 0,
              somaOportunidades: 0,
              semVendas90d: 0,
              metaAnoAtual: 0,
              valorAnoAtual: 0
            })
          }
        })

        // Agregar dados dos clientes
        clientes?.forEach((cliente: any) => {
          const rota = cidadeRotaMap.get(cliente.codigo_ibge_cidade)
          const profile = profiles?.find(p => p.cod_vendedor === cliente.cod_vendedor)

          if (rota && profile) {
            const key = `${profile.id}-${rota}`
            const stats = rotasStatsMap.get(key)

            if (stats) {
              if (cliente.cidade) {
                stats.totalCidades.add(cliente.cidade)
              }

              stats.totalOticas += 1

              if (cliente.analise_rfm) {
                stats.valorAnoAtual += cliente.analise_rfm.valor_ano_atual || 0
                stats.metaAnoAtual += cliente.analise_rfm.meta_ano_atual || 0
                stats.somaOportunidades += cliente.analise_rfm.previsao_pedido || 0

                if ((cliente.analise_rfm.dias_sem_comprar || 0) >= 90) {
                  stats.semVendas90d += 1
                }
              }
            }
          }
        })

        // 6. Converter para formato esperado pelo componente
        const rotasProcessadas: RotaData[] = Array.from(rotasStatsMap.values())
          .map(stats => ({
            rota: stats.rota,
            nome_rota: stats.rota,
            vendedor_apelido: stats.vendedor_apelido,
            vendedor_uuid: stats.vendedor_uuid,
            qtd_oticas: stats.totalOticas,
            total_oticas: stats.totalOticas,
            vendido_2025: stats.valorAnoAtual,
            meta_2025: stats.metaAnoAtual,
            percentual_meta: stats.metaAnoAtual > 0 ? (stats.valorAnoAtual / stats.metaAnoAtual) * 100 : 0,
            ranking: 0, // Será calculado depois
            total_cidades: stats.totalCidades.size,
            qtd_cidades: stats.totalCidades.size,
            clientes_sem_venda_90d: stats.semVendas90d,
            oticas_sem_vendas_90d: stats.semVendas90d,
            soma_oportunidades: stats.somaOportunidades
          }))
          .filter(rota => rota.total_oticas > 0)
          .sort((a, b) => b.percentual_meta - a.percentual_meta)

        // Calcular ranking por vendedor
        const vendedorRankings = new Map<string, number>()
        rotasProcessadas.forEach(rota => {
          const count = vendedorRankings.get(rota.vendedor_uuid) || 0
          vendedorRankings.set(rota.vendedor_uuid, count + 1)
          rota.ranking = count + 1
        })

        setRotasData(rotasProcessadas)

        // Extrair lista de vendedores únicos
        const vendedoresUnicos = new Map<string, string>()
        rotasProcessadas.forEach(rota => {
          if (rota.vendedor_uuid && rota.vendedor_apelido) {
            vendedoresUnicos.set(rota.vendedor_uuid, rota.vendedor_apelido)
          }
        })

        const vendedoresList = Array.from(vendedoresUnicos.entries()).map(([uuid, nome]) => ({
          uuid,
          nome
        }))

        setVendedores(vendedoresList)

      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    carregarDados()
  }, [user])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRotasRef.current && !dropdownRotasRef.current.contains(event.target as Node)) {
        setDropdownRotasAberto(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const rotasFiltradas = useMemo(() => {
    if (vendedoresSelecionadosRotas.length === 0) return rotasData
    return rotasData.filter(rota => 
      vendedoresSelecionadosRotas.includes(rota.vendedor_uuid)
    )
  }, [rotasData, vendedoresSelecionadosRotas])

  const rotasOrdenadas = useMemo(() => {
    return [...rotasFiltradas].sort((a, b) => {
      const aValue = a[sortRotas.field]
      const bValue = b[sortRotas.field]

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortRotas.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortRotas.direction === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })
  }, [rotasFiltradas, sortRotas])

  const handleSortRotas = (field: RotaSortField) => {
    setSortRotas(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  const handleVendedorChangeRotas = (vendedorUuid: string) => {
    setVendedoresSelecionadosRotas(prev =>
      prev.includes(vendedorUuid)
        ? prev.filter(uuid => uuid !== vendedorUuid)
        : [...prev, vendedorUuid]
    )
  }

  const selecionarTodosRotas = () => {
    if (vendedoresSelecionadosRotas.length === vendedores.length) {
      setVendedoresSelecionadosRotas([])
    } else {
      setVendedoresSelecionadosRotas(vendedores.map(v => v.uuid))
    }
  }

  const getSortIcon = (field: RotaSortField, currentSort: { field: RotaSortField; direction: SortDirection }) => {
    if (currentSort.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }
    return currentSort.direction === 'asc'
      ? <ArrowUp className="h-4 w-4 text-primary" />
      : <ArrowDown className="h-4 w-4 text-primary" />
  }

  const getSortIconExpandidas = (field: keyof CidadeComMeta, currentSort: { field: keyof CidadeComMeta; direction: SortDirection }) => {
    if (currentSort.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }
    return currentSort.direction === 'asc'
      ? <ArrowUp className="h-4 w-4 text-primary" />
      : <ArrowDown className="h-4 w-4 text-primary" />
  }

  const carregarCidadesRota = async (rotaNome: string) => {
    if (cidadesComMeta.has(rotaNome)) return

    try {
      setLoadingCidades(true)
      const { data, error } = await supabase
        .from('vw_cidades_com_meta')
        .select('*')
        .eq('rota', rotaNome)
        .order('vendas_cidade', { ascending: false })

      if (error) throw error
      
      const novoMapa = new Map(cidadesComMeta)
      novoMapa.set(rotaNome, data || [])
      setCidadesComMeta(novoMapa)
    } catch (error) {
      console.error('Erro ao carregar cidades:', error)
    } finally {
      setLoadingCidades(false)
    }
  }

  const toggleRotaExpansao = (rotaNome: string) => {
    if (expandedRota === rotaNome) {
      setExpandedRota(null)
    } else {
      setExpandedRota(rotaNome)
      carregarCidadesRota(rotaNome)
    }
  }

  const handleSortCidadesExpandidas = (field: keyof CidadeComMeta) => {
    setSortCidadesExpandidas(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  const getCidadesOrdenadas = (cidades: CidadeComMeta[]): CidadeComMeta[] => {
    return [...cidades].sort((a, b) => {
      const aValue = a[sortCidadesExpandidas.field]
      const bValue = b[sortCidadesExpandidas.field]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortCidadesExpandidas.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return sortCidadesExpandidas.direction === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })
  }

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor)
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="w-full sm:max-w-7xl sm:mx-auto px-2 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
            Dashboard de Rotas
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Análise detalhada do desempenho por rotas e cidades
          </p>
        </div>

        {/* Top Rotas */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Ranking de Rotas</h3>
            
            {/* Filtro Vendedores */}
            <div className="relative" ref={dropdownRotasRef}>
              <button
                onClick={() => setDropdownRotasAberto(!dropdownRotasAberto)}
                className="flex items-center justify-between w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              >
                <span className="text-gray-700">
                  {vendedoresSelecionadosRotas.length === 0 
                    ? 'Todos os vendedores'
                    : vendedoresSelecionadosRotas.length === vendedores.length
                    ? 'Todos selecionados'
                    : `${vendedoresSelecionadosRotas.length} selecionados`
                  }
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              
              {dropdownRotasAberto && (
                <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <button
                      onClick={selecionarTodosRotas}
                      className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded"
                    >
                      {vendedoresSelecionadosRotas.length === vendedores.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                    <div className="border-t border-gray-200 my-2"></div>
                    {vendedores.map(vendedor => (
                      <label key={vendedor.uuid} className="flex items-center px-3 py-2 text-sm hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vendedoresSelecionadosRotas.includes(vendedor.uuid)}
                          onChange={() => handleVendedorChangeRotas(vendedor.uuid)}
                          className="mr-2 text-primary focus:ring-primary"
                        />
                        {vendedor.nome}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    <button
                      onClick={() => handleSortRotas('rota')}
                      className="flex items-center space-x-1 hover:text-gray-900"
                    >
                      <span>Rota</span>
                      {getSortIcon('rota', sortRotas)}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Vendedor</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    <button
                      onClick={() => handleSortRotas('meta_2025')}
                      className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                    >
                      <span>Meta</span>
                      {getSortIcon('meta_2025', sortRotas)}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    <button
                      onClick={() => handleSortRotas('vendido_2025')}
                      className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                    >
                      <span>Vendas</span>
                      {getSortIcon('vendido_2025', sortRotas)}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    <button
                      onClick={() => handleSortRotas('percentual_meta')}
                      className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                    >
                      <span>Atingimento</span>
                      {getSortIcon('percentual_meta', sortRotas)}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rotasOrdenadas.map((rota) => (
                  <React.Fragment key={`${rota.vendedor_uuid}-${rota.rota}`}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => toggleRotaExpansao(rota.rota)}>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        <div className="flex items-center space-x-2">
                          <span>{expandedRota === rota.rota ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                          <span>{rota.rota}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{rota.vendedor_apelido}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{formatarMoeda(rota.meta_2025)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatarMoeda(rota.vendido_2025)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold ${
                          rota.percentual_meta >= 100 ? 'text-green-600' :
                          rota.percentual_meta >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {rota.percentual_meta.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                    {expandedRota === rota.rota && (
                      <tr className="border-b border-gray-200">
                        <td colSpan={5} className="p-0">
                          <div className="bg-gray-50 p-4">
                            {loadingCidades ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                <span className="ml-2 text-sm text-gray-600">Carregando cidades...</span>
                              </div>
                            ) : (cidadesComMeta.get(rota.rota) || []).length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-200">
                                      <th className="text-left px-3 py-2 font-semibold text-gray-700">Cidade</th>
                                      <th className="text-right px-3 py-2 font-semibold text-gray-700">
                                        <button
                                          onClick={() => handleSortCidadesExpandidas('meta_cidade')}
                                          className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                                        >
                                          <span>Meta</span>
                                          {getSortIconExpandidas('meta_cidade', sortCidadesExpandidas)}
                                        </button>
                                      </th>
                                      <th className="text-right px-3 py-2 font-semibold text-gray-700">
                                        <button
                                          onClick={() => handleSortCidadesExpandidas('vendas_cidade')}
                                          className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                                        >
                                          <span>Vendas</span>
                                          {getSortIconExpandidas('vendas_cidade', sortCidadesExpandidas)}
                                        </button>
                                      </th>
                                      <th className="text-right px-3 py-2 font-semibold text-gray-700">
                                        <button
                                          onClick={() => handleSortCidadesExpandidas('percentual_atingimento')}
                                          className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                                        >
                                          <span>Atingimento</span>
                                          {getSortIconExpandidas('percentual_atingimento', sortCidadesExpandidas)}
                                        </button>
                                      </th>
                                      <th className="text-right px-3 py-2 font-semibold text-gray-700">
                                        <button
                                          onClick={() => handleSortCidadesExpandidas('qtd_clientes')}
                                          className="flex items-center justify-end space-x-1 hover:text-gray-900 w-full"
                                        >
                                          <span>Clientes</span>
                                          {getSortIconExpandidas('qtd_clientes', sortCidadesExpandidas)}
                                        </button>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {getCidadesOrdenadas(cidadesComMeta.get(rota.rota) || []).map((cidade) => (
                                      <tr key={cidade.codigo_ibge_cidade} className="border-b border-gray-200 hover:bg-white">
                                        <td className="px-3 py-2 text-gray-900 font-medium">{cidade.cidade}</td>
                                        <td className="text-right px-3 py-2 text-gray-700">{formatarMoeda(cidade.meta_cidade)}</td>
                                        <td className="text-right px-3 py-2 font-semibold text-gray-900">{formatarMoeda(cidade.vendas_cidade)}</td>
                                        <td className="text-right px-3 py-2">
                                          <span className={`font-bold ${
                                            cidade.percentual_atingimento >= 100 ? 'text-green-600' :
                                            cidade.percentual_atingimento >= 80 ? 'text-yellow-600' :
                                            'text-red-600'
                                          }`}>
                                            {cidade.percentual_atingimento.toFixed(1)}%
                                          </span>
                                        </td>
                                        <td className="text-right px-3 py-2 text-gray-700">{cidade.qtd_clientes}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-center text-gray-600 text-sm">Nenhuma cidade encontrada</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seção Top Cidades removida - view não existe mais no backend */}
      </main>
    </div>
  )
}

export default DashboardRotas