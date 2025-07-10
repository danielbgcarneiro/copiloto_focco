import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { VendedorDataProvider } from './contexts/VendedorDataContext'
import Login from './components/auth/Login'
import Dashboard from './components/dashboard/Dashboard'
import Clientes from './components/pages/Clientes'
import Rotas from './components/pages/Rotas'
import Cidades from './components/pages/Cidades'
import DetalhesCliente from './components/pages/DetalhesCliente'
import Inadimplentes from './components/pages/Inadimplentes'
import ProtectedRoute from './components/auth/ProtectedRoute'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <VendedorDataProvider>
          <Dashboard />
        </VendedorDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/clientes",
    element: (
      <ProtectedRoute>
        <VendedorDataProvider>
          <Clientes />
        </VendedorDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/rotas",
    element: (
      <ProtectedRoute>
        <VendedorDataProvider>
          <Rotas />
        </VendedorDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/cidades",
    element: (
      <ProtectedRoute>
        <VendedorDataProvider>
          <Cidades />
        </VendedorDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/cliente/:id",
    element: (
      <ProtectedRoute>
        <VendedorDataProvider>
          <DetalhesCliente />
        </VendedorDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/inadimplentes",
    element: (
      <ProtectedRoute>
        <VendedorDataProvider>
          <Inadimplentes />
        </VendedorDataProvider>
      </ProtectedRoute>
    )
  }
])

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App