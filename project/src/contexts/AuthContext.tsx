import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, loginUser } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (login: string, senha: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
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
    // Verificar se há um usuário salvo no localStorage
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (loginValue: string, senha: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true)
    try {
      const { user: authUser, error } = await loginUser(loginValue, senha)
      
      if (error || !authUser) {
        setLoading(false)
        return { success: false, error: error || 'Erro desconhecido' }
      }

      setUser(authUser)
      localStorage.setItem('user', JSON.stringify(authUser))
      setLoading(false)
      return { success: true }
    } catch (error) {
      setLoading(false)
      return { success: false, error: 'Erro na conexão' }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
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