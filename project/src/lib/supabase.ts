import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipos para as tabelas
export interface User {
  id: string
  login: string
  senha: string
  nome?: string
  role?: 'representante' | 'gestor' | 'diretor'
  vendedor_responsavel?: string
  apelido?: string
  created_at?: string
}

export interface AuthResponse {
  user: User | null
  error: string | null
}

// Função para fazer login
export async function loginUser(login: string, senha: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase
      .from('vendedor')
      .select('id, login, senha, nome, role, vendedor_responsavel, apelido, created_at')
      .eq('login', login)
      .eq('senha', senha)
      .single()

    if (error) {
      return { user: null, error: 'Credenciais inválidas' }
    }

    return { user: data, error: null }
  } catch (error) {
    return { user: null, error: 'Erro na conexão' }
  }
}