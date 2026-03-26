/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './index.css'
import { supabase } from './lib/supabase'

// Expor supabase globalmente para debug
if (typeof window !== 'undefined') {
  window.supabase = supabase
  console.log('🔗 Supabase client disponível globalmente como window.supabase')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)