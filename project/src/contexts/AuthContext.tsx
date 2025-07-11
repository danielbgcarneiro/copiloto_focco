import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, loginUser, logoutUser, getCurrentUser } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar se há um usuário autenticado no Supabase
    const checkUser = async () => {
      const { user, error } = await getCurrentUser()
      if (user && !error) {
        setUser(user)
      }
      setLoading(false)
    }
    
    checkUser()
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true)
    try {
      const { user: authUser, error } = await loginUser(email, password)
      
      if (error || !authUser) {
        setLoading(false)
        return { success: false, error: error || 'Erro desconhecido' }
      }

      setUser(authUser)
      setLoading(false)
      return { success: true }
    } catch (error) {
      setLoading(false)
      return { success: false, error: 'Erro na conexão' }
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      // Limpa cache do vendedor antes de fazer logout
      if (user?.profile?.cod_vendedor) {
        localStorage.removeItem(`vendedor_${user.profile.cod_vendedor}`)
      }
      
      await logoutUser()
      setUser(null)
    } catch (error) {
      console.error('Erro no logout:', error)
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}