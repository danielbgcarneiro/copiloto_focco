import { Map, AlertTriangle, ShoppingBag, BarChart3, Calendar, LucideIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export type Role = 'vendedor' | 'gestor' | 'diretor'

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  path: string
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'rotas',
    label: 'Rotas',
    icon: Map,
    path: '/rotas',
    roles: ['vendedor', 'gestor', 'diretor'],
  },
  {
    id: 'inadimplentes',
    label: 'Inadimplentes',
    icon: AlertTriangle,
    path: '/inadimplentes',
    roles: ['vendedor', 'gestor', 'diretor'],
  },
  {
    id: 'pedidos',
    label: 'Pedidos',
    icon: ShoppingBag,
    path: '/meus-pedidos',
    roles: ['vendedor', 'gestor', 'diretor'],
  },
  {
    id: 'agenda',
    label: 'Agenda',
    icon: Calendar,
    path: '/agenda',
    roles: ['vendedor'],
  },
  {
    id: 'gestao',
    label: 'Gestão',
    icon: BarChart3,
    path: '/gestao',
    roles: ['gestor', 'diretor'],
  },
]

export function useNavItems(): NavItem[] {
  const { user } = useAuth()
  const cargo = user?.cargo as Role | undefined
  if (cargo !== 'vendedor') return []
  return NAV_ITEMS.filter(item => item.roles.includes(cargo))
}
