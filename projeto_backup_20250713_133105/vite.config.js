import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: false,
    open: false,
    // Adiciona configurações para estabilidade
    hmr: {
      overlay: false,
      timeout: 30000
    },
    watch: {
      // Ignora diretórios que podem causar problemas
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      // Usa polling em ambientes WSL se necessário
      usePolling: false,
      interval: 1000
    },
    // Desabilita CSP para desenvolvimento
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:;"
    }
  },
  build: {
    outDir: 'dist',
    // Limita o tamanho dos chunks para evitar problemas de memória
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  },
  // Otimizações para prevenir problemas de memória
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
    exclude: []
  },
  // Define limites de memória para o esbuild
  esbuild: {
    logLimit: 10
  }
})