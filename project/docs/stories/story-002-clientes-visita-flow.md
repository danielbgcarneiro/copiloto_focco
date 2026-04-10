# Story 002 — Clientes & DetalhesCliente: Fluxo de Registro de Visita

**Páginas:**
- `src/components/pages/Clientes.tsx` (lista de clientes da cidade)
- `src/components/pages/DetalhesCliente.tsx` (V1 produção)
- `src/components/pages/DetalhesClienteV2.tsx` (V2 teste)

**Rotas:** `/rotas/:rotaId/cidades/:cidadeNome/clientes` · `/detalhes/:id`
**Status:** 🟢 Concluída
**Prioridade:** Alta

---

## Contexto

Dois problemas no fluxo de visitas:
1. O botão de visita na lista de clientes (`Clientes.tsx`) não popula o Supabase nem pede justificativa.
2. A visita registrada em DetalhesClienteV2 não aparece no Histórico de Visitas da mesma página.
3. O histórico deve refletir o estado no módulo de Agenda e vice-versa.

---

## Acceptance Criteria

### AC-1 — Botão de visita em `Clientes.tsx` deve gravar no Supabase e pedir justificativa ✅

- [x] Clique no botão abre `RegistrarVisitaSheet` (via `setSheetCliente`)
- [x] `registrarVisita` do hook `useVisitas` grava na tabela `visitas` no Supabase
- [x] Após confirmação, `handleVisitaSuccess` marca o cliente como `visitado: true` localmente e fecha o sheet

### AC-2 — Histórico de Visitas sincronizado ✅

- [x] `DetalhesCliente.tsx`: `onSuccess` chama `carregarHistoricoVisitas(codigoClienteNumerico)` além de `refreshVisitas()`
- [x] `DetalhesClienteV2.tsx`: já estava correto (chama `carregarHistoricoVisitas` no `onSuccess`)

### AC-3 — Dividir botão de visita em 2 colunas em `Clientes.tsx` ✅

- [x] Grid de 2 colunas implementado com "Registrar visita" + "Agendar visita"
- [x] Quando `visitado = true`: botão full-width "Visitado" (verde) — clicar navega para detalhes
- Nota: ordem e estilos levemente diferentes do spec original (Registrar na col 1, Agendar na col 2)

### AC-4 — Consistência com módulo de Agenda ✅

- [x] Todas as escritas vão para a tabela `visitas` via Supabase (UUID do vendedor como `vendedor_id`)
- [x] Agenda e Gestão leem da mesma tabela `visitas` — sincronização estrutural garantida

---

## Arquivos Afetados

- [ ] `src/components/pages/Clientes.tsx`
- [ ] `src/components/pages/DetalhesCliente.tsx`
- [ ] `src/components/pages/DetalhesClienteV2.tsx`
- [ ] `src/hooks/useVisitas.ts`

---

## Notas Técnicas

- O hook `useVisitas` já tem `registrarVisita` e `refreshVisitaHoje` — reutilizar
- Garantir que `getHistoricoVisitas` não filtra por `motivo IS NOT NULL` (visitas sem justificativa devem aparecer)
