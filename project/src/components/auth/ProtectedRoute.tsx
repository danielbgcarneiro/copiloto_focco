/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Array<User['cargo']>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(user.cargo)) {
    if (user.cargo === 'diretor') {
      return <Navigate to="/gestao" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
