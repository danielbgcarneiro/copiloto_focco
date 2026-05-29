# Story BUG-AG-001 — Remover Índice Duplicado em `agendamentos`

## Status
Won't Do — Premissa Inválida

## Executor Assignment
```
executor: "@data-engineer"
quality_gate: "@dev"
quality_gate_tools: [supabase-cli, sql-review]
```

## Story
**As a** mantenedor do banco de dados do Copiloto,  
**I want** remover o índice duplicado `idx_agendamentos_pendentes` da tabela `agendamentos`,  
**so that** eliminemos overhead desnecessário de manutenção em cada INSERT/UPDATE nessa tabela.

---

## Acceptance Criteria

1. O índice `idx_agendamentos_pendentes` não existe mais na tabela `agendamentos`
2. O índice `idx_agendamentos_vendedor_data` (idêntico) permanece intacto e funcional
3. Queries existentes que usavam `(vendedor_id, data_agendada)` continuam performáticas
4. Nenhuma funcionalidade do módulo Agenda é afetada
5. A migration é executada sem erros no Supabase

---

## 🤖 CodeRabbit Integration

### Story Type Analysis
- **Primary Type**: Database — Schema/Index optimization
- **Secondary Type(s)**: Maintenance
- **Complexity**: Low (single DDL statement, zero código frontend afetado)

### Specialized Agent Assignment
**Primary Agents:**
- @data-engineer: Executa a migration SQL
- @dev: Valida que nenhuma query no código referencia o índice pelo nome

**Supporting Agents:**
- Nenhum agente adicional necessário

### Quality Gate Tasks
- [ ] Pre-execution: Confirmar existência dupla dos índices via query de validação
- [ ] Post-execution: Confirmar remoção via `pg_indexes` + testar query crítica com EXPLAIN

### Self-Healing Configuration
- **Primary Agent**: @data-engineer (light mode)
- **Max Iterations**: 1
- **Severity Filter**: CRITICAL only
- **Predicted Behavior**: CRITICAL issues → report_only (DDL não tem auto-fix)

### CodeRabbit Focus Areas
**Primary Focus:**
- Verificar que `DROP INDEX` foi aplicado corretamente
- Confirmar que nenhuma dependência de constraint usa o índice removido

---

## Tasks / Subtasks

- [ ] **Task 1 — Investigação e Validação do Problema** (AC: 1, 2)
  - [ ] 1.1 Executar query de confirmação no Supabase (projeto `krisjvemfpnkmduebqdr`):
    ```sql
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'agendamentos'
    ORDER BY indexname;
    ```
    **Resultado esperado:** Dois índices com a mesma definição em `(vendedor_id, data_agendada)`:
    - `idx_agendamentos_pendentes`
    - `idx_agendamentos_vendedor_data`
  - [ ] 1.2 Confirmar que nenhum código TypeScript referencia o índice pelo nome (buscar em `src/`):
    ```bash
    grep -r "idx_agendamentos_pendentes" src/
    ```
    **Resultado esperado:** Zero ocorrências.
  - [ ] 1.3 Confirmar que as constraints da tabela não dependem do índice:
    ```sql
    SELECT conname, contype
    FROM pg_constraint
    WHERE conrelid = 'agendamentos'::regclass;
    ```
    **Resultado esperado:** Nenhuma constraint referencia `idx_agendamentos_pendentes`.

- [ ] **Task 2 — Preparar e Revisar Migration** (AC: 1, 4, 5)
  - [ ] 2.1 Criar arquivo de migration em `supabase/migrations/`:
    ```
    20260528_drop_duplicate_index_agendamentos.sql
    ```
  - [ ] 2.2 Conteúdo da migration:
    ```sql
    -- BUG-AG-001: Remover índice duplicado
    -- idx_agendamentos_pendentes é idêntico a idx_agendamentos_vendedor_data
    -- Ambos cobrem (vendedor_id, data_agendada) BTREE
    -- Mantemos idx_agendamentos_vendedor_data por ter nome mais descritivo
    DROP INDEX CONCURRENTLY IF EXISTS idx_agendamentos_pendentes;
    ```
    > **Nota:** `CONCURRENTLY` evita lock exclusivo na tabela durante remoção em produção.
  - [ ] 2.3 Revisar migration com @dev antes de aplicar — confirmar sintaxe e efeito

