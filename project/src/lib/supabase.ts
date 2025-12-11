import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-client-info': 'copiloto-app'
    }
  }
})

supabase.auth.onAuthStateChange((_event, _session) => {
  // Auth state tracking
})

export async function testConnection() {
  try {
    const { error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Erro ao conectar com profiles:', error.message)
    }

    await supabase.auth.getUser()

    return !error
  } catch (error) {
    console.error('Erro crítico na conexão:', error instanceof Error ? error.message : 'Erro desconhecido')
    return false
  }
}

// Tipos para as tabelas
export interface Profile {
  id: string // UUID do auth.users
  cod_vendedor: number
  nome_completo: string
  apelido: string
  cargo: 'diretor' | 'gestor' | 'vendedor'
  status: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  nome: string
  apelido: string
  cargo: 'diretor' | 'gestor' | 'vendedor'
  cod_vendedor: number
  profile: Profile | null
}

export interface AuthResponse {
  user: User | null
  error: string | null
}

// Função para fazer login com Supabase Auth
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  try {
    console.log('🔐 Tentando login com:', { 
      email, 
      password: password.substring(0, 3) + '***',
      emailLength: email.length,
      passwordLength: password.length
    })
    
    // Login com Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim()
    })

    console.log('📊 Resposta da autenticação:', { 
      hasAuthData: !!authData,
      hasUser: !!authData?.user,
      authError: authError?.message,
      authErrorCode: authError?.status || authError?.code
    })

    if (authError || !authData.user) {
      console.error('❌ Erro de autenticação detalhado:', {
        error: authError,
        message: authError?.message,
        status: authError?.status,
        code: authError?.code
      })
      return { user: null, error: authError?.message || 'Credenciais inválidas' }
    }

    console.log('✅ Autenticação bem-sucedida, buscando perfil...', {
      userId: authData.user.id,
      userEmail: authData.user.email
    })

    // Buscar profile do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    console.log('📋 Resposta do perfil:', { 
      hasProfile: !!profile,
      profileError: profileError?.message,
      profileData: profile ? {
        id: profile.id,
        nome_completo: profile.nome_completo,
        apelido: profile.apelido,
        cargo: profile.cargo
      } : null
    })

    if (profileError) {
      console.error('❌ Erro ao buscar perfil detalhado:', {
        error: profileError,
        message: profileError.message,
        code: profileError.code,
        hint: profileError.hint
      })
      return { user: null, error: `Erro ao carregar dados do usuário: ${profileError.message}` }
    }

    if (!profile) {
      console.error('❌ Perfil não encontrado para o usuário')
      return { user: null, error: 'Perfil do usuário não encontrado' }
    }

    // Salvar no contexto seguindo o exemplo fornecido
    const user: User = {
      id: authData.user.id,
      email: authData.user.email!,
      nome: profile.nome_completo,
      apelido: profile.apelido,
      cargo: profile.cargo,
      cod_vendedor: profile.cod_vendedor,
      profile: profile
    }

    console.log('✅ Login bem-sucedido:', {
      email: user.email,
      nome: user.nome,
      apelido: user.apelido,
      cargo: user.cargo
    })
    return { user, error: null }
  } catch (error) {
    console.error('💥 Erro de conexão detalhado:', {
      error,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    })
    return { user: null, error: 'Erro na conexão' }
  }
}

export async function logoutUser(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Erro no logout:', error)
      return { error: error.message }
    }
    return { error: null }
  } catch (error) {
    console.error('Erro no logout:', error)
    return { error: 'Erro na conexão' }
  }
}

// Função para verificar usuário logado
export async function getCurrentUser(): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return { user: null, error: authError?.message || null }
    }

    // Buscar dados do perfil
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (profileError) {
      console.error('❌ Erro ao buscar perfil:', profileError)
      return { user: null, error: 'Erro ao carregar dados do usuário' }
    }

    const user: User = {
      id: authUser.id,
      email: authUser.email!,
      nome: profileData.nome_completo,
      apelido: profileData.apelido,
      cargo: profileData.cargo,
      cod_vendedor: profileData.cod_vendedor,
      profile: profileData
    }

    return { user, error: null }
  } catch (error) {
    console.error('💥 Erro ao verificar usuário:', error)
    return { user: null, error: 'Erro na conexão' }
  }
}

// Funções para buscar dados (agora usando RLS - Row Level Security)
export async function getClientes() {
  try {
    const { data, error } = await supabase
      .from('vw_clientes_completo')
      .select('*')
    
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

export async function getRotas() {
  try {
    const { data, error } = await supabase
      .from('rotas')
      .select('*')
    
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

export async function getCidades() {
  try {
    const { data, error } = await supabase
      .from('cidades')
      .select('*')
    
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

export async function getVendas() {
  try {
    const { data, error } = await supabase
      .from('compras_produto_cliente')
      .select('*')
    
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

// Função para buscar perfil do usuário
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Erro ao buscar perfil:', error)
      return { data: null, error: error.message }
    }
    
    return { data, error: null }
  } catch (error) {
    console.error('Erro na conexão ao buscar perfil:', error)
    return { data: null, error: 'Erro na conexão' }
  }
}