/**
 * Manifesto de TODAS as rotas do app (src/App.tsx).
 * Rotas com parâmetros (:rotaId, :clienteId, :vendedorId) NÃO entram aqui —
 * são cobertas por jornadas de drill-down (descobrem IDs reais em runtime).
 *
 * `title`  = texto exibido no AppTopBar (useSetPage) quando existe.
 * `anchor` = texto visível de conteúdo para páginas sem título próprio.
 */
export interface RouteSpec {
  path: string;
  name: string;
  title?: string;
  anchor?: RegExp | string;
}

/** Rotas autenticadas acessíveis por vendedor (menu lateral do vendedor). */
export const VENDEDOR_ROUTES: RouteSpec[] = [
  { path: '/dashboard', name: 'Dashboard', title: 'Copiloto' },
  { path: '/rotas', name: 'Rotas', title: 'Rotas' },
  { path: '/inadimplentes', name: 'Inadimplentes', title: 'Inadimplentes' },
  { path: '/meus-pedidos', name: 'Meus Pedidos', title: 'Meus Pedidos' },
  { path: '/agenda', name: 'Agenda', title: 'Agenda' },
];

/** Rotas exclusivas do diretor — módulo Gestão e suas sub-páginas. */
export const DIRETOR_ROUTES: RouteSpec[] = [
  { path: '/gestao', name: 'Gestão — Visão Geral', title: 'Gestão', anchor: /Bem-vindo/ },
  { path: '/gestao/metas-por-cliente', name: 'Metas por Cliente', title: 'Gestão', anchor: 'Filtros' },
  { path: '/gestao/acumulado-ano', name: 'Acumulado do Ano', title: 'Gestão', anchor: /Realizado|Objetivo/ },
  { path: '/gestao/analytics', name: 'Analytics', title: 'Gestão', anchor: /Filtros|Perfil/ },
  { path: '/gestao/dashboard-rotas', name: 'Dashboard Rotas', title: 'Gestão', anchor: 'Ranking de Rotas' },
  { path: '/gestao/top-clientes', name: 'Top Clientes', title: 'Gestão', anchor: 'Atingimento Geral' },
  { path: '/gestao/pipeline', name: 'Pipeline', title: 'Gestão' },
  { path: '/gestao/agenda', name: 'Gestão Agenda', title: 'Gestão' },
];
