import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { 
  getClientes,
  getRotas,
  getCidades,
  getVendas,
  getUserProfile
} from '../lib/supabase'

interface UserProfile {
  id: string
  email: string
  cargo: 'diretor' | 'gestor' | 'vendedor'
  cod_vendedor?: string
  nome?: string
  ativo: boolean
}

interface UserDataContextType {
  profile: UserProfile | null
  clientes: any[]
  rotas: any[]
  cidades: any[]
  vendas: any[]
  loading: boolean
  error: string | null
  hasData: (key: string) => boolean
  refresh: () => void
  clear: () => void
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined)

export const useUserData = () => {
  const context = useContext(UserDataContext)
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider')
  }
  return context
}

// Manter compatibilidade com nome antigo
export const useVendedorData = useUserData

interface UserDataProviderProps {
  children: ReactNode
}

export const UserDataProvider: React.FC<UserDataProviderProps> = ({ children }) => {
  const { user } = useAuth()
  const [dadosCompletos, setDadosCompletos] = useState({
    profile: null,
    clientes: [],
    rotas: [],
    cidades: [],
    vendas: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const carregarDados = async (userId: string) => {
    setLoading(true)
    setError(null)
    
    const resultados: any = {
      profile: null,
      clientes: [],
      rotas: [],
      cidades: [],
      vendas: []
    }

    try {
      // 1. Carrega perfil do usuário
      const { data: profileData, error: profileError } = await getUserProfile(userId)
      if (profileError) {
        throw new Error(`Erro ao carregar perfil: ${profileError}`)
      }
      resultados.profile = profileData

      // 2. Carrega dados com RLS (Row Level Security)
      // Agora o backend filtra automaticamente baseado no usuário logado
      const queries = [
        { key: 'clientes', fn: getClientes },
        { key: 'rotas', fn: getRotas },
        { key: 'cidades', fn: getCidades },
        { key: 'vendas', fn: getVendas }
      ]

      for (const { key, fn } of queries) {
        try {
          const { data, error } = await fn()
          if (error) {
            console.warn(`Erro ao carregar ${key}:`, error)
            resultados[key] = []
          } else {
            resultados[key] = data || []
          }
        } catch (error) {
          console.warn(`Erro ao carregar ${key}:`, error)
          resultados[key] = []
        }
      }

      // Cache em localStorage para performance
      const cacheKey = `userData_${userId}`
      localStorage.setItem(cacheKey, JSON.stringify({
        ...resultados,
        loadedAt: new Date().toISOString()
      }))

      setDadosCompletos(resultados)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // Tenta recuperar do cache primeiro
  useEffect(() => {
    if (user?.id) {
      const cacheKey = `userData_${user.id}`
      const cached = localStorage.getItem(cacheKey)
      
      if (cached) {
        // Tem cache - usa instantaneamente
        try {
          const cachedData = JSON.parse(cached)
          setDadosCompletos(cachedData)
        } catch (error) {
          console.warn('Erro ao carregar cache:', error)
          carregarDados(user.id)
        }
      } else {
        // Não tem cache - carrega tudo
        carregarDados(user.id)
      }
    } else {
      // Usuário não logado - limpa dados
      setDadosCompletos({
        profile: null,
        clientes: [],
        rotas: [],
        cidades: [],
        vendas: []
      })
      setError(null)
    }
  }, [user?.id])

  const hasData = (key: string) => {
    return Array.isArray(dadosCompletos[key as keyof typeof dadosCompletos]) 
      ? (dadosCompletos[key as keyof typeof dadosCompletos] as any[]).length > 0
      : dadosCompletos[key as keyof typeof dadosCompletos] !== null
  }

  const refresh = () => {
    if (user?.id) {
      carregarDados(user.id)
    }
  }

  const clear = () => {
    if (user?.id) {
      const cacheKey = `userData_${user.id}`
      localStorage.removeItem(cacheKey)
    }
    setDadosCompletos({
      profile: null,
      clientes: [],
      rotas: [],
      cidades: [],
      vendas: []
    })
    setError(null)
  }

  const value: UserDataContextType = {
    profile: dadosCompletos.profile,
    clientes: dadosCompletos.clientes,
    rotas: dadosCompletos.rotas,
    cidades: dadosCompletos.cidades,
    vendas: dadosCompletos.vendas,
    loading,
    error,
    hasData,
    refresh,
    clear
  }

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  )
}

// Manter compatibilidade com nome antigo
export const VendedorDataProvider = UserDataProvider