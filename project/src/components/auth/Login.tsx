import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { testConnection } from '../../lib/supabase'
import logoFocco from '../../assets/logos/Logo Focco Brasil.png'

const Login: React.FC = () => {
  const [loginValue, setLoginValue] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login, user } = useAuth()

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  // Testar conexão ao montar o componente
  useEffect(() => {
    testConnection()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    console.log('🔑 Iniciando processo de login...')
    console.log('👤 Login:', loginValue)
    console.log('🔒 Senha tem', senha.length, 'caracteres')

    try {
      const result = await login(loginValue, senha)
      console.log('📋 Resultado do login:', result)
      
      if (result.success) {
        console.log('✅ Login bem-sucedido, redirecionando...')
        navigate('/dashboard')
      } else {
        console.error('❌ Falha no login:', result.error)
        setError(result.error || 'Erro desconhecido')
      }
    } catch (error) {
      console.error('💥 Erro crítico:', error)
      setError('Erro na conexão com o servidor')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={logoFocco} 
            alt="Focco Brasil" 
            className="w-15 h-10 mb-4 mx-auto"
          />
          <h1 className="text-2xl font-semibold text-primary mb-2">Bem-vindo</h1>
          <p className="text-gray-600">Acesse sua plataforma de vendas</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo Login */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Login
            </label>
            <input
              type="text"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              placeholder="Seu login"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              disabled={isLoading}
            />
          </div>

          {/* Campo Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-12"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Exibição de Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Botão de Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Entrando...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Entrar no Sistema
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Plataforma de Gestão Comercial</p>
        </div>
      </div>
    </div>
  )
}

export default Login