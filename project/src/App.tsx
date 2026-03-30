/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppShell } from './components/AppShell'
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
import MetasPorCliente from './components/pages/MetasPorCliente'
import PipelineOperacional from './components/pages/PipelineOperacional'
import ProtectedRoute from './components/auth/ProtectedRoute'
import HomeRedirect from './components/auth/HomeRedirect'
import PedidosVendedor from './components/pages/PedidosVendedor'
import Agenda from './components/pages/Agenda'
import GestaoAgenda from './components/pages/GestaoAgenda'
import GestaoAgendaVendedor from './components/pages/GestaoAgendaVendedor'

const router = createBrowserRouter([
  // Rotas públicas — sem AppShell
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

  // Rotas autenticadas — dentro do AppShell
  {
    element: (
      <ProtectedRoute allowedRoles={['vendedor', 'gestor', 'diretor']}>
        <AppShell>
          <Outlet />
        </AppShell>
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/dashboard",
        element: <Dashboard />
      },
      {
        path: "/rotas",
        element: <Rotas />
      },
      {
        path: "/rotas/:rotaId/cidades",
        element: <Cidades />
      },
      {
        path: "/rotas/:rotaId/cidades/:cidadeNome/clientes",
        element: <Clientes />
      },
      {
        path: "/rotas/:rotaId/cidades/:cidadeNome/clientes/:clienteId/detalhes",
        element: <DetalhesCliente />
      },
      {
        path: "/clientes/detalhes/:id",
        element: <DetalhesCliente />
      },
      {
        path: "/inadimplentes",
        element: <Inadimplentes />
      },
      {
        path: "/meus-pedidos",
        element: <PedidosVendedor />
      },
      {
        path: "/agenda",
        element: (
          <ProtectedRoute allowedRoles={['vendedor']}>
            <Agenda />
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
          {
            path: "pipeline",
            element: <PipelineOperacional />,
          },
          {
            path: "agenda",
            element: <GestaoAgenda />,
          },
          {
            path: "agenda/vendedor/:vendedorId",
            element: <GestaoAgendaVendedor />,
          },
        ]
      },
    ]
  },
])

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
