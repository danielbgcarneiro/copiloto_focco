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
import DashboardGestao from './components/pages/DashboardGestao'
import PagAcumuladoAno from './components/pages/PagAcumuladoAno'
import DashboardRotas from './components/pages/DashboardRotas'
import TopClientes from './components/pages/TopClientes'
import MetasPorCliente from './components/pages/MetasPorCliente' // New import
import ProtectedRoute from './components/auth/ProtectedRoute'
import HomeRedirect from './components/auth/HomeRedirect'
import PedidosVendedor from './components/pages/PedidosVendedor'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />
  },
  {
    path: "/home",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <HomeRedirect />
      </ProtectedRoute>
    )
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <UserDataProvider>
          <Dashboard />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/dashboard-gestao",
    element: (
      <ProtectedRoute allowedRoles={['diretor']}>
        <UserDataProvider>
          <DashboardGestao />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/acumulado-ano",
    element: (
      <ProtectedRoute allowedRoles={['diretor']}>
        <UserDataProvider>
          <PagAcumuladoAno />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/dashboard-rotas",
    element: (
      <ProtectedRoute allowedRoles={['diretor']}>
        <UserDataProvider>
          <DashboardRotas />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/top-clientes",
    element: (
      <ProtectedRoute allowedRoles={['diretor']}>
        <UserDataProvider>
          <TopClientes />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/metas-por-cliente", // New route
    element: (
      <ProtectedRoute allowedRoles={['diretor']}>
        <UserDataProvider>
          <MetasPorCliente />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/rotas",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <UserDataProvider>
          <Rotas />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/rotas/:rotaId/cidades",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <UserDataProvider>
          <Cidades />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/rotas/:rotaId/cidades/:cidadeNome/clientes",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <UserDataProvider>
          <Clientes />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/rotas/:rotaId/cidades/:cidadeNome/clientes/:clienteId/detalhes",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <UserDataProvider>
          <DetalhesCliente />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/clientes/detalhes/:id",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <UserDataProvider>
          <DetalhesCliente />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/inadimplentes",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <UserDataProvider>
          <Inadimplentes />
        </UserDataProvider>
      </ProtectedRoute>
    )
  },
  {
    path: "/meus-pedidos",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <UserDataProvider>
          <PedidosVendedor />
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
