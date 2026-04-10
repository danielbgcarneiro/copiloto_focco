# Story 005 — Dashboard Rotas: Coluna Oportunidade + Drill-down Clientes

**Página:** `src/components/pages/DashboardRotas.tsx`
**Rota:** `/gestao/dashboard-rotas`
**Status:** 🟢 Concluída
**Prioridade:** Média

---

## Contexto

O Dashboard de Rotas exibe um ranking com colunas Meta, Vendas e Atingimento. O gestor precisa também visualizar a oportunidade somada por rota, e drill-down até clientes dentro das cidades.

---

## Acceptance Criteria

### AC-1 — Nova coluna: Oportunidade

- [x] Coluna inserida após "Meta", antes de "Vendas", em `text-orange-600` — layout pronto
- [x] Formatação: `formatCurrency()`, coluna ordenável via `RotaSortField`

#### @dev — Agregação de `soma_oportunidades` nos 3 níveis (✅ Concluído)

A coluna existe na UI mas mostra `R$ 0` nos níveis Rota e Cidade porque a agregação não está implementada. Os 3 níveis precisam ser corrigidos em sequência:

**Nível 3 — Cliente** ✅ já funciona
- `carregarClientesCidade()` busca `analise_rfm.previsao_pedido` por cliente — OK

**Nível 2 — Cidade** ⚠️ campo declarado mas não populado
- `CidadeComMeta` tem `soma_oportunidades?: number` — declarado
- `carregarCidadesRota()` usa `select('*')` de `vw_cidades_com_meta`
- **Verificar:** `vw_cidades_com_meta` retorna coluna `soma_oportunidades`?
  - Se **sim**: o valor já vem na query, só não era exibido antes — está correto agora
  - Se **não**: adicionar à view SQL a soma `SUM(analise_rfm.previsao_pedido)` agrupada por cidade

**Nível 1 — Rota** ❌ hardcoded como `0`
- `DashboardRotas.tsx` ~linha 200: `soma_oportunidades: 0 // @dev`
- Fix: no `useEffect` `carregarDados`, o `rotasStatsMap` precisa de um acumulador `oportunidades`
  1. Adicionar `oportunidades: 0` no objeto de `rotasStatsMap.set()`
  2. No loop `cidadesComMeta?.forEach(cidade => ...)` (step 4), somar: `stats.oportunidades += cidade.soma_oportunidades || 0`
  3. Na montagem de `rotasProcessadas` (step 5): `soma_oportunidades: stats.oportunidades`
- **Pré-requisito:** Nível 2 estar correto (a view deve retornar `soma_oportunidades`)

### AC-2 — Drill-down até nível de Clientes

- [x] 3 níveis implementados: Rota → Cidades → Clientes
- [x] Cidade linha expansível (clique) com chevron — key composta `${rotaNome}||${cidadeNome}`
- [x] Clientes ordenados por maior `oportunidade` (decrescente)
- [x] Sub-tabela nível 3: Cliente | Oportunidade | Meta | Vendas | Atingimento
- [x] Lazy load: clientes só carregados ao expandir a cidade (cache em `clientesPorCidade` Map)
- [x] Visual: `border-l-4 border-orange-300` identifica o nível, header `bg-orange-50`
- [x] **@dev** — `tabela_clientes` expõe `nome_fantasia` no select de `carregarClientesCidade()`
- [x] **@dev** — Join `analise_rfm` via FK `codigo_cliente` funciona como embedded relation no Supabase
- [x] **@dev** — Filtro `cod_vendedor + cidade` confirma clientes daquela rota; clientes multi-rota não são caso de uso atual (cada cliente tem 1 `cod_vendedor`)

### AC-3 — Ordenação das colunas

- [x] As 5 colunas são ordenáveis: **Rota**, Meta, **Oportunidade**, Vendas, Atingimento
- [x] `RotaSortField` atualizado com `'soma_oportunidades'`
- [x] Primeiro clique → decrescente; segundo clique → crescente (comportamento já existente via `handleSortRotas`)
- [x] Indicador visual via `getSortIcon` (ArrowUpDown / ArrowUp / ArrowDown)

---

## Arquivos Afetados

- [ ] `src/components/pages/DashboardRotas.tsx`
- [ ] Possivelmente queries em `src/lib/queries/` (verificar se oportunidade já é carregada)

---

## Notas Técnicas

- Verificar se a query atual já retorna `previsao_pedido` por cliente ou se precisa de agregação
- O dropdown de drill-down pode usar lazy loading (só carrega clientes quando a cidade é expandida)