- [ ] **Task 3 — Aplicar Migration** (AC: 1, 5)
  - [ ] 3.1 Aplicar via Supabase MCP ou CLI:
    ```bash
    supabase db push
    ```
    OU via MCP `apply_migration` com o SQL da Task 2.2.

- [ ] **Task 4 — Validar Pós-Aplicação** (AC: 1, 2, 3)
  - [ ] 4.1 Re-executar query de índices (Task 1.1) — confirmar que só `idx_agendamentos_vendedor_data` existe
  - [ ] 4.2 Testar query crítica com EXPLAIN:
    ```sql
    EXPLAIN SELECT id, codigo_cliente, data_agendada, status
    FROM agendamentos
    WHERE vendedor_id = 'some-uuid'
      AND data_agendada BETWEEN '2026-05-01' AND '2026-05-31'
      AND status != 'cancelado';
    ```
    **Resultado esperado:** Plano usa `idx_agendamentos_vendedor_data` (Index Scan ou Bitmap Index Scan).
  - [ ] 4.3 Verificar app no browser: Abrir `/agenda` como vendedor — confirmar que agenda carrega sem erros no console

---

## Dev Notes

### Contexto do Bug
A tabela `agendamentos` possui dois índices com **definição idêntica**:
- `idx_agendamentos_pendentes` — `(vendedor_id, data_agendada)` BTREE
- `idx_agendamentos_vendedor_data` — `(vendedor_id, data_agendada)` BTREE

Ambos foram criados provavelmente em migrations separadas sem verificação de duplicidade. O PostgreSQL mantém **dois índices físicos** independentes, executando **double maintenance** a cada INSERT/UPDATE na tabela.

### Arquivos Relevantes
- **Tabela:** `agendamentos` (128 registros ativos)
- **Migration a criar:** `supabase/migrations/20260528_drop_duplicate_index_agendamentos.sql`
- **Documentação de referência:** `docs/architecture/schema-agenda.md` — seção `agendamentos`

### Impacto da Mudança
- **Zero impacto em código TypeScript** — nenhuma query referencia índices pelo nome
- **Zero impacto em RLS policies** — nenhuma policy depende deste índice
- **Melhoria:** Cada INSERT/UPDATE em `agendamentos` executará manutenção de 3 índices em vez de 4

### Queries que se beneficiam de `idx_agendamentos_vendedor_data`
Referência: `src/hooks/useAgenda.ts` — `fetchWeek()` e `fetchMonth()`
```typescript
supabase
  .from('agendamentos')
  .select('id, codigo_cliente, data_agendada, status, valor_previsto')
  .eq('vendedor_id', vendedorId)
  .gte('data_agendada', weekStartStr)
  .lte('data_agendada', weekEndStr)
  .neq('status', 'cancelado')
```

### Checklist de Segurança
- [ ] Confirmar `CONCURRENTLY` está disponível (requer PostgreSQL 9.2+; Supabase usa PostgreSQL 15 ✅)
- [ ] `DROP INDEX CONCURRENTLY` não pode rodar dentro de uma transação — executar standalone
- [ ] `IF EXISTS` garante idempotência (re-executar é seguro)

---

## Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-05-28 | 1.0 | Story criada — BUG-AG-001 identificado em mapeamento brownfield | @sm (River) |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
Investigação executada via Supabase MCP `execute_sql` — projeto `krisjvemfpnkmduebqdr`.

### Completion Notes List
- **BUG INVÁLIDO:** Os dois índices NÃO são idênticos.
  - `idx_agendamentos_vendedor_data`: índice completo `btree (vendedor_id, data_agendada)` — cobre todas as linhas.
  - `idx_agendamentos_pendentes`: índice **parcial** `btree (vendedor_id, data_agendada) WHERE status='pendente'` — cobre apenas pendentes.
- O índice parcial é utilizado por `useSugestoesAgenda.ts` na query `.eq('status','pendente')` — removê-lo causaria degradação de performance nessa query.
- Nenhuma ação de correção necessária. Story encerrada sem migration.

### File List
*(nenhum arquivo modificado)*
