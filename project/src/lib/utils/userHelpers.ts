import { User } from '../supabase';

export function isAdmin(user: User | null): boolean {
  return user?.cargo === 'diretor' || user?.cargo === 'gestor';
}

export function isVendedor(user: User | null): boolean {
  return user?.cargo === 'vendedor';
}

export function getEmptyStateMessage(user: User | null, dataType: 'clientes' | 'rotas' | 'cidades' | 'dashboard'): {
  title: string;
  subtitle: string;
} {
  const isUserAdmin = isAdmin(user);
  
  switch (dataType) {
    case 'clientes':
      return {
        title: 'Nenhum cliente encontrado',
        subtitle: isUserAdmin 
          ? 'Não há clientes cadastrados no sistema.'
          : 'Você não possui clientes atribuídos no momento.'
      };
    
    case 'rotas':
      return {
        title: 'Nenhuma rota encontrada',
        subtitle: isUserAdmin
          ? 'Não há rotas cadastradas no sistema.'
          : 'Você não possui rotas ativas no momento.'
      };
    
    case 'cidades':
      return {
        title: 'Nenhuma cidade encontrada',
        subtitle: isUserAdmin
          ? 'Não há cidades cadastradas no sistema.'
          : 'Você não possui cidades em suas rotas.'
      };
    
    case 'dashboard':
      return {
        title: 'Sem dados disponíveis',
        subtitle: isUserAdmin
          ? 'Não há dados de vendas ou métricas no sistema.'
          : 'Você ainda não possui dados de vendas ou métricas.'
      };
    
    default:
      return {
        title: 'Nenhum dado encontrado',
        subtitle: 'Não há informações disponíveis no momento.'
      };
  }
}