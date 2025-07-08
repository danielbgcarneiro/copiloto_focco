import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Login from './components/auth/Login'
import Dashboard from './components/dashboard/Dashboard'
import Clientes from './components/pages/Clientes'
import Rotas from './components/pages/Rotas'
import Cidades from './components/pages/Cidades'
import DetalhesCliente from './components/pages/DetalhesCliente'
import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/rotas" element={<ProtectedRoute><Rotas /></ProtectedRoute>} />
            <Route path="/cidades" element={<ProtectedRoute><Cidades /></ProtectedRoute>} />
            <Route path="/cliente/:id" element={<ProtectedRoute><DetalhesCliente /></ProtectedRoute>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App