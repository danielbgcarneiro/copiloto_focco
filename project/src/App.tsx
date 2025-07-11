import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { UserDataProvider } from './contexts/VendedorDataContext'
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
        <UserDataProvider>
          <Dashboard />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/clientes",
    element: (
      <ProtectedRoute>
        <UserDataProvider>
          <Clientes />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/rotas",
    element: (
      <ProtectedRoute>
        <UserDataProvider>
          <Rotas />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/cidades",
    element: (
      <ProtectedRoute>
        <UserDataProvider>
          <Cidades />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/cliente/:id",
    element: (
      <ProtectedRoute>
        <UserDataProvider>
          <DetalhesCliente />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/inadimplentes",
    element: (
      <ProtectedRoute>
        <UserDataProvider>
          <Inadimplentes />
        </UserDataProvider>
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