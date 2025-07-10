import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { 
  getDadosVendedor,
  getClientesByVendedor,
  getRotasByVendedor,
  getCidadesByVendedor,
  getVendasByVendedor
} from '../lib/supabase'

interface VendedorData {
  cod_vendedor?: string
  apelido?: string
  nome?: string
  role?: string
  vendedor_responsavel?: string
  created_at?: string
}

interface VendedorDataContextType {
  vendedor: VendedorData | null
  clientes: any[]
  rotas: any[]
  cidades: any[]
  vendas: any[]
  loading: boolean
  hasData: (key: string) => boolean
  refresh: () => void
  clear: () => void
}

const VendedorDataContext = createContext<VendedorDataContextType | undefined>(undefined)

export const useVendedorData = () => {
  const context = useContext(VendedorDataContext)
  if (context === undefined) {
    throw new Error('useVendedorData must be used within a VendedorDataProvider')
  }
  return context
}

interface VendedorDataProviderProps {
  children: ReactNode
}

export const VendedorDataProvider: React.FC<VendedorDataProviderProps> = ({ children }) => {
  const { user } = useAuth()
  const [dadosCompletos, setDadosCompletos] = useState({
    vendedor: null,
    clientes: [],
    rotas: [],
    cidades: [],
    vendas: []
  })
  const [loading, setLoading] = useState(false)

  const carregarDadosDisponiveis = async (cod_vendedor: string) => {
    setLoading(true)
    
    const resultados: any = {
      vendedor: null,
      clientes: [],
      rotas: [],
      cidades: [],
      vendas: []
    }

    // 1. SEMPRE carrega dados do vendedor
    try {
      const { data: vendedorData } = await getDadosVendedor(cod_vendedor)
      resultados.vendedor = vendedorData
    } catch (error) {
      console.log('Erro ao carregar dados do vendedor:', error)
    }

    // 2. Tenta carregar outras tabelas (SE existirem)
    const queries = [
      { key: 'clientes', fn: getClientesByVendedor },
      { key: 'rotas', fn: getRotasByVendedor },
      { key: 'cidades', fn: getCidadesByVendedor },
      { key: 'vendas', fn: getVendasByVendedor }
    ]

    for (const { key, fn } of queries) {
      try {
        const { data } = await fn(cod_vendedor)
        resultados[key] = data || []
      } catch (error) {
        resultados[key] = []
      }
    }

    // Cache em localStorage para performance
    localStorage.setItem(`vendedor_${cod_vendedor}`, JSON.stringify({
      ...resultados,
      loadedAt: new Date().toISOString()
    }))

    setDadosCompletos(resultados)
    setLoading(false)
  }

  // Tenta recuperar do cache primeiro
  useEffect(() => {
    if (user?.cod_vendedor) {
      const cached = localStorage.getItem(`vendedor_${user.cod_vendedor}`)
      
      if (cached) {
        // Tem cache - usa instantaneamente
        const cachedData = JSON.parse(cached)
        setDadosCompletos(cachedData)
      } else {
        // Não tem cache - carrega tudo
        carregarDadosDisponiveis(user.cod_vendedor)
      }
    }
  }, [user?.cod_vendedor])

  const hasData = (key: string) => {
    return Array.isArray(dadosCompletos[key as keyof typeof dadosCompletos]) 
      ? (dadosCompletos[key as keyof typeof dadosCompletos] as any[]).length > 0
      : dadosCompletos[key as keyof typeof dadosCompletos] !== null
  }

  const refresh = () => {
    if (user?.cod_vendedor) {
      carregarDadosDisponiveis(user.cod_vendedor)
    }
  }

  const clear = () => {
    if (user?.cod_vendedor) {
      localStorage.removeItem(`vendedor_${user.cod_vendedor}`)
    }
    setDadosCompletos({
      vendedor: null,
      clientes: [],
      rotas: [],
      cidades: [],
      vendas: []
    })
  }

  const value: VendedorDataContextType = {
    vendedor: dadosCompletos.vendedor,
    clientes: dadosCompletos.clientes,
    rotas: dadosCompletos.rotas,
    cidades: dadosCompletos.cidades,
    vendas: dadosCompletos.vendas,
    loading,
    hasData,
    refresh,
    clear
  }

  return (
    <VendedorDataContext.Provider value={value}>
      {children}
    </VendedorDataContext.Provider>
  )
}