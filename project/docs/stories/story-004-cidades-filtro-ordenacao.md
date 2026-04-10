# Story 004 — Cidades: Filtro e Ordenação por Oportunidade/Meta

**Página:** `src/components/pages/Cidades.tsx`
**Rota:** `/rotas/:rotaId/cidades`
**Status:** 🟢 Concluída
**Prioridade:** Média

---

## Contexto

A página de cidades não tem filtro/ordenação. A página de Clientes já tem um botão de filtro (funil), mas a ordenação começa do menor para o maior, obrigando o usuário a clicar 2x. Dois ajustes independentes.

---

## Acceptance Criteria

### AC-1 — Adicionar botão de filtro em `Cidades.tsx` ✅

- [x] Botão `Funnel` adicionado ao header com estado ativo visual
- [x] Dropdown com 3 opções: Maior Oportunidade (padrão) | Maior Meta | Nome A→Z
- [x] Mesmo clique na coluna ativa alterna direção (asc/desc)
- [x] Implementado em `src/components/pages/Cidades.tsx`

### AC-2 — Corrigir ordem padrão do filtro em `Clientes.tsx` ✅

- [x] Bug corrigido em `toggleSort`: `includes()` agora reconhece `'oportunidade'` e `'maior-oportunidade'` para ordenação desc-first
- [x] Primeiro clique em Oportunidade/Meta/Perfil → ordena decrescente imediatamente

---

## Arquivos Afetados

- [ ] `src/components/pages/Cidades.tsx`
- [ ] `src/components/pages/Clientes.tsx` (correção da ordem padrão)

---

## Notas Técnicas

- O botão de filtro em `Clientes.tsx` já existe — verificar a lógica de toggle de ordenação
- Para `Cidades.tsx`, replicar o padrão de filtro existente em `Clientes.tsx`
- A ordenação por oportunidade usa o campo `previsao_pedido` (verificar nome exato na query de cidades)
