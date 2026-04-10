# Story 003 — Agenda & Gestão: Histórico de Visitas sem Justificativa

**Páginas:**
- `src/components/pages/Agenda.tsx`
- `src/components/pages/GestaoAgenda.tsx`
- `src/components/pages/GestaoAgendaVendedor.tsx`

**Rotas:** `/agenda` · `/gestao/agenda` · `/gestao/agenda/:vendedorId`
**Status:** 🟢 Concluída
**Prioridade:** Média

---

## Contexto

Visitas registradas historicamente (antes da obrigatoriedade de justificativa) não aparecem no histórico do módulo de Agenda. O sistema deve ser retroativamente inclusivo.

---

## Acceptance Criteria

### AC-1 — Query de histórico não pode exigir justificativa ✅

- [x] Verificado: nenhuma query em `getHistoricoVisitas` (clientes.ts), `useGestaoAgenda.ts`, `Agenda.tsx` filtra por `motivo IS NOT NULL`
- [x] Registros sem `motivo` não são excluídos — a query filtra apenas por `vendedor_id`, `codigo_cliente` e `ativo = true`

### AC-2 — Visão do Vendedor (`/agenda`) ✅

- [x] `getHistoricoVisitas` retorna todas as visitas com `ativo = true`, sem filtro por motivo
- [x] O campo `motivo` não é exibido no histórico dos detalhes do cliente (só `resultado` e `data_visita`)

### AC-3 — Visão do Gestor (`/gestao/agenda` e `/gestao/agenda/:vendedorId`) ✅

- [x] `useGestaoAgenda.ts`: query de visitas filtra apenas por `vendedor_id`, datas e `ativo` — sem filtro por motivo
- [x] `topMotivos` é calculado a partir de `motivo_nao_venda_id` (quando presente), sem excluir visitas sem motivo

### AC-4 — Histórico na linha do card de visita em Detalhes do Cliente ✅

- [x] `DetalhesCliente.tsx`: tabela 3 colunas (Data | Status | Vendeu?) — `resultado === 'vendeu'` → "Sim", `'nao_vendeu'` → "Não", null → "—"
- [x] `DetalhesClienteV2.tsx`: já tinha 3 colunas com lógica equivalente
- [x] Campo derivado de `resultado` (string) da tabela `visitas` — não existe coluna `vendeu` boolean, mas `resultado` cobre o mesmo significado

---

## Arquivos Afetados

- [ ] `src/components/pages/Agenda.tsx`
- [ ] `src/components/pages/GestaoAgenda.tsx`
- [ ] `src/components/pages/GestaoAgendaVendedor.tsx`
- [ ] `src/lib/queries/clientes.ts` (função `getHistoricoVisitas`)

---

## Notas Técnicas

- Verificar schema da tabela `visitas` no Supabase para confirmar campos disponíveis
- A 3ª coluna (vendeu/não vendeu) pode ser implementada em `DetalhesCliente.tsx` e `DetalhesClienteV2.tsx` também
