# Story 007 — Dashboard: Ações de Cliente na Tabela Ouro/Prata/Bronze

**Página:** `src/components/pages/DashboardGestao.tsx` (ou arquivo equivalente para `/dashboard`)
**Rota:** `/dashboard`
**Status:** 🟢 Concluída
**Prioridade:** Baixa

---

## Contexto

A tabela de clientes Ouro/Prata/Bronze no Dashboard não tem indicadores visuais de inadimplência nem ação rápida de agendamento.

---

## Acceptance Criteria

### AC-1 — Ícone de inadimplência na tabela ✅

- [x] `AlertTriangle` âmbar/vermelho por linha, com `title` descritivo (ex: "Inadimplente — Alto Risco (75d em atraso)")
- [x] Cor dinâmica: vermelho se >60d, âmbar se ≤60d
- [x] `maior_dias_atraso` adicionado à interface `ClientePerfil` e populado via batch query em `getTabelaPerfil`

### AC-2 — Botão de ação de agendamento ✅

- [x] Opção B implementada: botão `Calendar` verde navega para `/clientes/detalhes/:id`
- [x] Implementado em `src/components/dashboard/TabelaPerfil.tsx`

---

## Arquivos Afetados

- [ ] `src/components/pages/DashboardGestao.tsx` (verificar nome correto do arquivo para `/dashboard`)
- [ ] `src/components/molecules/AgendarVisitaSheet.tsx` (se Opção A)

---

## Notas Técnicas

- Verificar qual arquivo renderiza a rota `/dashboard` — pode ser `TopClientes.tsx` ou `DashboardGestao.tsx`
- O ícone de inadimplência pode reutilizar a lógica de `getStatusInadimplenciaColors` já existente em DetalhesCliente
