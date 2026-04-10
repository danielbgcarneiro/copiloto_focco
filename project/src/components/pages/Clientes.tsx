/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, Filter, Check, Clock, MapPin, CheckCircle, Calendar, Plus, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { getClientesPorVendedor } from '../../lib/queries/clientes'
import { getClienteInadimplenteDetalhes, ClienteInadimplente } from '../../lib/queries/inadimplentes'
import { getTitulosClienteResumo, TitulosClienteResumo } from '../../lib/queries/titulos'
import { getEmptyStateMessage } from '../../lib/utils/userHelpers'
import { useSetPage } from '../../contexts'
import { RegistrarVisitaSheet } from '../molecules/RegistrarVisitaSheet'
import { useVisitas } from '../../hooks/useVisitas'

// Cache de formatadores (criado uma única vez)
const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const Clientes: React.FC = () => {
  const navigate = useNavigate()
  const { rotaId, cidadeNome } = useParams<{ rotaId: string; cidadeNome: string }>()
  const { user } = useAuth()
  useSetPage('Clientes', () => navigate(-1))
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('perfil')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [processandoVisita] = useState<number | null>(null)
  const [sheetCliente, setSheetCliente] = useState<{ codigo: number; perfil?: string; oportunidade?: number; dsv?: number } | null>(null)

  const { motivos, loadingMotivos, carregarMotivos, registrarVisita } = useVisitas(sheetCliente?.codigo ?? 0)
  
  // Cache otimizado com timestamp para TTL
  const inadimplenciaCache = useRef<{
    [key: number]: {
      dados: ClienteInadimplente | null;
      timestamp: number
    }
  }>({})

  const titulosCache = useRef<{
    [key: number]: {
      dados: TitulosClienteResumo | null;
      timestamp: number
    }
  }>({})

  const CACHE_TTL = 30 * 60 * 1000; // 30 minutos em ms

  // Decodificar parâmetros da URL
  const rotaNome = rotaId ? decodeURIComponent(rotaId) : null
  const cidadeDecodificada = cidadeNome ? decodeURIComponent(cidadeNome) : null

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Carregar clientes ao montar o componente
  useEffect(() => {
    carregarClientes()
  }, [user, cidadeDecodificada])

  async function carregarClientes() {
    try {
      setLoading(true)

      // Buscar clientes direto com filtro por cidade (se especificada)
      const dados = await getClientesPorVendedor(undefined, cidadeDecodificada || undefined)

      // Setar clientes e remover loading imediatamente para UX rápida
      setClientes(dados)
      setLoading(false)

      // Pré-carregar dados de inadimplência e títulos em background (não bloqueia UI)
      console.log('⚙️ Pré-carregando dados de inadimplência e títulos para', dados.length, 'clientes em background...')
      precarregarDadosAdicionais(dados)

    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      setLoading(false)
    }
  }

  /**
   * Pré-carrega dados de inadimplência e títulos para múltiplos clientes em paralelo
   * Otimizado com carregamento prioritário para clientes visíveis
   */
  async function precarregarDadosAdicionais(clientesList: any[]) {
    // Limpar cache expirado
    const agora = Date.now()
    Object.entries(inadimplenciaCache.current).forEach(([key, value]) => {
      if (agora - value.timestamp > CACHE_TTL) {
        delete inadimplenciaCache.current[parseInt(key)]
      }
    })
    Object.entries(titulosCache.current).forEach(([key, value]) => {
      if (agora - value.timestamp > CACHE_TTL) {
        delete titulosCache.current[parseInt(key)]
      }
    })

    // Filtrar clientes que precisam de dados (inadimplência OU títulos)
    const clientesParaBuscar = clientesList.filter(cliente => {
      const cachedInad = inadimplenciaCache.current[cliente.codigo_cliente]
      const cachedTit = titulosCache.current[cliente.codigo_cliente]
      const precisaInad = !cachedInad || (agora - cachedInad.timestamp > CACHE_TTL)
      const precisaTit = !cachedTit || (agora - cachedTit.timestamp > CACHE_TTL)
      return precisaInad || precisaTit
    })

    if (clientesParaBuscar.length === 0) {
      console.log('✅ Todos os clientes já estão em cache')
      return
    }

    console.log(`📊 Buscando dados adicionais para ${clientesParaBuscar.length} clientes...`)

    // OTIMIZAÇÃO: Priorizar primeiros 12 clientes (provavelmente visíveis na tela)
    const clientesPrioritarios = clientesParaBuscar.slice(0, 12)
    const clientesRestantes = clientesParaBuscar.slice(12)

    // Função helper para buscar lote de clientes (inadimplência e títulos em paralelo)
    const buscarLote = async (lote: any[]) => {
      const promessas = lote.flatMap(cliente => [
        // Buscar inadimplência
        getClienteInadimplenteDetalhes(cliente.codigo_cliente)
          .then(dados => {
            inadimplenciaCache.current[cliente.codigo_cliente] = {
              dados,
              timestamp: Date.now()
            }
          })
          .catch(error => {
            console.warn(`⚠️ Erro ao buscar inadimplência do cliente ${cliente.codigo_cliente}:`, error)
            inadimplenciaCache.current[cliente.codigo_cliente] = {
              dados: null,
              timestamp: Date.now()
            }
          }),
        // Buscar títulos
        getTitulosClienteResumo(cliente.codigo_cliente)
          .then(dados => {
            titulosCache.current[cliente.codigo_cliente] = {
              dados,
              timestamp: Date.now()
            }
          })
          .catch(error => {
            console.warn(`⚠️ Erro ao buscar títulos do cliente ${cliente.codigo_cliente}:`, error)
            titulosCache.current[cliente.codigo_cliente] = {
              dados: null,
              timestamp: Date.now()
            }
          })
      ])
      return Promise.all(promessas)
    }

    // FASE 1: Carregar clientes prioritários rapidamente (lotes de 6)
    console.log(`⚡ Fase 1: Carregando ${clientesPrioritarios.length} clientes prioritários...`)
    const tamanhoLotePrioritario = 6
    for (let i = 0; i < clientesPrioritarios.length; i += tamanhoLotePrioritario) {
      const lote = clientesPrioritarios.slice(i, i + tamanhoLotePrioritario)
      await buscarLote(lote)
    }
    console.log('✅ Clientes prioritários carregados')

    // FASE 2: Carregar restante em background (lotes de 5)
    if (clientesRestantes.length > 0) {
      console.log(`⏳ Fase 2: Carregando ${clientesRestantes.length} clientes restantes em background...`)
      const tamanhoLoteRestante = 5
      for (let i = 0; i < clientesRestantes.length; i += tamanhoLoteRestante) {
        const lote = clientesRestantes.slice(i, i + tamanhoLoteRestante)
        await buscarLote(lote)
      }
      console.log('✅ Todos os clientes carregados')
    }
  }

  // Função para normalizar texto removendo acentos e caracteres especiais
  const normalizeText = (text: string): string => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/gi, '') // Remove caracteres especiais exceto espaços
      .toLowerCase()
      .trim()
  }



  // Função para obter as cores do perfil
  const getPerfilColors = (perfil: string) => {
    const perfilLower = perfil?.toLowerCase() || ''

    if (perfilLower.includes('ouro')) {
      return 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
    }
    if (perfilLower.includes('prata')) {
      return 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 border border-gray-300'
    }
    if (perfilLower.includes('bronze')) {
      return 'bg-gradient-to-br from-orange-200 to-orange-300 text-orange-900 border border-orange-400'
    }

    // Cor padrão
    return 'bg-blue-50 text-primary border border-blue-200'
  }

  /**
   * Função para obter as cores do status de inadimplência
   * Usado para exibir um badge visual indicando o status financeiro do cliente
   */
  const getStatusInadimplenciaColors = (temInadimplencia: boolean, diasAtraso?: number) => {
    if (!temInadimplencia) {
      // Cliente sem inadimplência - Verde
      return {
        status: 'Adimplente',
        statusColor: 'bg-gradient-to-br from-green-100 to-green-200 text-green-800 border border-green-400'
      }
    }

    // Cliente com inadimplência - usar dias de atraso para determinar severidade
    const dias = diasAtraso || 0
    
    if (dias > 90) {
      return {
        status: 'Crítico',
        statusColor: 'bg-gradient-to-br from-red-100 to-red-200 text-red-800 border border-red-400'
      }
    } else if (dias > 60) {
      return {
        status: 'Alto Risco',
        statusColor: 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-800 border border-orange-400'
      }
    } else if (dias > 30) {
      return {
        status: 'Médio',
        statusColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-400'
      }
    } else {
      return {
        status: 'Baixo',
        statusColor: 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border border-blue-400'
      }
    }
  }

  /**
   * Função para buscar dados de inadimplência do cache
   * Não faz requisição, apenas retorna dados já carregados
   */
  const obterInadimplenciaDoCache = (codigoCliente: number): ClienteInadimplente | null | undefined => {
    const cached = inadimplenciaCache.current[codigoCliente]

    if (!cached) {
      return undefined // Dados não carregados ainda
    }

    // Verificar se cache expirou
    const agora = Date.now()
    if (agora - cached.timestamp > CACHE_TTL) {
      return undefined // Cache expirado
    }

    return cached.dados || null // Retorna dados (pode ser null se sem inadimplência)
  }

  /**
   * Função para buscar dados de títulos do cache
   * Não faz requisição, apenas retorna dados já carregados
   */
  const obterTitulosDoCache = (codigoCliente: number): TitulosClienteResumo | null | undefined => {
    const cached = titulosCache.current[codigoCliente]

    if (!cached) {
      return undefined // Dados não carregados ainda
    }

    // Verificar se cache expirou
    const agora = Date.now()
    if (agora - cached.timestamp > CACHE_TTL) {
      return undefined // Cache expirado
    }

    return cached.dados || null // Retorna dados (pode ser null se sem títulos)
  }

  /**
   * Componente para renderizar um card de cliente com lazy loading
   * Otimizado com React.memo para evitar re-renders desnecessários
   */
  const CardCliente: React.FC<{
    cliente: any;
    onCheckClick: (cliente: any, e: React.MouseEvent) => void;
    onAgendarClick: (cliente: any, e: React.MouseEvent) => void;
    onCancelarClick: (cliente: any, e: React.MouseEvent) => void;
    processando: boolean;
    rotaNome: string | null;
    cidadeDecodificada: string | null;
    obterCache: (id: number) => ClienteInadimplente | null | undefined;
    obterCacheTitulos: (id: number) => TitulosClienteResumo | null | undefined;
  }> = React.memo(({ cliente, onCheckClick, onAgendarClick, onCancelarClick, processando, rotaNome, cidadeDecodificada, obterCache, obterCacheTitulos }) => {
    const navigate = useNavigate()
    const [inadimplencia, setInadimplencia] = useState<ClienteInadimplente | null | undefined>(undefined)
    const [titulos, setTitulos] = useState<TitulosClienteResumo | null | undefined>(undefined)
    const [isVisible, setIsVisible] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)
    const rfm = cliente.analise_rfm || {}

    // Usar Intersection Observer para lazy loading
    useEffect(() => {
      const observer = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting) {
            setIsVisible(true)
            // Parar de observar após card ficar visível
            if (cardRef.current) {
              observer.unobserve(cardRef.current)
            }
          }
        },
        { threshold: 0.1 } // Carregar quando 10% do card fica visível
      )

      if (cardRef.current) {
        observer.observe(cardRef.current)
      }

      return () => {
        if (cardRef.current) {
          observer.unobserve(cardRef.current)
        }
      }
    }, [])

    // Carregar dados de inadimplência apenas quando o card fica visível
    useEffect(() => {
      if (isVisible) {
        const dados = obterCache(cliente.codigo_cliente)
        setInadimplencia(dados)

        // Se dados ainda não estão no cache, aguardar até chegarem (sem timeout fixo)
        if (dados === undefined) {
          const checkInterval = setInterval(() => {
            const novosDados = obterCache(cliente.codigo_cliente)
            if (novosDados !== undefined) {
              setInadimplencia(novosDados)
              clearInterval(checkInterval)
            }
          }, 500)

          return () => clearInterval(checkInterval)
        }
      }
    }, [isVisible, cliente.codigo_cliente, obterCache])

    // Carregar dados de títulos apenas quando o card fica visível
    useEffect(() => {
      if (isVisible) {
        const dados = obterCacheTitulos(cliente.codigo_cliente)
        setTitulos(dados)

        // Se dados ainda não estão no cache, aguardar até chegarem (sem timeout fixo)
        if (dados === undefined) {
          const checkInterval = setInterval(() => {
            const novosDados = obterCacheTitulos(cliente.codigo_cliente)
            if (novosDados !== undefined) {
              setTitulos(novosDados)
              clearInterval(checkInterval)
            }
          }, 500)

          return () => clearInterval(checkInterval)
        }
      }
    }, [isVisible, cliente.codigo_cliente, obterCacheTitulos])

    // Memoizar cálculos pesados
    const atingimento = useMemo(() =>
      Math.min(100, Math.max(0, rfm.percentual_atingimento || 0))
    , [rfm.percentual_atingimento])

    const { circumference, greenOffset } = useMemo(() => {
      const circ = 2 * Math.PI * 54
      return {
        circumference: circ,
        greenOffset: circ * (1 - atingimento / 100)
      }
    }, [atingimento])

    // Obter status de inadimplência (memoizado)
    const statusInfo = useMemo(() => {
      const temInadimplencia = inadimplencia !== null && inadimplencia !== undefined
      const diasAtraso = inadimplencia?.maior_dias_atraso
      return getStatusInadimplenciaColors(temInadimplencia, diasAtraso)
    }, [inadimplencia])

    // Calcular dados de títulos (memoizado)
    const dadosTitulos = useMemo(() => {
      if (!titulos || titulos === null) {
        return {
          qtd: 0,
          dias: 0,
          dataFormatada: '-'
        }
      }

      const qtd = titulos.qtd_titulos

      // Calcular dias até a última data de vencimento
      if (!titulos.ultima_data_vencimento) {
        return {
          qtd,
          dias: 0,
          dataFormatada: '-'
        }
      }

      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const dataVenc = new Date(titulos.ultima_data_vencimento)
      dataVenc.setHours(0, 0, 0, 0)

      const diffTime = dataVenc.getTime() - hoje.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // Formatar data como dd/mm/aa
      const dia = dataVenc.getDate().toString().padStart(2, '0')
      const mes = (dataVenc.getMonth() + 1).toString().padStart(2, '0')
      const ano = dataVenc.getFullYear().toString().slice(-2)
      const dataFormatada = `${dia}/${mes}/${ano}`

      return {
        qtd,
        dias: diffDays,
        dataFormatada
      }
    }, [titulos])

    return (
      <div
        ref={cardRef}
        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden"
        onClick={() => {
          const rotaPath = rotaNome ? encodeURIComponent(rotaNome) : 'sem-rota'
          const cidadePath = cidadeDecodificada ? encodeURIComponent(cidadeDecodificada) : 'sem-cidade'
          navigate(`/rotas/${rotaPath}/cidades/${cidadePath}/clientes/${cliente.codigo_cliente}/detalhes`)
        }}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 truncate flex-1 min-w-0">
              {cliente.nome_fantasia}
            </h3>
            {/* Badges de Status e Perfil */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Badge de Status de Inadimplência */}
              {isVisible && (
                inadimplencia !== undefined ? (
                  <span className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-md whitespace-nowrap ${statusInfo.statusColor}`}>
                    {statusInfo.status}
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-md whitespace-nowrap bg-gray-100 text-gray-400 border border-gray-300 animate-pulse">
                    Carregando...
                  </span>
                )
              )}
              {/* Badge de Perfil */}
              {rfm.perfil && (
                <span className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-md whitespace-nowrap ${getPerfilColors(rfm.perfil)}`}>
                  {rfm.perfil}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Código: {cliente.codigo_cliente}
          </p>

          {/* Content - Horizontal */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Donut Chart */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                {/* Background circle (red) */}
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="12"
                />
                {/* Progress circle (green) */}
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={greenOffset}
                  strokeLinecap="butt"
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl sm:text-2xl font-bold text-gray-900">{atingimento.toFixed(1)}%</span>
                <span className="text-[10px] sm:text-xs text-gray-600">Atingimento</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 min-w-0">
              {/* Saldo */}
              <div className="mb-2.5">
                <div className="text-xl sm:text-2xl font-bold text-green-600 truncate">
                  {formatadorMoeda.format(rfm.saldo_meta || 0)}
                </div>
                <div className="text-gray-600 text-[10px] sm:text-xs">Saldo</div>
                <div className="text-gray-500 text-[10px] sm:text-xs truncate">Meta: {formatadorMoeda.format(rfm.meta_ano_atual || 0)}</div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-2.5"></div>

              {/* Metrics row - DSV e Bairro */}
              <div className="grid grid-cols-[1fr_2fr] gap-2 text-center mb-2">
                {/* DSV */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="font-bold text-xs sm:text-sm text-gray-800">{rfm.dias_sem_comprar || 0}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-gray-500">DSV</span>
                </div>

                {/* Bairro */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-gray-500" />
                    <span className="font-bold text-xs sm:text-sm text-gray-800 truncate max-w-[100px]">{cliente.bairro || '-'}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-gray-500">Bairro</span>
                </div>
              </div>

              {/* Metrics row - Títulos */}
              <div className="grid grid-cols-3 gap-1 text-center pt-2 border-t border-gray-200">
                {/* Títulos */}
                <div className="flex flex-col items-center">
                  <span className="font-bold text-xs sm:text-sm text-gray-800">{isVisible ? dadosTitulos.qtd : '-'}</span>
                  <span className="text-[9px] sm:text-[10px] text-gray-500">Títulos</span>
                </div>

                {/* Dias */}
                <div className="flex flex-col items-center">
                  <span className={`font-bold text-xs sm:text-sm ${isVisible && dadosTitulos.dias < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                    {isVisible ? dadosTitulos.dias : '-'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-gray-500">Dias</span>
                </div>

                {/* Ult. Venc */}
                <div className="flex flex-col items-center">
                  <span className="font-bold text-[10px] sm:text-xs text-gray-800">{isVisible ? dadosTitulos.dataFormatada : '-'}</span>
                  <span className="text-[9px] sm:text-[10px] text-gray-500">Ult. Venc</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Oportunidade */}
        <div className="bg-orange-50 py-2.5 px-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="text-orange-600 font-semibold text-xs sm:text-sm truncate">
              Oportunidade: {formatadorMoeda.format(rfm.previsao_pedido || 0)}
            </span>
          </div>

        {/* Ações: sempre 2 colunas */}
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            {cliente.visitado ? (
              /* Visitado — col 1: badge verde com opção de cancelar */
              <button
                onClick={(e) => onCancelarClick(cliente, e)}
                disabled={processando}
                className="py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm shadow-sm hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed group"
                title="Visita registrada — clique para cancelar"
              >
                {processando
                  ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  : (
                    <>
                      <Check className="h-4 w-4 group-hover:hidden" />
                      <X className="h-4 w-4 hidden group-hover:block" />
                      <span className="group-hover:hidden">Visitado</span>
                      <span className="hidden group-hover:inline">Cancelar</span>
                    </>
                  )
                }
              </button>
            ) : (
              /* Não visitado — col 1: registrar */
              <button
                onClick={(e) => onCheckClick(cliente, e)}
                disabled={processando}
                className="py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-sm hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Registrar visita"
              >
                {processando
                  ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  : <><Plus className="h-4 w-4 shrink-0" />Registrar visita</>
                }
              </button>
            )}
            {/* Col 2: Agendar — sempre visível */}
            <button
              onClick={(e) => onAgendarClick(cliente, e)}
              disabled={processando}
              className="py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 font-semibold text-sm shadow-sm hover:bg-primary/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Agendar próxima visita"
            >
              <Calendar className="h-4 w-4 shrink-0" />
              Agendar
            </button>
          </div>
        </div>
      </div>
    )
  }, (prevProps, nextProps) => {
    // Comparação customizada para React.memo
    return (
      prevProps.cliente.codigo_cliente === nextProps.cliente.codigo_cliente &&
      prevProps.cliente.visitado === nextProps.cliente.visitado &&
      prevProps.processando === nextProps.processando &&
      prevProps.cliente.analise_rfm === nextProps.cliente.analise_rfm
    )
  })
  const getPerfilValue = (perfil: string) => {
    const perfilLower = perfil?.toLowerCase() || ''
    if (perfilLower.includes('ouro')) return 3
    if (perfilLower.includes('prata')) return 2
    if (perfilLower.includes('bronze')) return 1
    return 0
  }

  // Função para alternar ordenação (otimizada com useCallback)
  const toggleSort = useCallback((newSortBy: string) => {
    if (sortBy === newSortBy) {
      // Se clicar no mesmo, inverte a direção
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Se mudar de categoria, define direção padrão
      setSortBy(newSortBy)
      if (['perfil', 'oportunidade', 'maior-oportunidade', 'dsv'].includes(newSortBy)) {
        setSortDirection('desc') // Perfil, Oportunidade e DSV: maior → menor
      } else {
        setSortDirection('asc') // Nome e Bairro: A-Z
      }
    }
  }, [sortBy, sortDirection])

  const handleCancelarVisita = useCallback(async (cliente: any, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!user) return
    try {
      // Inativar a visita mais recente do cliente neste vendedor
      const { data: visita } = await supabase
        .from('visitas')
        .select('id')
        .eq('codigo_cliente', cliente.codigo_cliente)
        .eq('vendedor_id', user.id)
        .eq('ativo', true)
        .order('data_visita', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (visita) {
        await supabase.from('visitas').update({ ativo: false }).eq('id', visita.id)
      }

      // Atualiza estado local imediatamente
      setClientes(prev => prev.map(c =>
        c.codigo_cliente === cliente.codigo_cliente ? { ...c, visitado: false } : c
      ))
    } catch (err) {
      console.error('Erro ao cancelar visita:', err)
    }
  }, [user])

  // Função para lidar com click no check button (otimizada com useCallback)
  const handleAgendarClick = useCallback((cliente: any, event: React.MouseEvent) => {
    event.stopPropagation()
    const rotaPath = rotaNome ? encodeURIComponent(rotaNome) : 'sem-rota'
    const cidadePath = cidadeDecodificada ? encodeURIComponent(cidadeDecodificada) : 'sem-cidade'
    navigate(`/rotas/${rotaPath}/cidades/${cidadePath}/clientes/${cliente.codigo_cliente}/detalhes`)
  }, [rotaNome, cidadeDecodificada, navigate])

  const handleCheckClick = useCallback((cliente: any, event: React.MouseEvent) => {
    event.stopPropagation()
    // Abre RegistrarVisitaSheet (só chamado quando visitado=false)
    const rfm = cliente.analise_rfm || {}
    setSheetCliente({
      codigo: cliente.codigo_cliente,
      perfil: rfm.perfil,
      oportunidade: rfm.previsao_pedido,
      dsv: rfm.dias_sem_comprar,
    })
  }, [])

  // Filtrar e ordenar clientes (otimizado com useMemo)
  const clientesFiltrados = useMemo(() => {
    return clientes
      .filter(cliente => {
        const normalizedSearchTerm = normalizeText(searchTerm)
        return normalizeText(cliente.nome_fantasia).includes(normalizedSearchTerm) ||
               normalizeText(cliente.codigo_cliente.toString()).includes(normalizedSearchTerm) ||
               normalizeText(cliente.bairro || '').includes(normalizedSearchTerm)
      })
      .sort((a, b) => {
        // Acessar analise_rfm com segurança
        const a_rfm = a.analise_rfm || {};
        const b_rfm = b.analise_rfm || {};
        let comparison = 0

        switch (sortBy) {
          case 'perfil':
            comparison = getPerfilValue(b_rfm.perfil || '') - getPerfilValue(a_rfm.perfil || '')
            break
          case 'nome':
            comparison = a.nome_fantasia.localeCompare(b.nome_fantasia)
            break
          case 'bairro':
            comparison = (a.bairro || '').localeCompare(b.bairro || '')
            break
          case 'oportunidade':
            comparison = (b_rfm.previsao_pedido || 0) - (a_rfm.previsao_pedido || 0)
            break
          case 'dsv':
            comparison = (b_rfm.dias_sem_comprar || 0) - (a_rfm.dias_sem_comprar || 0)
            break
          default:
            comparison = getPerfilValue(b_rfm.perfil || '') - getPerfilValue(a_rfm.perfil || '')
        }

        // Aplicar direção de ordenação
        return sortDirection === 'desc' ? comparison : -comparison
      })
  }, [clientes, searchTerm, sortBy, sortDirection])

  // Callback após registrar visita com sucesso via RegistrarVisitaSheet
  const handleVisitaSuccess = useCallback(() => {
    if (!sheetCliente) return
    setClientes(prev => prev.map(c =>
      c.codigo_cliente === sheetCliente.codigo ? { ...c, visitado: true } : c
    ))
    setSheetCliente(null)
  }, [sheetCliente])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando clientes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Breadcrumb */}
        {(rotaNome || cidadeDecodificada) && (
          <div className="mb-4 px-2">
            <div className="flex items-center text-sm text-gray-600">
              {rotaNome && <span>Rota: <span className="font-semibold text-primary">{rotaNome}</span></span>}
              {rotaNome && cidadeDecodificada && <span className="mx-2">•</span>}
              {cidadeDecodificada && <span>Cidade: <span className="font-semibold text-primary">{cidadeDecodificada}</span></span>}
            </div>
          </div>
        )}
        
        {/* Search Bar */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar óticas / bairro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="relative flex-shrink-0" ref={sortMenuRef}>
            <button 
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              onClick={() => setShowSortMenu(!showSortMenu)}
            >
              <Filter className="h-4 w-4 text-gray-600" />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-40">
                <button
                  className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200 flex items-center justify-between ${sortBy === 'perfil' ? 'bg-blue-50 font-semibold' : ''}`}
                  onClick={() => { toggleSort('perfil'); setShowSortMenu(false) }}
                >
                  <span>Perfil</span>
                  {sortBy === 'perfil' && <span className="text-[10px] text-gray-500">{sortDirection === 'desc' ? '↓' : '↑'}</span>}
                </button>
                <button
                  className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200 flex items-center justify-between ${sortBy === 'nome' ? 'bg-blue-50 font-semibold' : ''}`}
                  onClick={() => { toggleSort('nome'); setShowSortMenu(false) }}
                >
                  <span>Nome</span>
                  {sortBy === 'nome' && <span className="text-[10px] text-gray-500">{sortDirection === 'asc' ? 'A-Z' : 'Z-A'}</span>}
                </button>
                <button
                  className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200 flex items-center justify-between ${sortBy === 'bairro' ? 'bg-blue-50 font-semibold' : ''}`}
                  onClick={() => { toggleSort('bairro'); setShowSortMenu(false) }}
                >
                  <span>Bairro</span>
                  {sortBy === 'bairro' && <span className="text-[10px] text-gray-500">{sortDirection === 'asc' ? 'A-Z' : 'Z-A'}</span>}
                </button>
                <button
                  className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-b border-gray-200 flex items-center justify-between ${sortBy === 'oportunidade' ? 'bg-blue-50 font-semibold' : ''}`}
                  onClick={() => { toggleSort('oportunidade'); setShowSortMenu(false) }}
                >
                  <span>Oportunidade</span>
                  {sortBy === 'oportunidade' && <span className="text-[10px] text-gray-500">{sortDirection === 'desc' ? '↓' : '↑'}</span>}
                </button>
                <button
                  className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center justify-between ${sortBy === 'dsv' ? 'bg-blue-50 font-semibold' : ''}`}
                  onClick={() => { toggleSort('dsv'); setShowSortMenu(false) }}
                >
                  <span>DSV</span>
                  {sortBy === 'dsv' && <span className="text-[10px] text-gray-500">{sortDirection === 'desc' ? '↓' : '↑'}</span>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Clientes List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {clientesFiltrados.map((cliente) => (
            <CardCliente
              key={cliente.codigo_cliente}
              cliente={cliente}
              onCheckClick={handleCheckClick}
              onAgendarClick={handleAgendarClick}
              onCancelarClick={handleCancelarVisita}
              processando={processandoVisita === cliente.codigo_cliente}
              rotaNome={rotaNome}
              cidadeDecodificada={cidadeDecodificada}
              obterCache={obterInadimplenciaDoCache}
              obterCacheTitulos={obterTitulosDoCache}
            />
          ))}
        </div>

        {/* Mensagem se não houver clientes */}
        {clientesFiltrados.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">{getEmptyStateMessage(user, 'clientes').title}</p>
            <p className="text-sm">
              {searchTerm ? 'Tente ajustar os filtros para encontrar os clientes desejados.' : getEmptyStateMessage(user, 'clientes').subtitle}
            </p>
          </div>
        )}
      </main>

      {/* RegistrarVisitaSheet — abre ao clicar em "Registrar visita" */}
      {sheetCliente && user && (
        <RegistrarVisitaSheet
          isOpen={!!sheetCliente}
          onClose={() => setSheetCliente(null)}
          onSuccess={handleVisitaSuccess}
          codigoCliente={sheetCliente.codigo}
          vendedorId={user.id}
          agendamentoId={null}
          rfmPerfil={sheetCliente.perfil ?? null}
          rfmOportunidade={sheetCliente.oportunidade ?? null}
          rfmDsv={sheetCliente.dsv ?? null}
          motivos={motivos}
          loadingMotivos={loadingMotivos}
          carregarMotivos={carregarMotivos}
          registrarVisita={registrarVisita}
        />
      )}
    </div>
  )
}

export default Clientes