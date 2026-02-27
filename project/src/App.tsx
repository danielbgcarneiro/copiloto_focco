/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Login from './components/auth/Login'
import Dashboard from './components/dashboard/Dashboard'
import Clientes from './components/pages/Clientes'
import Rotas from './components/pages/Rotas'
import Cidades from './components/pages/Cidades'
import DetalhesCliente from './components/pages/DetalhesCliente'
import Inadimplentes from './components/pages/Inadimplentes'
import DashboardGestao from './components/pages/DashboardGestao'
import PagAcumuladoAno from './components/pages/PagAcumuladoAno'
import PagAnalytics from './components/pages/PagAnalytics'
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
        <Dashboard />
      </ProtectedRoute>
    )
  },
  {
    path: "/gestao",
    element: (
      <ProtectedRoute allowedRoles={['diretor']}>
        <DashboardGestao />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "acumulado-ano",
        element: <PagAcumuladoAno />,
      },
      {
        path: "analytics",
        element: <PagAnalytics />,
      },
      {
        path: "dashboard-rotas",
        element: <DashboardRotas />,
      },
      {
        path: "top-clientes",
        element: <TopClientes />,
      },
      {
        path: "metas-por-cliente",
        element: <MetasPorCliente />,
      },
    ]
  },
  {
    path: "/rotas",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <Rotas />
      </ProtectedRoute>
    )
  },
  {
    path: "/rotas/:rotaId/cidades",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <Cidades />
      </ProtectedRoute>
    )
  },
  {
    path: "/rotas/:rotaId/cidades/:cidadeNome/clientes",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <Clientes />
      </ProtectedRoute>
    )
  },
  {
    path: "/rotas/:rotaId/cidades/:cidadeNome/clientes/:clienteId/detalhes",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <DetalhesCliente />
      </ProtectedRoute>
    )
  },
  {
    path: "/clientes/detalhes/:id",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <DetalhesCliente />
      </ProtectedRoute>
    )
  },
  {
    path: "/inadimplentes",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <Inadimplentes />
      </ProtectedRoute>
    )
  },
  {
    path: "/meus-pedidos",
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <PedidosVendedor />
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
