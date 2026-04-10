# Story 008 — Menu: Botão Dashboard do Vendedor

## Objetivo
Adicionar o acesso ao Dashboard do vendedor como primeiro item do menu de navegação lateral.

## Contexto
O menu lateral (`navConfig.ts`) não possuía entrada para a página `/dashboard`. O vendedor não conseguia navegar para o Dashboard pelo menu. O item foi criado com ícone `LayoutDashboard` e inserido em primeira posição, visível apenas para o cargo `vendedor`.

---

## Acceptance Criteria

### AC-1 — Entrada no menu (UX — ✅ Concluído)
- Item "Dashboard" adicionado como **1ª posição** em `NAV_ITEMS`
- Ícone: `LayoutDashboard` (lucide-react)
- Path: `/dashboard`
- Roles: `['vendedor']`
- Arquivo: `src/config/navConfig.ts`

### AC-2 — Rota e componente funcionando (@dev — ✅ Concluído)
- [x] Rota `/dashboard` em `App.tsx` aponta para `<Dashboard />` (importado de `./components/dashboard/Dashboard`)
- [x] Estado `active` aplicado via `location.pathname === item.path` em `AppShell.tsx` — funciona corretamente
- [x] Navegação pelo menu usa `navigate(item.path)` padrão

---

## Arquivos Envolvidos
| Arquivo | Responsável |
|---------|------------|
| `src/config/navConfig.ts` | Uma ✅ |
| `src/App.tsx` | @dev |
| `src/components/dashboard/Dashboard.tsx` | @dev (verificar) |

---

## Status: 🟢 Concluída
