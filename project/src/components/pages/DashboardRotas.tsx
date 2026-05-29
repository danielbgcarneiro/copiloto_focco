/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown, Clock, TriangleAlert, SlidersHorizontal, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card, LoadingSpinner } from '../atoms'
import { formatCurrency } from '../../utils'

interface RotaData {
  rota: string
  nome_rota: string
  vendedor_apelido: string
  vendedor_uuid: string
  cod_vendedor: number
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

interface ClienteRotaData {
  codigo_cliente: number
  nome_fantasia: string
  oportunidade: number
  meta: number
  vendas: number
  percentual: number
  dias_sem_venda: number
  dias_atraso: number
  perfil: string | null
  situacao: string
  qtd_boletos: number
}

type FiltroBoletos = 'todos' | 0 | 1 | 2 | 3 | 4 | 5 | 6
type FiltroSituacao = 'todos' | 'adimplente' | 'inadimplente'

interface ClienteResumo {
  situacao: string
  dias_sem_comprar: number
  previsao_pedido: number
  meta_ano_atual: number
  valor_ano_atual: number
  qtd_boletos: number
}

interface ClienteSemRota {
  codigo_cliente: number
  nome_fantasia: string
  cidade: string
  estado: string
  situacao: string
  cod_vendedor: number
  vendedor_apelido: string
}

interface CoberturaRotaData {
  vendedor_id: string
  vendedor_apelido: string
  cod_vendedor: number
  rota: string
  qtd_cidades: number
  qtd_clientes: number
  meta_total: number
  vendas_total: number
  percentual_atingimento: number
  clientes_visitados_180d: number
  percentual_cobertura_180d: number
}

// Interface CidadeData removida - Top Cidades não existe mais

interface CidadeComMeta {
  cidade: string
  codigo_ibge_cidade: string
  rota: string
  vendedor_apelido: string
  vendedor_uuid?: string
  meta_cidade: number
  vendas_cidade: number
  qtd_clientes: number
  percentual_atingimento: number
  saldo_meta: number
  soma_oportunidades?: number
}

interface VendedorInfo {
  uuid: string
  nome: string
}

type RotaSortField = 'rota' | 'soma_oportunidades' | 'meta_2025' | 'vendido_2025' | 'percentual_meta'
type SortDirection = 'asc' | 'desc'

const DashboardRotas: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rotasData, setRotasData] = useState<RotaData[]>([])
  const [vendedores, setVendedores] = useState<VendedorInfo[]>([])

  const [vendedoresSelecionadosRotas, setVendedoresSelecionadosRotas] = useState<string[]>([])
  const [dropdownRotasAberto, setDropdownRotasAberto] = useState(false)
  const [filtrosPainelAberto, setFiltrosPainelAberto] = useState(false)
  const [filtroDiasSemVenda, setFiltroDiasSemVenda] = useState<number | ''>('')
  const [filtroBoletosAberto, setFiltroBoletosAberto] = useState<FiltroBoletos>('todos')
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacao>('todos')

  const dropdownRotasRef = useRef<HTMLDivElement>(null)

  const [expandedRota, setExpandedRota] = useState<string | null>(null)
  const [cidadesComMeta, setCidadesComMeta] = useState<Map<string, CidadeComMeta[]>>(new Map())
  const [loadingCidades, setLoadingCidades] = useState(false)
  const [sortCidadesExpandidas, setSortCidadesExpandidas] = useState<{ field: keyof CidadeComMeta; direction: SortDirection }>({ field: 'vendas_cidade', direction: 'desc' })

  const [expandedCidade, setExpandedCidade] = useState<string | null>(null)
  const [clientesPorCidade, setClientesPorCidade] = useState<Map<string, ClienteRotaData[]>>(new Map())
  const [loadingClientesCidade, setLoadingClientesCidade] = useState(false)

  const [clientesSemRota, setClientesSemRota] = useState<ClienteSemRota[]>([])
  const [loadingClientesSemRota, setLoadingClientesSemRota] = useState(false)
  const [semRotaExpanded, setSemRotaExpanded] = useState(false)
  const [semRotaCarregado, setSemRotaCarregado] = useState(false)

  const [coberturaData, setCoberturaData] = useState<CoberturaRotaData[]>([])
  const [loadingCobertura, setLoadingCobertura] = useState(false)
  const [coberturaExpanded, setCoberturaExpanded] = useState(false)
  const [coberturaCarregada, setCoberturaCarregada] = useState(false)

  const [sortRotas, setSortRotas] = useState<{ field: RotaSortField; direction: SortDirection }>({ field: 'vendido_2025', direction: 'desc' })
  const [clientesPorRota, setClientesPorRota] = useState<Map<string, ClienteResumo[]>>(new Map())

  useEffect(() => {
    const carregarDados = async () => {
      if (!user) return

      try {
        setLoading(true)

        // 1. Buscar rotas ativas e dados agregados das cidades em paralelo
        const [
          { data: rotasVendedor, error: rotasError },
          { data: cidadesComMeta, error: cidadesError }
        ] = await Promise.all([
          supabase
            .from('vendedor_rotas')
            .select(`
              rota,
              vendedor_id,
              profiles!vendedor_rotas_vendedor_id_fkey (
                id,
                apelido,
                cod_vendedor
              )
            `)
            .eq('ativo', true)
            .neq('rota', 'Sem Rota'),
          supabase
            .from('vw_cidades_com_meta')
            .select('*')
        ])

        if (rotasError || cidadesError) {
          console.error('Erro ao buscar dados:', rotasError || cidadesError)
          return
        }

        if (!rotasVendedor?.length) {
          setRotasData([])
          setVendedores([])
          return
        }

        // 2. Criar mapa de vendedores únicos
        const vendedoresUnicos = new Map<string, { apelido: string; cod_vendedor: number }>()
        rotasVendedor.forEach(rv => {
          const profile = Array.isArray(rv.profiles) ? rv.profiles[0] : rv.profiles
          if (profile) {
            vendedoresUnicos.set(profile.id, {
              apelido: profile.apelido || 'Sem nome',
              cod_vendedor: profile.cod_vendedor
            })
          }
        })

        // Mapa vendedor_uuid -> cod_vendedor para uso no drill-down de clientes
        const vendedorCodMap = new Map<string, number>()
        vendedoresUnicos.forEach((data, uuid) => vendedorCodMap.set(uuid, data.cod_vendedor))

        // 3. Inicializar mapa de rotas com todas as rotas configuradas
        const rotasStatsMap = new Map<string, {
          rota: string
          vendedor_uuid: string
          cod_vendedor: number
          vendedor_apelido: string
          cidades: Set<string>
          oticas: number
          meta: number
          vendas: number
          semVendas90d: number
          oportunidades: number
        }>()

        rotasVendedor.forEach(rv => {
          const profile = Array.isArray(rv.profiles) ? rv.profiles[0] : rv.profiles
          if (profile) {
            const key = `${rv.vendedor_id}-${rv.rota}`
            rotasStatsMap.set(key, {
              rota: rv.rota,
              vendedor_uuid: rv.vendedor_id,
              cod_vendedor: profile.cod_vendedor || 0,
              vendedor_apelido: profile.apelido || 'Sem nome',
              cidades: new Set(),
              oticas: 0,
              meta: 0,
              vendas: 0,
              semVendas90d: 0,
              oportunidades: 0
            })
          }
        })

        // 4. Agregar dados das cidades na rota correspondente
        cidadesComMeta?.forEach(cidade => {
          if (!cidade.rota || !cidade.vendedor_uuid) return

          const key = `${cidade.vendedor_uuid}-${cidade.rota}`
          const stats = rotasStatsMap.get(key)

          if (stats) {
            stats.cidades.add(cidade.cidade)
            stats.oticas += cidade.qtd_clientes || 0
            stats.meta += cidade.meta_cidade || 0
            stats.vendas += cidade.vendas_cidade || 0
            stats.oportunidades += cidade.soma_oportunidades || 0
            // semVendas90d seria calculado pela view se necessário
          }
        })

        // 5. Converter para formato final
        const rotasProcessadas: RotaData[] = Array.from(rotasStatsMap.values())
          .map(stats => ({
            rota: stats.rota,
            nome_rota: stats.rota,
            vendedor_apelido: stats.vendedor_apelido,
            vendedor_uuid: stats.vendedor_uuid,
            cod_vendedor: stats.cod_vendedor,
            qtd_oticas: stats.oticas,
            total_oticas: stats.oticas,
            vendido_2025: stats.vendas,
            meta_2025: stats.meta,
            percentual_meta: stats.meta > 0 ? (stats.vendas / stats.meta) * 100 : 0,
            ranking: 0,
            total_cidades: stats.cidades.size,
            qtd_cidades: stats.cidades.size,
            clientes_sem_venda_90d: stats.semVendas90d,
            oticas_sem_vendas_90d: stats.semVendas90d,
            soma_oportunidades: stats.oportunidades
          }))
          .sort((a, b) => b.percentual_meta - a.percentual_meta)

        // 6. Calcular ranking
        const rankings = new Map<string, number>()
        rotasProcessadas.forEach(rota => {
          const rank = (rankings.get(rota.vendedor_uuid) || 0) + 1
          rankings.set(rota.vendedor_uuid, rank)
          rota.ranking = rank
        })

        setRotasData(rotasProcessadas)

        // 7. Lista de vendedores para o filtro
        const vendedoresList = Array.from(vendedoresUnicos.entries()).map(([uuid, data]) => ({
          uuid,
          nome: data.apelido
        }))

        setVendedores(vendedoresList)

        // 8. Carregar resumo de clientes por rota para filtros dinâmicos
        // Mapa ibge_cidade -> { rota, vendedorUuid } a partir de vw_cidades_com_meta
        const ibgeRotaMap = new Map<string, { rota: string; vendedorUuid: string }>()
        cidadesComMeta?.forEach(cidade => {
          if (cidade.codigo_ibge_cidade && cidade.rota && cidade.vendedor_uuid) {
            ibgeRotaMap.set(cidade.codigo_ibge_cidade, { rota: cidade.rota, vendedorUuid: cidade.vendedor_uuid })
          }
        })

        const todosCodsVendedor = Array.from(vendedoresUnicos.values()).map(v => v.cod_vendedor)
        const { data: clientesResumoData } = await supabase
          .from('tabela_clientes')
          .select(`codigo_cliente, cod_vendedor, situacao, codigo_ibge_cidade, analise_rfm (dias_sem_comprar, previsao_pedido, meta_ano_atual, valor_ano_atual)`)
          .not('situacao', 'in', '("I","B")')
          .in('cod_vendedor', todosCodsVendedor)
          .limit(5000)

        if (clientesResumoData && clientesResumoData.length > 0) {
          const codigosAll = clientesResumoData.map((c: any) => c.codigo_cliente)
          const boletosRotaMap = new Map<number, number>()
          try {
            const { data: boletoData } = await supabase
              .from('vw_titulos_vencidos_detalhado')
              .select('codigo_cliente')
              .in('codigo_cliente', codigosAll)
              .gt('dias_atraso', 0)
            boletoData?.forEach((r: any) => {
              boletosRotaMap.set(r.codigo_cliente, (boletosRotaMap.get(r.codigo_cliente) || 0) + 1)
            })
          } catch { /* boletos opcionais */ }

          const mapa = new Map<string, ClienteResumo[]>()
          clientesResumoData.forEach((c: any) => {
            const ibge = c.codigo_ibge_cidade
            if (!ibge) return
            const rotaInfo = ibgeRotaMap.get(ibge)
            if (!rotaInfo) return
            const key = `${rotaInfo.vendedorUuid}-${rotaInfo.rota}`
            const rfm = Array.isArray(c.analise_rfm) ? c.analise_rfm[0] : c.analise_rfm
            if (!mapa.has(key)) mapa.set(key, [])
            mapa.get(key)!.push({
              situacao: c.situacao || 'A',
              dias_sem_comprar: rfm?.dias_sem_comprar || 0,
              previsao_pedido: rfm?.previsao_pedido || 0,
              meta_ano_atual: rfm?.meta_ano_atual || 0,
              valor_ano_atual: rfm?.valor_ano_atual || 0,
              qtd_boletos: boletosRotaMap.get(c.codigo_cliente) || 0,
            })
          })
          setClientesPorRota(mapa)
        }

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
    // 1. Filtro por vendedor
    const porVendedor = vendedoresSelecionadosRotas.length === 0
      ? rotasData
      : rotasData.filter(r => vendedoresSelecionadosRotas.includes(r.vendedor_uuid))

    // 2. Se não há filtros de cliente, retorna como está
    const temFiltroCliente = filtroDiasSemVenda !== '' || filtroBoletosAberto !== 'todos' || filtroSituacao !== 'todos'
    if (!temFiltroCliente || clientesPorRota.size === 0) return porVendedor

    // 3. Re-agregar métricas por rota com base nos clientes filtrados
    const resultado: RotaData[] = []
    for (const rota of porVendedor) {
      const key = `${rota.vendedor_uuid}-${rota.rota}`
      const clientes = clientesPorRota.get(key) || []
      const filtrados = clientes.filter(c => {
        if (filtroDiasSemVenda !== '' && c.dias_sem_comprar < (filtroDiasSemVenda as number)) return false
        if (filtroBoletosAberto !== 'todos') {
          const min = filtroBoletosAberto as number
          if (min === 6 ? c.qtd_boletos < 6 : c.qtd_boletos > min) return false
        }
        if (filtroSituacao === 'inadimplente' && c.situacao !== 'P') return false
        if (filtroSituacao === 'adimplente' && c.situacao === 'P') return false
        return true
      })
      if (filtrados.length === 0) continue
      const meta = filtrados.reduce((s, c) => s + c.meta_ano_atual, 0)
      const vendas = filtrados.reduce((s, c) => s + c.valor_ano_atual, 0)
      const oportunidades = filtrados.reduce((s, c) => s + c.previsao_pedido, 0)
      resultado.push({
        ...rota,
        qtd_oticas: filtrados.length,
        total_oticas: filtrados.length,
        meta_2025: meta,
        vendido_2025: vendas,
        soma_oportunidades: oportunidades,
        percentual_meta: meta > 0 ? (vendas / meta) * 100 : 0,
        clientes_sem_venda_90d: filtrados.filter(c => c.dias_sem_comprar >= 90).length,
      })
    }
    return resultado
  }, [rotasData, vendedoresSelecionadosRotas, filtroDiasSemVenda, filtroBoletosAberto, filtroSituacao, clientesPorRota])

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

  // Pré-computa listas de clientes filtradas para todas as cidades já carregadas.
  // useMemo garante re-execução sempre que filtros ou dados de clientes mudam.
  const clientesFiltradosPorCidade = useMemo(() => {
    const resultado = new Map<string, ClienteRotaData[]>()
    for (const [key, clientes] of clientesPorCidade.entries()) {
      resultado.set(key, clientes.filter(c => {
        if (filtroDiasSemVenda !== '' && c.dias_sem_venda < (filtroDiasSemVenda as number)) return false
        if (filtroBoletosAberto !== 'todos') {
          const min = filtroBoletosAberto as number
          if (min === 6 ? c.qtd_boletos < 6 : c.qtd_boletos > min) return false
        }
        if (filtroSituacao === 'inadimplente' && c.situacao !== 'P') return false
        if (filtroSituacao === 'adimplente' && c.situacao === 'P') return false
        return true
      }))
    }
    return resultado
  }, [clientesPorCidade, filtroDiasSemVenda, filtroBoletosAberto, filtroSituacao])

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

  const cidadeKey = (rotaNome: string, cidadeNome: string) => `${rotaNome}||${cidadeNome}`

  const carregarClientesCidade = async (rotaNome: string, cidadeNome: string, codVendedor: number) => {
    const key = cidadeKey(rotaNome, cidadeNome)
    if (clientesPorCidade.has(key)) return

    try {
      setLoadingClientesCidade(true)
      
      // 1. Buscar dados dos clientes e RFM
      const { data: clientesData, error: clientesError } = await supabase
        .from('tabela_clientes')
        .select(`
          codigo_cliente,
          nome_fantasia,
          situacao,
          analise_rfm (
            previsao_pedido,
            meta_ano_atual,
            valor_ano_atual,
            dias_sem_comprar,
            perfil
          )
        `)
        .eq('cidade', cidadeNome)
        .eq('cod_vendedor', codVendedor)
        .not('situacao', 'in', '("I","B")')

      if (clientesError) throw clientesError

      // 2. Buscar inadimplência em batch para os clientes da cidade
      const codigosClientes = (clientesData || []).map(c => c.codigo_cliente)
      const inadimplenciaMap = new Map<number, number>()
      const boletosMap = new Map<number, number>()

      if (codigosClientes.length > 0) {
        try {
          const { data: inadData } = await supabase
            .from('vw_titulos_vencidos_detalhado')
            .select('codigo_cliente, dias_atraso')
            .in('codigo_cliente', codigosClientes)
            .gt('dias_atraso', 0)

          if (inadData) {
            inadData.forEach((r: any) => {
              // Max dias_atraso
              const atual = inadimplenciaMap.get(r.codigo_cliente) ?? 0
              if (r.dias_atraso > atual) inadimplenciaMap.set(r.codigo_cliente, r.dias_atraso)
              // Contagem de boletos em aberto
              boletosMap.set(r.codigo_cliente, (boletosMap.get(r.codigo_cliente) ?? 0) + 1)
            })
          }
        } catch (err) {
          console.warn('Erro ao buscar inadimplência:', err)
        }
      }

      const clientes: ClienteRotaData[] = (clientesData || []).map((c: any) => {
        const rfm = Array.isArray(c.analise_rfm) ? c.analise_rfm[0] : c.analise_rfm
        const meta = rfm?.meta_ano_atual || 0
        const vendas = rfm?.valor_ano_atual || 0
        return {
          codigo_cliente: c.codigo_cliente,
          nome_fantasia: c.nome_fantasia || `Cliente ${c.codigo_cliente}`,
          oportunidade: rfm?.previsao_pedido || 0,
          meta,
          vendas,
          percentual: meta > 0 ? (vendas / meta) * 100 : 0,
          dias_sem_venda: rfm?.dias_sem_comprar || 0,
          dias_atraso: inadimplenciaMap.get(c.codigo_cliente) || 0,
          perfil: rfm?.perfil ?? null,
          situacao: c.situacao || 'A',
          qtd_boletos: boletosMap.get(c.codigo_cliente) ?? 0,
        }
      }).sort((a, b) => b.oportunidade - a.oportunidade)

      const novoMapa = new Map(clientesPorCidade)
      novoMapa.set(key, clientes)
      setClientesPorCidade(novoMapa)
    } catch (err) {
      console.error('Erro ao carregar clientes da cidade:', err)
    } finally {
      setLoadingClientesCidade(false)
    }
  }

  const toggleCidadeExpansao = (rotaNome: string, cidadeNome: string, codVendedor: number) => {
    const key = cidadeKey(rotaNome, cidadeNome)
    if (expandedCidade === key) {
      setExpandedCidade(null)
    } else {
      setExpandedCidade(key)
      carregarClientesCidade(rotaNome, cidadeNome, codVendedor)
    }
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


  const carregarClientesSemRota = async () => {
    if (semRotaCarregado) return
    if (rotasData.length === 0) return
    setLoadingClientesSemRota(true)
    try {
      const codVendedoresFiltrados = vendedoresSelecionadosRotas.length > 0
        ? rotasData
            .filter(r => vendedoresSelecionadosRotas.includes(r.vendedor_uuid))
            .map(r => r.cod_vendedor)
            .filter((v, i, a) => a.indexOf(v) === i)
        : rotasData
            .map(r => r.cod_vendedor)
            .filter((v, i, a) => a.indexOf(v) === i)

      if (codVendedoresFiltrados.length === 0) { setClientesSemRota([]); return }

      const { data: rotasCidades } = await supabase
        .from('rotas_estado')
        .select('cod_vendedor, codigo_ibge_cidade')
        .in('cod_vendedor', codVendedoresFiltrados)

      const cidadesPorVendedor = new Map<number, Set<string>>()
      ;(rotasCidades || []).forEach((rc: any) => {
        if (!cidadesPorVendedor.has(rc.cod_vendedor)) cidadesPorVendedor.set(rc.cod_vendedor, new Set())
        cidadesPorVendedor.get(rc.cod_vendedor)!.add(rc.codigo_ibge_cidade)
      })

      const { data: clientesData, error } = await supabase
        .from('tabela_clientes')
        .select('codigo_cliente, nome_fantasia, cidade, estado, situacao, cod_vendedor, codigo_ibge_cidade')
        .in('cod_vendedor', codVendedoresFiltrados)
        .not('situacao', 'in', '("I","B")')
        .not('codigo_ibge_cidade', 'is', null)

      if (error) throw error

      const vendedorApelidoMap = new Map(rotasData.map(r => [r.cod_vendedor, r.vendedor_apelido]))

      const semRota = (clientesData || [])
        .filter((c: any) => {
          const cidades = cidadesPorVendedor.get(c.cod_vendedor)
          return !cidades || !cidades.has(c.codigo_ibge_cidade ?? '')
        })
        .map((c: any): ClienteSemRota => ({
          codigo_cliente: c.codigo_cliente,
          nome_fantasia: c.nome_fantasia || `Cliente ${c.codigo_cliente}`,
          cidade: c.cidade || '—',
          estado: c.estado || '—',
          situacao: c.situacao || '—',
          cod_vendedor: c.cod_vendedor,
          vendedor_apelido: vendedorApelidoMap.get(c.cod_vendedor) || `Vendedor ${c.cod_vendedor}`,
        }))
        .sort((a: ClienteSemRota, b: ClienteSemRota) => a.cidade.localeCompare(b.cidade))

      setClientesSemRota(semRota)
      setSemRotaCarregado(true)
    } catch (err) {
      console.error('Erro ao carregar clientes sem rota:', err)
    } finally {
      setLoadingClientesSemRota(false)
    }
  }

  const carregarCobertura = async () => {
    if (coberturaCarregada) return
    setLoadingCobertura(true)
    try {
      const { data, error } = await supabase
        .from('vw_cobertura_rota_vendedor')
        .select('*')
        .order('rota', { ascending: true })

      if (error) throw error
      setCoberturaData((data ?? []) as CoberturaRotaData[])
      setCoberturaCarregada(true)
    } catch (err) {
      console.error('Erro ao carregar cobertura de rotas:', err)
    } finally {
      setLoadingCobertura(false)
    }
  }

  const corCobertura = (pct: number): string => {
    if (pct >= 80) return 'text-green-600 font-bold'
    if (pct >= 50) return 'text-yellow-600 font-bold'
    return 'text-red-500 font-bold'
  }

  const corAtingimento = (pct: number): string => {
    if (pct >= 100) return 'text-green-600 font-bold'
    if (pct >= 80)  return 'text-yellow-600 font-bold'
    return 'text-red-500 font-bold'
  }

  const perfilBadge = (perfil: string | null): React.ReactNode => {
    if (!perfil || perfil === 'Sem Perfil') return null
    const styles: Record<string, string> = {
      Ouro:   'bg-yellow-50 text-yellow-700 border border-yellow-300',
      Prata:  'bg-gray-100 text-gray-600 border border-gray-300',
      Bronze: 'bg-orange-50 text-orange-700 border border-orange-300',
    }
    const style = styles[perfil]
    if (!style) return null
    return (
      <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${style}`}>
        {perfil}
      </span>
    )
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

  const filtrosAtivos = useMemo(() => {
    let n = 0
    if (vendedoresSelecionadosRotas.length > 0 && vendedoresSelecionadosRotas.length < vendedores.length) n++
    if (filtroDiasSemVenda !== '') n++
    if (filtroBoletosAberto !== 'todos') n++
    if (filtroSituacao !== 'todos') n++
    return n
  }, [vendedoresSelecionadosRotas, vendedores.length, filtroDiasSemVenda, filtroBoletosAberto, filtroSituacao])

  function limparFiltros() {
    setVendedoresSelecionadosRotas([])
    setFiltroDiasSemVenda('')
    setFiltroBoletosAberto('todos')
    setFiltroSituacao('todos')
  }

  if (loading) {
    return <LoadingSpinner size="md" fullPage />
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
        <Card variant="default" padding="none" className="p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-0">Ranking de Rotas</h3>
            <div className="flex items-center gap-2">
              {filtrosAtivos > 0 && (
                <button onClick={limparFiltros} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}
              <button
                onClick={() => setFiltrosPainelAberto(v => !v)}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  filtrosPainelAberto || filtrosAtivos > 0
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filtros</span>
                {filtrosAtivos > 0 && (
                  <span className="bg-white text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {filtrosAtivos}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Painel de filtros */}
          {filtrosPainelAberto && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Vendedor */}
              <div className="relative" ref={dropdownRotasRef}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Vendedor</label>
                <button
                  onClick={() => setDropdownRotasAberto(!dropdownRotasAberto)}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <span className="text-gray-700 truncate">
                    {vendedoresSelecionadosRotas.length === 0
                      ? 'Todos'
                      : vendedoresSelecionadosRotas.length === vendedores.length
                      ? 'Todos'
                      : `${vendedoresSelecionadosRotas.length} selecionados`}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
                {dropdownRotasAberto && (
                  <div className="absolute left-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-20">
                    <div className="p-2">
                      <button onClick={selecionarTodosRotas} className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded">
                        {vendedoresSelecionadosRotas.length === vendedores.length ? 'Desmarcar todos' : 'Selecionar todos'}
                      </button>
                      <div className="border-t border-gray-200 my-1" />
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

              {/* Dias Sem Venda */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Dias sem venda (mín.)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="Ex: 90"
                  value={filtroDiasSemVenda}
                  onChange={e => setFiltroDiasSemVenda(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {filtroDiasSemVenda !== '' && (
                  <p className="text-[10px] text-gray-400 mt-1">Clientes com ≥ {filtroDiasSemVenda} dias sem comprar</p>
                )}
              </div>

              {/* Boletos em Aberto */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Boletos em aberto</label>
                <select
                  value={filtroBoletosAberto}
                  onChange={e => setFiltroBoletosAberto(e.target.value === 'todos' ? 'todos' : Number(e.target.value) as FiltroBoletos)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="todos">Todos</option>
                  <option value={0}>Sem boletos</option>
                  <option value={1}>Até 1 boleto</option>
                  <option value={2}>Até 2 boletos</option>
                  <option value={3}>Até 3 boletos</option>
                  <option value={4}>Até 4 boletos</option>
                  <option value={5}>Até 5 boletos</option>
                  <option value={6}>6+ boletos</option>
                </select>
              </div>

              {/* Situação */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Situação</label>
                <select
                  value={filtroSituacao}
                  onChange={e => setFiltroSituacao(e.target.value as FiltroSituacao)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="todos">Todos</option>
                  <option value="adimplente">Adimplente</option>
                  <option value="inadimplente">Inadimplente (P)</option>
                </select>
              </div>
            </div>
          )}

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
                  <th className="text-right py-3 px-4 font-semibold text-orange-600">
                    <button
                      onClick={() => handleSortRotas('soma_oportunidades')}
                      className="flex items-center justify-end space-x-1 hover:text-orange-800 w-full"
                    >
                      <span>Oportunidade</span>
                      {getSortIcon('soma_oportunidades', sortRotas)}
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
                      <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(rota.meta_2025, true)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-orange-600">{formatCurrency(rota.soma_oportunidades, true)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatCurrency(rota.vendido_2025, true)}</td>
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
                        <td colSpan={6} className="p-0">
                          {/* Nível 2 — fundo slate para contraste com nível 1 (branco) */}
                          <div className="bg-slate-100">
                            {loadingCidades ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                <span className="ml-2 text-sm text-gray-600">Carregando cidades...</span>
                              </div>
                            ) : (cidadesComMeta.get(rota.rota) || []).length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-700 text-white">
                                      <th className="text-left px-4 py-2 font-semibold">Cidade</th>
                                      <th className="text-right px-4 py-2 font-semibold">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleSortCidadesExpandidas('meta_cidade') }}
                                          className="flex items-center justify-end space-x-1 hover:text-gray-200 w-full"
                                        >
                                          <span>Meta</span>
                                          {getSortIconExpandidas('meta_cidade', sortCidadesExpandidas)}
                                        </button>
                                      </th>
                                      <th className="text-right px-4 py-2 font-semibold text-orange-300">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleSortCidadesExpandidas('soma_oportunidades' as keyof CidadeComMeta) }}
                                          className="flex items-center justify-end space-x-1 hover:text-orange-100 w-full"
                                        >
                                          <span>Oportunidade</span>
                                          {getSortIconExpandidas('soma_oportunidades' as keyof CidadeComMeta, sortCidadesExpandidas)}
                                        </button>
                                      </th>
                                      <th className="text-right px-4 py-2 font-semibold">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleSortCidadesExpandidas('vendas_cidade') }}
                                          className="flex items-center justify-end space-x-1 hover:text-gray-200 w-full"
                                        >
                                          <span>Vendas</span>
                                          {getSortIconExpandidas('vendas_cidade', sortCidadesExpandidas)}
                                        </button>
                                      </th>
                                      <th className="text-right px-4 py-2 font-semibold">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleSortCidadesExpandidas('percentual_atingimento') }}
                                          className="flex items-center justify-end space-x-1 hover:text-gray-200 w-full"
                                        >
                                          <span>Atingimento</span>
                                          {getSortIconExpandidas('percentual_atingimento', sortCidadesExpandidas)}
                                        </button>
                                      </th>
                                      <th className="text-right px-4 py-2 font-semibold">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleSortCidadesExpandidas('qtd_clientes') }}
                                          className="flex items-center justify-end space-x-1 hover:text-gray-200 w-full"
                                        >
                                          <span>Clientes</span>
                                          {getSortIconExpandidas('qtd_clientes', sortCidadesExpandidas)}
                                        </button>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {getCidadesOrdenadas(cidadesComMeta.get(rota.rota) || []).map((cidade) => (
                                      <React.Fragment key={cidade.codigo_ibge_cidade}>
                                        {/* Linha da cidade — expansível para nível 3 */}
                                        <tr
                                          className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer"
                                          onClick={(e) => { e.stopPropagation(); toggleCidadeExpansao(rota.rota, cidade.cidade, rota.cod_vendedor) }}
                                        >
                                          <td className="px-4 py-2 text-gray-900 font-medium">
                                            <div className="flex items-center space-x-1.5">
                                              {expandedCidade === cidadeKey(rota.rota, cidade.cidade)
                                                ? <ChevronUp className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                                                : <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                                              }
                                              <span>{cidade.cidade}</span>
                                            </div>
                                          </td>
                                          <td className="text-right px-4 py-2 text-gray-700">{formatCurrency(cidade.meta_cidade, true)}</td>
                                          <td className="text-right px-4 py-2 font-semibold text-orange-600">{formatCurrency(cidade.soma_oportunidades ?? 0, true)}</td>
                                          <td className="text-right px-4 py-2 font-semibold text-gray-900">{formatCurrency(cidade.vendas_cidade, true)}</td>
                                          <td className="text-right px-4 py-2">
                                            <span className={`font-bold ${
                                              cidade.percentual_atingimento >= 100 ? 'text-green-600' :
                                              cidade.percentual_atingimento >= 80 ? 'text-yellow-600' :
                                              'text-red-600'
                                            }`}>
                                              {cidade.percentual_atingimento.toFixed(1)}%
                                            </span>
                                          </td>
                                          <td className="text-right px-4 py-2 text-gray-700">{cidade.qtd_clientes}</td>
                                        </tr>

                                        {/* Nível 3 — fundo sky para contraste com nível 2 (slate) */}
                                        {expandedCidade === cidadeKey(rota.rota, cidade.cidade) && (
                                          <tr>
                                            <td colSpan={6} className="p-0">
                                              <div className="bg-sky-50">
                                                {loadingClientesCidade ? (
                                                  <div className="flex items-center justify-center py-3">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                    <span className="ml-2 text-xs text-gray-500">Carregando clientes...</span>
                                                  </div>
                                                ) : (clientesFiltradosPorCidade.get(cidadeKey(rota.rota, cidade.cidade)) || []).length > 0 ? (
                                                  <table className="w-full text-xs">
                                                    <thead>
                                                      <tr className="bg-sky-700 text-white">
                                                        <th className="text-left px-4 py-1.5 font-semibold">Cliente</th>
                                                        <th className="text-left px-4 py-1.5 font-semibold">DSV</th>
                                                        <th className="text-right px-4 py-1.5 font-semibold">Boletos</th>
                                                        <th className="text-right px-4 py-1.5 font-semibold">Meta</th>
                                                        <th className="text-right px-4 py-1.5 font-semibold text-orange-300">Oportunidade</th>
                                                        <th className="text-right px-4 py-1.5 font-semibold">Vendas</th>
                                                        <th className="text-right px-4 py-1.5 font-semibold">Atingimento</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {(clientesFiltradosPorCidade.get(cidadeKey(rota.rota, cidade.cidade)) || []).map((cliente, idx) => (
                                                        <tr key={cliente.codigo_cliente} className={`border-b border-sky-100 ${idx % 2 === 0 ? 'bg-sky-50' : 'bg-white'}`}>
                                                          <td className="px-4 py-1.5 text-gray-800 font-medium truncate max-w-[200px]">
                                                            <div className="flex items-center gap-1.5">
                                                              {cliente.situacao === 'P' && (
                                                                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-100 text-red-600 flex-shrink-0">Inad.</span>
                                                              )}
                                                              {cliente.dias_atraso > 0 && (
                                                                <TriangleAlert className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                                              )}
                                                              {perfilBadge(cliente.perfil)}
                                                              <span className="truncate">{cliente.nome_fantasia}</span>
                                                            </div>
                                                          </td>
                                                          <td className="px-4 py-1.5 text-gray-500 font-medium">
                                                            <div className="flex items-center gap-1">
                                                              <Clock className="w-3 h-3 text-gray-400" />
                                                              <span className="font-bold text-[10px] sm:text-[11px]">DSV-{cliente.dias_sem_venda}</span>
                                                            </div>
                                                          </td>
                                                          <td className="text-right px-4 py-1.5">
                                                            {cliente.qtd_boletos > 0 ? (
                                                              <span className="font-bold text-red-500">{cliente.qtd_boletos}</span>
                                                            ) : (
                                                              <span className="text-gray-300">—</span>
                                                            )}
                                                          </td>
                                                          <td className="text-right px-4 py-1.5 text-gray-600">{formatCurrency(cliente.meta, true)}</td>
                                                          <td className="text-right px-4 py-1.5 font-semibold text-orange-600">{formatCurrency(cliente.oportunidade, true)}</td>
                                                          <td className="text-right px-4 py-1.5 text-gray-800">{formatCurrency(cliente.vendas, true)}</td>
                                                          <td className="text-right px-4 py-1.5">
                                                            <span className={`font-bold ${
                                                              cliente.percentual >= 100 ? 'text-green-600' :
                                                              cliente.percentual >= 80 ? 'text-yellow-600' :
                                                              'text-red-500'
                                                            }`}>
                                                              {cliente.percentual.toFixed(1)}%
                                                            </span>
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                    {(() => {
                                                      const clis = clientesFiltradosPorCidade.get(cidadeKey(rota.rota, cidade.cidade)) || []
                                                      if (clis.length === 0) return null
                                                      const tMeta = clis.reduce((s, c) => s + c.meta, 0)
                                                      const tVendas = clis.reduce((s, c) => s + c.vendas, 0)
                                                      const tOp = clis.reduce((s, c) => s + c.oportunidade, 0)
                                                      const tAt = tMeta > 0 ? (tVendas / tMeta) * 100 : 0
                                                      return (
                                                        <tfoot>
                                                          <tr className="border-t-2 border-sky-300 bg-sky-800 text-white text-xs">
                                                            <td className="px-4 py-1.5 font-bold" colSpan={3}>Total ({clis.length} clientes)</td>
                                                            <td className="text-right px-4 py-1.5 font-bold">{formatCurrency(tMeta, true)}</td>
                                                            <td className="text-right px-4 py-1.5 font-bold text-orange-300">{formatCurrency(tOp, true)}</td>
                                                            <td className="text-right px-4 py-1.5 font-bold">{formatCurrency(tVendas, true)}</td>
                                                            <td className="text-right px-4 py-1.5">
                                                              <span className={`font-bold ${tAt >= 100 ? 'text-green-400' : tAt >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                {tAt.toFixed(1)}%
                                                              </span>
                                                            </td>
                                                          </tr>
                                                        </tfoot>
                                                      )
                                                    })()}
                                                  </table>
                                                ) : (
                                                  <p className="text-center text-gray-500 text-xs py-3">
                                                    {filtrosAtivos > 0 ? 'Nenhum cliente corresponde aos filtros' : 'Nenhum cliente encontrado'}
                                                  </p>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </tbody>
                                  {(() => {
                                    const cids = cidadesComMeta.get(rota.rota) || []
                                    if (cids.length === 0) return null
                                    const tMeta = cids.reduce((s, c) => s + (c.meta_cidade || 0), 0)
                                    const tVendas = cids.reduce((s, c) => s + (c.vendas_cidade || 0), 0)
                                    const tOp = cids.reduce((s, c) => s + (c.soma_oportunidades || 0), 0)
                                    const tAt = tMeta > 0 ? (tVendas / tMeta) * 100 : 0
                                    const tCli = cids.reduce((s, c) => s + (c.qtd_clientes || 0), 0)
                                    return (
                                      <tfoot>
                                        <tr className="border-t-2 border-gray-500 bg-gray-800 text-white text-xs">
                                          <td className="px-4 py-2 font-bold">Total ({cids.length} cidades)</td>
                                          <td className="text-right px-4 py-2 font-bold">{formatCurrency(tMeta, true)}</td>
                                          <td className="text-right px-4 py-2 font-bold text-orange-300">{formatCurrency(tOp, true)}</td>
                                          <td className="text-right px-4 py-2 font-bold">{formatCurrency(tVendas, true)}</td>
                                          <td className="text-right px-4 py-2">
                                            <span className={`font-bold ${tAt >= 100 ? 'text-green-400' : tAt >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                                              {tAt.toFixed(1)}%
                                            </span>
                                          </td>
                                          <td className="text-right px-4 py-2 font-bold">{tCli}</td>
                                        </tr>
                                      </tfoot>
                                    )
                                  })()}
                                </table>
                              </div>
                            ) : (
                              <p className="text-center text-gray-600 text-sm py-4">Nenhuma cidade encontrada</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              {rotasOrdenadas.length > 0 && (() => {
                const totalMeta = rotasOrdenadas.reduce((s, r) => s + r.meta_2025, 0)
                const totalVendas = rotasOrdenadas.reduce((s, r) => s + r.vendido_2025, 0)
                const totalOportunidade = rotasOrdenadas.reduce((s, r) => s + r.soma_oportunidades, 0)
                const totalAtingimento = totalMeta > 0 ? (totalVendas / totalMeta) * 100 : 0
                return (
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-900 text-sm">
                        Total ({rotasOrdenadas.length} rotas)
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm" />
                      <td className="py-3 px-4 text-right font-bold text-gray-900 text-sm">{formatCurrency(totalMeta, true)}</td>
                      <td className="py-3 px-4 text-right font-bold text-orange-600 text-sm">{formatCurrency(totalOportunidade, true)}</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900 text-sm">{formatCurrency(totalVendas, true)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold text-sm ${totalAtingimento >= 100 ? 'text-green-600' : totalAtingimento >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {totalAtingimento.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )
              })()}
            </table>
          </div>
        </Card>

        {/* ─── Seção: Clientes Sem Rota ─────────────────────────────────── */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            onClick={() => {
              setSemRotaExpanded(prev => !prev)
              if (!semRotaExpanded) carregarClientesSemRota()
            }}
          >
            <div>
              <h3 className="text-sm font-bold text-gray-800">Clientes Sem Rota</h3>
              <p className="text-xs text-gray-500 mt-0.5">Clientes ativos cuja cidade não está mapeada em nenhuma rota do vendedor</p>
            </div>
            <div className="flex items-center gap-2">
              {semRotaCarregado && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${clientesSemRota.length > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                  {clientesSemRota.length}
                </span>
              )}
              {semRotaExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
            </div>
          </button>
          {semRotaExpanded && (
            <div className="border-t border-gray-100">
              {loadingClientesSemRota ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : clientesSemRota.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-6">Nenhum cliente sem rota encontrado</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 border-b border-gray-100">
                        <th className="text-left px-4 py-2 font-semibold">Cliente</th>
                        <th className="text-left px-4 py-2 font-semibold">Cidade / UF</th>
                        <th className="text-left px-4 py-2 font-semibold">Vendedor</th>
                        <th className="text-center px-4 py-2 font-semibold">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesSemRota.map((c, idx) => (
                        <tr key={c.codigo_cliente} className={`border-b border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-2 text-gray-800 font-medium">
                            <span className="truncate block max-w-[180px]">{c.nome_fantasia}</span>
                            <span className="text-gray-400 text-[10px]">Cód. {c.codigo_cliente}</span>
                          </td>
                          <td className="px-4 py-2 text-gray-600">{c.cidade} — {c.estado}</td>
                          <td className="px-4 py-2 text-gray-600">{c.vendedor_apelido}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.situacao === 'P' ? 'bg-red-100 text-red-600' : c.situacao === 'B' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                              {c.situacao}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Seção: Cobertura de Rotas (180 dias) ───────────────────────── */}
        {(() => {
          const coberturaFiltrada = vendedoresSelecionadosRotas.length === 0
            ? coberturaData
            : coberturaData.filter(row => vendedoresSelecionadosRotas.includes(row.vendedor_id))
          return (
            <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setCoberturaExpanded(prev => !prev)
                  if (!coberturaExpanded) carregarCobertura()
                }}
              >
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Cobertura de Rotas</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Visitas realizadas nos últimos 180 dias por rota e vendedor</p>
                </div>
                {coberturaExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              </button>
              {coberturaExpanded && (
                <div className="border-t border-gray-100">
                  {loadingCobertura ? (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : coberturaFiltrada.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-6">Nenhuma rota encontrada</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-sky-700 text-white">
                            <th className="text-left px-4 py-2 font-semibold">Vendedor</th>
                            <th className="text-left px-4 py-2 font-semibold">Rota</th>
                            <th className="text-right px-4 py-2 font-semibold">Cid.</th>
                            <th className="text-right px-4 py-2 font-semibold">Cli.</th>
                            <th className="text-right px-4 py-2 font-semibold">Meta</th>
                            <th className="text-right px-4 py-2 font-semibold">Vendas</th>
                            <th className="text-right px-4 py-2 font-semibold">Ating.%</th>
                            <th className="text-right px-4 py-2 font-semibold">Visit.180d</th>
                            <th className="text-right px-4 py-2 font-semibold">Cobert.%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coberturaFiltrada.map((row, idx) => (
                            <tr key={`${row.vendedor_id}-${row.rota}`} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-sky-50'}`}>
                              <td className="px-4 py-2 text-gray-700 font-medium">{row.vendedor_apelido}</td>
                              <td className="px-4 py-2 text-gray-700 max-w-[140px] truncate">{row.rota}</td>
                              <td className="px-4 py-2 text-right text-gray-600">{row.qtd_cidades}</td>
                              <td className="px-4 py-2 text-right text-gray-600">{row.qtd_clientes}</td>
                              <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(row.meta_total, true)}</td>
                              <td className="px-4 py-2 text-right text-gray-800">{formatCurrency(row.vendas_total, true)}</td>
                              <td className={`px-4 py-2 text-right ${corAtingimento(Number(row.percentual_atingimento))}`}>
                                {Number(row.percentual_atingimento).toFixed(1)}%
                              </td>
                              <td className="px-4 py-2 text-right text-gray-600">{row.clientes_visitados_180d}/{row.qtd_clientes}</td>
                              <td className={`px-4 py-2 text-right ${corCobertura(Number(row.percentual_cobertura_180d))}`}>
                                {Number(row.percentual_cobertura_180d).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}
      </main>
    </div>
  )
}

export default DashboardRotas