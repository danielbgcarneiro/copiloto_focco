# Story 001 — DetalhesClienteV2: Melhorias de UX (página de teste)

**Página:** `src/components/pages/DetalhesClienteV2.tsx`
**Rota de teste:** `/detalhes-v2/:id`
**Status:** 🟢 Concluída
**Prioridade:** Alta

---

## Contexto

A V2 é a página de testes de melhorias UX. Três ajustes foram identificados em uso real.

---

## Acceptance Criteria

### AC-1 — TelefoneCard: botão de ligar + WhatsApp (3 colunas)

- [x] O bloco de contato (`TelefoneCard`) deve ser dividido em **3 colunas**:
  - Coluna 1: ícone + número + badge (fonte/tipo)
  - Coluna 2: botão **Ligar** (`href="tel:..."`)
  - Coluna 3: botão **WhatsApp** (`href="https://wa.me/..."`)
- [x] O botão WhatsApp usa ícone `MessageCircle` e cor verde (`bg-green-50 text-green-600`)
- [x] Ambos os botões formatam o número removendo caracteres não numéricos
- [x] `TelefoneCard.tsx` atualizado com grid 3 colunas explícito

### AC-2 — Ação Recomendada (coluna `acao_recomendada` da `analise_rfm`)

- [x] Bloco dedicado `bg-blue-50` com emoji 💡 adicionado acima do banner laranja
- [x] Renderiza condicionalmente (só quando `d.acaoRecomendada` não é nulo/vazio)
- [x] Texto inline removido do banner de Oportunidade (sem duplicação)

### AC-3 — Histórico de Visitas não popula após registro

- [x] `onSuccess` do `RegistrarVisitaSheet` agora chama `carregarHistoricoVisitas(codigoClienteNumerico)` além de `refreshVisitaHoje()`
- [x] Query `getHistoricoVisitas` confirmada — não filtra por `motivo`, não há exclusão de registros sem justificativa

---

## Arquivos Afetados

- [ ] `src/components/pages/DetalhesClienteV2.tsx`
- [ ] `src/components/molecules/TelefoneCard.tsx`
- [ ] `src/lib/queries/clientes.ts` (verificar `getHistoricoVisitas`)

---

## Notas Técnicas

- Não alterar `DetalhesCliente.tsx` (V1 de produção) — somente a V2
- O número de WhatsApp deve usar DDI 55 + número sem formatação: `https://wa.me/55{numero_limpo}`
