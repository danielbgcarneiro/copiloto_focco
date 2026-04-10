# Story 006 — Agenda: Sugestões Inteligentes + Fluxo de Inclusão + Card de Cliente

**Página:** `src/components/pages/Agenda.tsx`
**Rota:** `/agenda`
**Status:** 🟢 Concluída
**Prioridade:** Alta

---

## Contexto

Três melhorias independentes mas relacionadas na página de Agenda:
1. "Sugestões da semana" não usa lógica de rota/oportunidade
2. O fluxo de inclusão (botão "+") perde o contexto após agendar um cliente
3. O card de cliente na busca de inclusão é poluído e não harmônico com a lista de Clientes

---

## Acceptance Criteria

### AC-1 — Sugestões Inteligentes por Rota (seção permanente) ✅ Concluído

**Nível 1 — Rotas**
- [x] Exibir as **2 rotas com maior oportunidade somada** (`useSugestoesAgenda` via `vendedor_rotas` + `rotas_estado`)
- [x] Cada rota é clicável e expande para o Nível 2 (accordion com chevron)

**Nível 2 — Cidades da rota selecionada**
- [x] Exibir até **10 cidades com maior oportunidade somada** dentro da rota clicada
- [x] Cada cidade navega para o Nível 3

**Nível 3 — Clientes da cidade**
- [x] Exibir até **20 clientes com maior oportunidade** (excluindo `previsao_pedido = 0` ou nulo)
- [x] Ordem: maior oportunidade → menor
- [x] Cada cliente mostra: nome, DSV com cor, oportunidade, badge "Agendado" se tem agendamento na semana
- [x] Botão "Agendar" direto no card → step confirmar
- [x] Após agendar, retorna para lista da cidade (Nível 3)

### AC-2 — Fluxo do botão "+" preserva contexto ✅ Concluído

Fluxo atual (❌ problema):
```
"+" → seleciona cidade → clica cliente → agenda → volta para /agenda (perde contexto)
```

Fluxo correto (✅ esperado):
```
"+" → seleciona cidade → clica cliente → agenda e confirma → volta para lista da cidade selecionada → seleciona próximo cliente ou fecha
```

- [x] Após confirmar agendamento, `BuscarClienteSheet` retorna ao step `busca` em vez de fechar
- [x] Badge "Agendado" exibido no `ClienteBuscaCard` para clientes agendados na sessão (rastreado via `agendadosSessao: Set<number>`)

### AC-3 — Card de cliente mais harmonioso na busca ✅ Concluído (Uma)

- [x] Linha 1: Nome fantasia (bold) + badge perfil alinhado à direita
- [x] Linha 2: Cidade · DSV com cor dinâmica (vermelho >90d, amarelo >60d) · Oportunidade com ícone TrendingUp
- [x] Linha 3: Barra de progresso mini de meta (verde ≥100%, amarelo ≥80%, vermelho <80%) + percentual
- [x] Removida repetição de razao_social abaixo do nome
- [x] Padrão visual: `shadow-sm rounded-xl border border-gray-100`
- [x] `useBuscaCliente` atualizado: `analise_rfm` agora retorna `meta_ano_atual` e `valor_ano_atual`
- [x] `ClienteBusca` interface: campos `meta_ano_atual` e `valor_ano_atual` adicionados
- [x] **@dev** — Linha 4 (inadimplência): `maior_dias_atraso` adicionado ao `ClienteBusca` via batch query em `titulos_aberto_clientes` no hook

### AC-4 — Busca ordenada por oportunidade ✅ Concluído

- [x] Quando o usuário digitar no campo de busca (cidade ou nome do cliente), os resultados devem aparecer **ordenados por maior oportunidade** (decrescente)
- [x] Clientes sem oportunidade (`previsao_pedido = 0` ou nulo) aparecem por último

---

## Arquivos Afetados

- [ ] `src/components/pages/Agenda.tsx`
- [ ] Possivelmente hooks/queries de agenda

---

## Notas Técnicas

- A seção de sugestões pode usar os dados já carregados de rotas/clientes — verificar se query atual retorna oportunidade
- O fluxo do botão "+" pode ser implementado com estado local de `cidadeSelecionada` que persiste após o agendamento
- Clientes com agendamento futuro: verificar join com tabela `agendamentos` (status = 'pendente', data >= hoje)
