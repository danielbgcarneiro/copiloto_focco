import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
// Recharts removido - usando matriz customizada ao invés de scatter plot
import { Filter, TrendingUp, TrendingDown, AlertTriangle, Users, RefreshCw } from 'lucide-react'

interface ClienteRFM {
  codigo_cliente: number
  nome_fantasia?: string // Nome do cliente da tabela clientes
  score_r: number
  score_f: number
  score_m: number
  fm_score: number
  classificacao_final: string
  perfil: string
  valor_total?: number
  total_vendas?: number
  valor?: number
  vendas_total?: number
  valor_ano_atual?: number
  meta_ano_atual?: number
  previsao_pedido?: number
  tendencia: string
  alerta_risco: boolean
  data_analise?: string
  tabela_clientes?: { nome_fantasia: string } // Para o JOIN do Supabase
  [key: string]: any // Permitir campos adicionais
}

// Mapeamento de cores por segmento
const CORES_SEGMENTOS: Record<string, string> = {
  'Campeões': '#FFD700',
  'Clientes Fiéis': '#C0C0C0',
  'Potencial Fidelizador': '#CD7F32',
  'Clientes Recentes': '#87CEEB',
  'Promissores': '#90EE90',
  'Clientes que Precisam de Atenção': '#FFA500',
  'Prestes a Dormir': '#FF6347',
  'Em Risco': '#DC143C',
  'Não Podemos Perdê-los': '#8B0000',
  'Hibernando': '#808080',
  'Perdidos': '#000000'
}

const TODOS_SEGMENTOS = Object.keys(CORES_SEGMENTOS)

