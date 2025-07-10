import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Função para testar conexão
export async function testConnection() {
  try {
    console.log('🔗 Testando conexão com Supabase...')
    console.log('📍 URL:', supabaseUrl)
    
    const { error } = await supabase
      .from('vendedores')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Erro ao conectar:', error)
      return false
    }
    
    console.log('✅ Conexão bem-sucedida!')
    return true
  } catch (error) {
    console.error('💥 Erro crítico:', error)
    return false
  }
}

// Tipos para as tabelas
export interface User {
  login: string
  senha: string
  cod_vendedor?: string
}

export interface AuthResponse {
  user: User | null
  error: string | null
}

// Função para fazer login
export async function loginUser(login: string, senha: string): Promise<AuthResponse> {
  try {
    console.log('🔐 Tentando login com:', { login, senha: senha.substring(0, 3) + '***' })
    
    const { data, error } = await supabase
      .from('vendedores')
      .select('login, senha, cod_vendedor')
      .eq('login', login)
      .eq('senha', senha)
      .single()

    console.log('📊 Resposta do Supabase:', { data, error })

    if (error) {
      console.error('❌ Erro do Supabase:', error)
      return { user: null, error: error.message || 'Credenciais inválidas' }
    }

    if (!data) {
      console.log('⚠️ Nenhum usuário encontrado')
      return { user: null, error: 'Usuário não encontrado' }
    }

    console.log('✅ Login bem-sucedido:', data.login)
    return { user: data, error: null }
  } catch (error) {
    console.error('💥 Erro de conexão:', error)
    return { user: null, error: 'Erro na conexão' }
  }
}

// Funções de filtragem por vendedor
export async function getClientesByVendedor(cod_vendedor: string) {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('cod_vendedor', cod_vendedor)
    
    if (error) {
      console.error('Erro ao buscar clientes:', error)
      return { data: [], error: error.message }
    }
    
    return { data, error: null }
  } catch (error) {
    console.error('Erro na conexão ao buscar clientes:', error)
    return { data: [], error: 'Erro na conexão' }
  }
}

export async function getRotasByVendedor(cod_vendedor: string) {
  try {
    const { data, error } = await supabase
      .from('rotas')
      .select('*')
      .eq('cod_vendedor', cod_vendedor)
    
    if (error) {
      console.error('Erro ao buscar rotas:', error)
      return { data: [], error: error.message }
    }
    
    return { data, error: null }
  } catch (error) {
    console.error('Erro na conexão ao buscar rotas:', error)
    return { data: [], error: 'Erro na conexão' }
  }
}

export async function getCidadesByVendedor(cod_vendedor: string) {
  try {
    const { data, error } = await supabase
      .from('cidades')
      .select('*')
      .eq('cod_vendedor', cod_vendedor)
    
    if (error) {
      console.error('Erro ao buscar cidades:', error)
      return { data: [], error: error.message }
    }
    
    return { data, error: null }
  } catch (error) {
    console.error('Erro na conexão ao buscar cidades:', error)
    return { data: [], error: 'Erro na conexão' }
  }
}

export async function getVendasByVendedor(cod_vendedor: string) {
  try {
    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .eq('cod_vendedor', cod_vendedor)
    
    if (error) {
      console.error('Erro ao buscar vendas:', error)
      return { data: [], error: error.message }
    }
    
    return { data, error: null }
  } catch (error) {
    console.error('Erro na conexão ao buscar vendas:', error)
    return { data: [], error: 'Erro na conexão' }
  }
}

// Função para buscar dados completos do vendedor (incluindo apelido)
export async function getDadosVendedor(cod_vendedor: string) {
  try {
    const { data, error } = await supabase
      .from('vendedores')
      .select('*')
      .eq('cod_vendedor', cod_vendedor)
      .single()
    
    if (error) {
      console.error('Erro ao buscar dados do vendedor:', error)
      return { data: null, error: error.message }
    }
    
    return { data, error: null }
  } catch (error) {
    console.error('Erro na conexão ao buscar dados do vendedor:', error)
    return { data: null, error: 'Erro na conexão' }
  }
}