const PagAnalytics: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [clientes, setClientes] = useState<ClienteRFM[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [totalRegistros, setTotalRegistros] = useState(0)

  // Filtros
  const [filtroPerfil, setFiltroPerfil] = useState<string>('')
  const [filtroTendencia, setFiltroTendencia] = useState<string>('')
  const [filtroAlerta, setFiltroAlerta] = useState<string>('')
  const [filtroNome, setFiltroNome] = useState<string>('')

  // Cache - 30 minutos para evitar consultas excessivas
  const CACHE_DURATION = 30 * 60 * 1000 // 30 minutos
  const CACHE_KEY = 'rfm_analytics_cache'
  const CACHE_TIMESTAMP_KEY = 'rfm_analytics_timestamp'

  // Carregar do cache do localStorage
  const carregarDoCache = () => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY)
      const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)

      if (cachedData && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10)
        const now = new Date().getTime()

        // Verificar se o cache ainda é válido
        if (now - timestamp < CACHE_DURATION) {
          const data = JSON.parse(cachedData)
          console.log(`📦 Carregado ${data.length} registros do cache localStorage`)
          console.log(`⏰ Cache válido por mais ${Math.round((CACHE_DURATION - (now - timestamp)) / 1000 / 60)} minutos`)
          setClientes(data)
          setLastUpdate(new Date(timestamp))
          setTotalRegistros(data.length)
          return true
        } else {
          console.log('⏰ Cache expirado, recarregando...')
        }
      }
      return false
    } catch (error) {
      console.error('Erro ao carregar cache:', error)
      return false
    }
  }

  // Salvar no cache do localStorage
  const salvarNoCache = (data: ClienteRFM[]) => {
    try {
      const timestamp = new Date().getTime()
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
      localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString())
      console.log(`💾 ${data.length} registros salvos no cache localStorage`)
    } catch (error) {
      console.error('Erro ao salvar cache:', error)
    }
  }

  // Buscar dados do Supabase com paginação
  const carregarDados = async (forceRefresh = false) => {
    try {
      // Se não for refresh forçado, tentar carregar do cache
      if (!forceRefresh) {
        const cacheLoaded = carregarDoCache()
        if (cacheLoaded) {
          setLoading(false)
          setRefreshing(false)
          return
        }
      }

      setRefreshing(true)
      setLoadingProgress(0)

      console.log('🔄 Iniciando carregamento de dados RFM...')

      // Primeiro, buscar um registro para verificar a estrutura
      const { data: sampleData, error: sampleError } = await supabase
        .from('analise_rfm')
        .select(`
          *,
          tabela_clientes!codigo_cliente(nome_fantasia)
        `, { count: 'exact' })
        .limit(1)

      if (sampleError) {
        console.error('Erro ao buscar estrutura da tabela:', sampleError)
        console.error('Detalhes do erro:', sampleError.message)
        // Se o JOIN falhar, tentar sem JOIN
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('analise_rfm')
          .select('*', { count: 'exact' })
          .limit(1)

        if (fallbackError) {
          console.error('Erro mesmo sem JOIN:', fallbackError)
          setRefreshing(false)
          setLoading(false)
          return
        }

        if (fallbackData && fallbackData.length > 0) {
          console.log('⚠️ JOIN com tabela_clientes falhou, continuando sem nome_fantasia')
          console.log('📋 Estrutura da tabela analise_rfm:', Object.keys(fallbackData[0]))
          console.log('📋 Primeiro registro:', fallbackData[0])
        }
      } else {
        // Log da estrutura para debug
        if (sampleData && sampleData.length > 0) {
          console.log('📋 Estrutura da tabela analise_rfm (com JOIN):', Object.keys(sampleData[0]))
          console.log('📋 Primeiro registro:', sampleData[0])
        }
      }

      // Buscar contagem total para paginação
      const { count, error: countError } = await supabase
        .from('analise_rfm')
        .select('*', { count: 'exact', head: true })

      if (countError) {
        console.error('Erro ao contar registros:', countError)
      }

      const totalCount = count || 0
      setTotalRegistros(totalCount)
      console.log(`📊 Total de registros: ${totalCount}`)

      // Buscar dados em lotes de 1000
      const BATCH_SIZE = 1000
      const totalBatches = Math.ceil(totalCount / BATCH_SIZE)
      let allData: ClienteRFM[] = []

      for (let i = 0; i < totalBatches; i++) {
        const from = i * BATCH_SIZE
        const to = from + BATCH_SIZE - 1

        console.log(`📥 Carregando lote ${i + 1}/${totalBatches} (${from}-${to})`)

        // Tentar com JOIN primeiro
        let { data, error } = await supabase
          .from('analise_rfm')
          .select(`
            *,
            tabela_clientes!codigo_cliente(nome_fantasia)
          `)
          .range(from, to)

        // Se JOIN falhar, tentar sem
        if (error) {
          console.warn(`⚠️ JOIN falhou no lote ${i + 1}, tentando sem nome_fantasia:`, error.message)
          const fallback = await supabase
            .from('analise_rfm')
            .select('*')
            .range(from, to)

          data = fallback.data
          error = fallback.error
        }

        if (error) {
          console.error(`Erro ao buscar lote ${i + 1}:`, error)
          continue
        }

        if (data) {
          // Processar dados para extrair nome_fantasia do objeto tabela_clientes se necessário
          const processedData = data.map((item: any) => {
            if (item.tabela_clientes && item.tabela_clientes.nome_fantasia) {
              return {
                ...item,
                nome_fantasia: item.tabela_clientes.nome_fantasia
              }
            }
            return item
          })

          allData = [...allData, ...processedData]
          const progress = ((i + 1) / totalBatches) * 100
          setLoadingProgress(progress)
          console.log(`📈 Progresso: ${progress.toFixed(0)}% (${allData.length}/${totalCount})`)
        }
      }

      console.log(`✅ Total carregado: ${allData.length} registros`)

      // Ordenar no cliente se tivermos dados
      if (allData.length > 0) {
        const firstRecord = allData[0]
        const possibleValueFields = ['valor_total', 'total_vendas', 'valor', 'vendas_total']
        const valueField = possibleValueFields.find(field => field in firstRecord)

        if (valueField) {
          allData.sort((a, b) => (b[valueField] || 0) - (a[valueField] || 0))
          console.log(`📊 Dados ordenados por: ${valueField}`)
        }
      }

      // Salvar no cache
      salvarNoCache(allData)

      setClientes(allData)
      setLastUpdate(new Date())
      setLoadingProgress(100)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  // Carregar dados inicialmente
  useEffect(() => {
    if (user) {
      carregarDados()
    }
  }, [user])

  // Auto-refresh apenas quando o cache expirar (30 minutos)
  // Não fazemos refresh automático, só quando o usuário clicar manualmente
  // Isso evita consultas excessivas ao Supabase

  // Verificar permissões
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

  // Aplicar filtros
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(cliente => {
      if (filtroPerfil && cliente.perfil !== filtroPerfil) return false
      if (filtroTendencia && cliente.tendencia !== filtroTendencia) return false
      if (filtroAlerta === 'Sim' && !cliente.alerta_risco) return false
      if (filtroAlerta === 'Não' && cliente.alerta_risco) return false
      if (filtroNome) {
        const nome = cliente.nome_fantasia?.toLowerCase() || ''
        const codigo = cliente.codigo_cliente.toString()
        const busca = filtroNome.toLowerCase()
        if (!nome.includes(busca) && !codigo.includes(busca)) return false
      }
      return true
    })
  }, [clientes, filtroPerfil, filtroTendencia, filtroAlerta, filtroNome])

  // Estatísticas
  const estatisticas = useMemo(() => {
    const total = clientesFiltrados.length

    // Distribuição por segmento
    const porSegmento = clientesFiltrados.reduce((acc, cliente) => {
      acc[cliente.classificacao_final] = (acc[cliente.classificacao_final] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Distribuição por perfil
    const porPerfil = clientesFiltrados.reduce((acc, cliente) => {
      acc[cliente.perfil] = (acc[cliente.perfil] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Clientes em alerta
    const emAlerta = clientesFiltrados.filter(c => c.alerta_risco).length
    const percentualAlerta = total > 0 ? (emAlerta / total) * 100 : 0

    // Distribuição por tendência
    const porTendencia = clientesFiltrados.reduce((acc, cliente) => {
      acc[cliente.tendencia] = (acc[cliente.tendencia] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      porSegmento,
      porPerfil,
      emAlerta,
      percentualAlerta,
      porTendencia
    }
  }, [clientesFiltrados])

  // Preparar dados para a matriz RFM
  const matrizRFM = useMemo(() => {
    // Criar matriz 5x5 (Score R: 1-5, FM Score: 1-5)
    const matriz: Record<string, {
      scoreR: number
      scoreFM: number
      clientes: ClienteRFM[]
      count: number
      segmentos: Record<string, number>
      segmentoPredominante: string
      cor: string
    }> = {}

    // Inicializar todas as células
    for (let r = 1; r <= 5; r++) {
      for (let fm = 1; fm <= 5; fm++) {
        const key = `${r}-${fm}`
        matriz[key] = {
          scoreR: r,
          scoreFM: fm,
          clientes: [],
          count: 0,
          segmentos: {},
          segmentoPredominante: '',
          cor: '#f3f4f6' // Cinza claro padrão
        }
      }
    }

    // Agrupar clientes na matriz
    clientesFiltrados.forEach(cliente => {
      const scoreR = Math.round(cliente.score_r)
      const scoreFM = Math.round(cliente.fm_score)

      // Validar scores
      if (scoreR >= 1 && scoreR <= 5 && scoreFM >= 1 && scoreFM <= 5) {
        const key = `${scoreR}-${scoreFM}`

        matriz[key].clientes.push(cliente)
        matriz[key].count++

        // Contar segmentos
        const segmento = cliente.classificacao_final
        matriz[key].segmentos[segmento] = (matriz[key].segmentos[segmento] || 0) + 1
      }
    })

    // Determinar segmento predominante e cor de cada célula
    Object.keys(matriz).forEach(key => {
      const celula = matriz[key]

      if (celula.count > 0) {
        // Encontrar segmento com mais clientes
        let maxCount = 0
        let segmentoPredominante = ''

        Object.entries(celula.segmentos).forEach(([segmento, count]) => {
          if (count > maxCount) {
            maxCount = count
            segmentoPredominante = segmento
          }
        })

        celula.segmentoPredominante = segmentoPredominante
        celula.cor = CORES_SEGMENTOS[segmentoPredominante] || '#999999'
      }
    })

    return matriz
  }, [clientesFiltrados])

  // Tooltip removido - usando hover nativo na matriz ao invés de Recharts

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium mb-2">Carregando análise RFM...</p>
          {totalRegistros > 0 && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {totalRegistros.toLocaleString()} registros total
              </p>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className="bg-primary h-3 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {loadingProgress.toFixed(0)}% concluído
              </p>
            </>
          )}
          {loadingProgress === 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Verificando cache...
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full sm:max-w-7xl sm:mx-auto px-2 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                Análise RFM
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Segmentação de clientes por Recência, Frequência e Valor Monetário
              </p>
            </div>
            <button
              onClick={() => carregarDados(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              title="Atualizar dados do Supabase"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {lastUpdate && (
              <>
                <p className="text-xs text-gray-500">
                  📅 Última atualização: {lastUpdate.toLocaleString('pt-BR')}
                </p>               
              </>
            )}
            {refreshing && loadingProgress > 0 && (
              <div className="mt-2">
                <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Carregando: {loadingProgress.toFixed(0)}%
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Filtros</h3>
            {(filtroPerfil || filtroTendencia || filtroAlerta || filtroNome) && (
              <button
                onClick={() => {
                  setFiltroPerfil('')
                  setFiltroTendencia('')
                  setFiltroAlerta('')
                  setFiltroNome('')
                }}
                className="ml-auto text-xs text-primary hover:text-primary/80 underline"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Busca por Nome/Código */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Cliente (Nome ou Código)
            </label>
            <input
              type="text"
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
              placeholder="Digite o nome ou código do cliente..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {filtroNome && (
              <p className="text-xs text-gray-500 mt-1">
                {clientesFiltrados.length} cliente(s) encontrado(s)
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Filtro Perfil */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Perfil</label>
              <select
                value={filtroPerfil}
                onChange={(e) => setFiltroPerfil(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Todos</option>
                <option value="Ouro">Ouro</option>
                <option value="Prata">Prata</option>
                <option value="Bronze">Bronze</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>

            {/* Filtro Tendência */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tendência</label>
              <select
                value={filtroTendencia}
                onChange={(e) => setFiltroTendencia(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Todas</option>
                <option value="CRESCIMENTO">Crescimento</option>
                <option value="ESTÁVEL">Estável</option>
                <option value="QUEDA">Queda</option>
              </select>
            </div>

            {/* Filtro Alerta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alerta de Risco</label>
              <select
                value={filtroAlerta}
                onChange={(e) => setFiltroAlerta(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Todos</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-blue-500" />
              <p className="text-xs text-gray-600">Total Clientes</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{estatisticas.total}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <p className="text-xs text-gray-600">Crescimento</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{estatisticas.porTendencia['CRESCIMENTO'] || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <p className="text-xs text-gray-600">Em Queda</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{estatisticas.porTendencia['QUEDA'] || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <p className="text-xs text-gray-600">Em Alerta</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{estatisticas.emAlerta}</p>
            <p className="text-xs text-gray-500">{estatisticas.percentualAlerta.toFixed(1)}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Matriz RFM 2D */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              Matriz RFM - Segmentação de Clientes
            </h3>

            {/* Matriz 5x5 */}
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Labels do eixo Y (FM Score) - à esquerda */}
                <div className="flex items-start">
                  {/* Espaço para label Y */}
                  <div className="flex flex-col justify-center items-center mr-2" style={{ width: '80px', height: '500px' }}>
                    <div className="transform -rotate-90 whitespace-nowrap text-sm font-semibold text-gray-700">
                      Frequência + Monetário (FM)
                    </div>
                  </div>

                  {/* Grid da matriz */}
                  <div className="flex-1">
                    {/* Header com scores FM (5 a 1, de cima para baixo) */}
                    <div className="mb-2 flex">
                      <div className="w-12"></div>
                      {[1, 2, 3, 4, 5].map(r => (
                        <div key={r} className="flex-1 text-center text-xs font-semibold text-gray-600">
                          {r}
                        </div>
                      ))}
                    </div>

                    {/* Linhas da matriz (FM de 5 a 1) */}
                    {[5, 4, 3, 2, 1].map(fm => (
                      <div key={fm} className="flex mb-1">
                        {/* Label FM à esquerda */}
                        <div className="w-12 flex items-center justify-center text-xs font-semibold text-gray-600">
                          {fm}
                        </div>

                        {/* Células da linha */}
                        {[1, 2, 3, 4, 5].map(r => {
                          const celula = matrizRFM[`${r}-${fm}`]
                          const hasClientes = celula.count > 0

                          return (
                            <div
                              key={`${r}-${fm}`}
                              className="flex-1 aspect-square border border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity relative group"
                              style={{
                                backgroundColor: celula.cor,
                                minHeight: '90px'
                              }}
                              title={hasClientes ? `${celula.segmentoPredominante}\n${celula.count} clientes\nR${r} / FM${fm}` : `Sem clientes\nR${r} / FM${fm}`}
                            >
                              {hasClientes && (
                                <>
                                  {/* Número de clientes */}
                                  <div className="text-2xl font-bold text-white drop-shadow-lg">
                                    {celula.count}
                                  </div>
                                  {/* Nome do segmento (abreviado se necessário) */}
                                  <div className="text-xs text-white font-semibold text-center px-1 drop-shadow-md mt-1">
                                    {celula.segmentoPredominante.length > 15
                                      ? celula.segmentoPredominante.substring(0, 12) + '...'
                                      : celula.segmentoPredominante
                                    }
                                  </div>
                                </>
                              )}

                              {/* Tooltip detalhado no hover */}
                              {hasClientes && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                                  <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg whitespace-nowrap">
                                    <p className="font-bold">{celula.segmentoPredominante}</p>
                                    <p className="mt-1">{celula.count} clientes</p>
                                    <p className="text-gray-300">R: {r} | FM: {fm}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}

                    {/* Label do eixo X (Recência) - embaixo */}
                    <div className="mt-2 text-center text-sm font-semibold text-gray-700">
                      Recência (Score R)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legenda e Estatísticas */}
          <div className="space-y-4">
            {/* Legenda de Cores - Minimalista */}
            <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
              <h3 className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Legenda</h3>
              <div className="space-y-1.5">
                {TODOS_SEGMENTOS.map(segmento => {
                  const count = estatisticas.porSegmento[segmento] || 0

                  // Mostrar apenas segmentos com clientes
                  if (count === 0) return null

                  return (
                    <div key={segmento} className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: CORES_SEGMENTOS[segmento] }}
                      />
                      <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
                        <p className="text-xs text-gray-700 truncate" title={segmento}>
                          {segmento}
                        </p>
                        <p className="text-xs text-gray-400 tabular-nums">
                          {count}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Distribuição por Perfil - Minimalista */}
            <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
              <h3 className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Perfil</h3>
              <div className="space-y-1.5">
                {['Ouro', 'Prata', 'Bronze', 'Inativo'].map(perfil => {
                  const count = estatisticas.porPerfil[perfil] || 0

                  // Mostrar apenas perfis com clientes
                  if (count === 0) return null

                  const colors = {
                    'Ouro': '#eab308',
                    'Prata': '#9ca3af',
                    'Bronze': '#ea580c',
                    'Inativo': '#d1d5db'
                  }

                  return (
                    <div key={perfil} className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: colors[perfil as keyof typeof colors] }}
                      />
                      <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
                        <p className="text-xs text-gray-700">
                          {perfil}
                        </p>
                        <p className="text-xs text-gray-400 tabular-nums">
                          {count}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PagAnalytics
