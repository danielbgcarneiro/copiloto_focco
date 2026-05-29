# Story BUG-AG-002 — Adicionar CHECK Constraints em Campos Enum

## Status
Won't Do — Constraints Já Existem

## Executor Assignment
```
executor: "@data-engineer"
quality_gate: "@dev"
quality_gate_tools: [supabase-cli, sql-review]
```

## Story
**As a** desenvolvedor do Copiloto,  
**I want** garantir que `agendamentos.status` e `visitas.resultado` só aceitem valores válidos via CHECK constraint,  
**so that** dados inválidos sejam rejeitados no nível do banco, eliminando riscos de inconsistência de dados silenciosa.

---

## Acceptance Criteria

1. `agendamentos.status` aceita apenas: `'pendente'`, `'realizado'`, `'cancelado'`, `'reagendado'`
2. `visitas.resultado` aceita apenas: `'vendeu'`, `'nao_vendeu'`, `'ausente'`, `'reagendou'`
3. INSERT com valor inválido retorna erro PostgreSQL claro (`check_violation`)
4. Todos os valores existentes no banco são válidos (nenhum dado quebra a constraint)
5. O código TypeScript nos hooks usa valores que passam pelas constraints
6. Migration aplicada sem erros

---

## 🤖 CodeRabbit Integration

### Story Type Analysis
- **Primary Type**: Database — Constraints, Data Integrity
- **Secondary Type(s)**: Security (previne inserção de dados malformados)
- **Complexity**: Low-Medium (requer verificação de dados existentes antes de aplicar)

### Specialized Agent Assignment
**Primary Agents:**
- @data-engineer: Cria e aplica migration com CHECK constraints
- @dev: Verifica compatibilidade dos valores no código TypeScript

**Supporting Agents:**
- Nenhum agente adicional necessário

### Quality Gate Tasks
- [ ] Pre-execution: Verificar todos os valores distintos existentes nas colunas
- [ ] Post-execution: Testar INSERT válido + INSERT inválido — confirmar comportamento correto
- [ ] Code review: Confirmar que hooks TypeScript usam apenas valores permitidos

### Self-Healing Configuration
- **Primary Agent**: @data-engineer (light mode)
- **Severity Filter**: CRITICAL only
- **Predicted Behavior**: Falha na migration por dado inválido → HALT + report ao usuário

### CodeRabbit Focus Areas
**Primary Focus:**
- Verificar que todos os valores no banco são compatíveis com as novas constraints
- Confirmar que os tipos TypeScript espelham os valores das constraints

**Secondary Focus:**
- Verificar que tratamento de erro do frontend lida com `check_violation` adequadamente

---

## Tasks / Subtasks

- [ ] **Task 1 — Investigação: Validar Dados Existentes** (AC: 4)
  - [ ] 1.1 Verificar valores distintos em `agendamentos.status`:
    ```sql
    SELECT status, COUNT(*) as total
    FROM agendamentos
    GROUP BY status
    ORDER BY total DESC;
    ```
    **Valores permitidos:** `pendente`, `realizado`, `cancelado`, `reagendado`
    **Ação se encontrar valor inválido:** Registrar em Dev Notes e corrigir ANTES de aplicar constraint.

  - [ ] 1.2 Verificar valores distintos em `visitas.resultado`:
    ```sql
    SELECT resultado, COUNT(*) as total
    FROM visitas
    GROUP BY resultado
    ORDER BY total DESC;
    ```
    **Valores permitidos:** `vendeu`, `nao_vendeu`, `ausente`, `reagendou`
    **Ação se encontrar valor inválido:** Registrar em Dev Notes e corrigir ANTES de aplicar constraint.

  - [ ] 1.3 Verificar valores em `visitas.origem` (campo secundário, sem CHECK ainda):
    ```sql
    SELECT DISTINCT origem FROM visitas;
    ```
    Apenas observar — não faz parte do escopo desta story.

- [ ] **Task 2 — Investigação: Validar Código TypeScript** (AC: 5)
  - [ ] 2.1 Verificar enum de `status` no código:
    ```bash
    grep -r "status.*=.*['\"]" src/hooks/useVisitas.ts src/components/molecules/AgendarVisitaSheet.tsx src/components/molecules/SugestoesAgendaSheet.tsx
    ```
    **Valores esperados no código:** `'pendente'`, `'realizado'`, `'cancelado'`
    Confirmar que nenhum valor inválido é usado.

  - [ ] 2.2 Verificar enum de `resultado` no código:
    ```bash
    grep -r "resultado.*['\"]vendeu\|nao_vendeu\|ausente\|reagendou['\"]" src/hooks/useVisitas.ts src/components/molecules/RegistrarVisitaSheet.tsx
    ```
    Confirmar que apenas valores válidos são usados nos INSERTs.

  - [ ] 2.3 Verificar interface TypeScript de `Visita` e `Agendamento` em `useVisitas.ts`:
    - Linha ~15-30: `resultado: 'vendeu' | 'nao_vendeu' | 'ausente' | 'reagendou'` — já tipado ✅
    - Linha ~45-50: `status: 'pendente' | 'realizado' | 'cancelado' | 'reagendado'` — verificar

- [ ] **Task 3 — Preparar Migration** (AC: 1, 2, 6)
  - [ ] 3.1 Criar `supabase/migrations/20260528_add_check_constraints_agenda.sql`:
    ```sql
    -- BUG-AG-004: Adicionar CHECK constraints em campos enum
    -- Garante integridade de dados no nível do banco

    -- Constraint em agendamentos.status
    ALTER TABLE agendamentos
      ADD CONSTRAINT chk_agendamentos_status
      CHECK (status IN ('pendente', 'realizado', 'cancelado', 'reagendado'));

    -- Constraint em visitas.resultado
    ALTER TABLE visitas
      ADD CONSTRAINT chk_visitas_resultado
      CHECK (resultado IN ('vendeu', 'nao_vendeu', 'ausente', 'reagendou'));
    ```
  - [ ] 3.2 Revisão com @dev — confirmar que constraints espelham exatamente os tipos TypeScript

- [ ] **Task 4 — Aplicar Migration** (AC: 1, 2, 6)
  - [ ] 4.1 Aplicar via Supabase MCP `apply_migration`
  - [ ] 4.2 Verificar no log se aplicou sem erro

- [ ] **Task 5 — Validar Pós-Aplicação** (AC: 1, 2, 3, 4)
  - [ ] 5.1 Confirmar constraints criadas:
    ```sql
    SELECT conname, consrc
    FROM pg_constraint
    WHERE conrelid IN ('agendamentos'::regclass, 'visitas'::regclass)
      AND contype = 'c';
    ```

  - [ ] 5.2 Testar INSERT válido em `agendamentos`:
    ```sql
    -- Deve funcionar (usar UUID e codigo_cliente reais)
    INSERT INTO agendamentos (vendedor_id, codigo_cliente, data_agendada, status)
    VALUES ('00000000-0000-0000-0000-000000000001', 12345, '2026-06-01', 'pendente');
    -- Limpar após teste: DELETE FROM agendamentos WHERE ...
    ```

  - [ ] 5.3 Testar INSERT inválido em `agendamentos` (deve FALHAR com check_violation):
    ```sql
    INSERT INTO agendamentos (vendedor_id, codigo_cliente, data_agendada, status)
    VALUES ('00000000-0000-0000-0000-000000000001', 12345, '2026-06-01', 'valor_invalido');
    -- Resultado esperado: ERROR: new row for relation "agendamentos" violates check constraint "chk_agendamentos_status"
    ```

  - [ ] 5.4 Mesmo teste para `visitas.resultado` com valor inválido — deve falhar.

---

## Dev Notes

### Contexto do Bug
As colunas `agendamentos.status` e `visitas.resultado` são `text` puro — sem nenhuma validação no banco. Isso significa que qualquer string pode ser inserida, incluindo valores como `'comprou'`, `'finalizado'`, ou strings geradas por erro de código.

O frontend TypeScript tem tipagem correta (union types), mas a camada de banco não reflete essa restrição. Em produção, um bug de código ou chamada direta à API poderia inserir dados inválidos que passariam silenciosamente.

### Valores de Negócio por Campo

**`agendamentos.status`:**
| Valor | Significado |
|-------|------------|
| `pendente` | Visita planejada, ainda não realizada |
| `realizado` | Visita registrada com resultado |
| `cancelado` | Agendamento cancelado pelo vendedor |
| `reagendado` | Visita foi remarcada para outra data |

**`visitas.resultado`:**
| Valor | Significado |
|-------|------------|
| `vendeu` | Visita resultou em venda |
| `nao_vendeu` | Visita realizada sem venda |
| `ausente` | Cliente não estava presente |
| `reagendou` | Cliente pediu novo agendamento |

### Referências de Código
- `src/hooks/useVisitas.ts` — Interface `Visita` e `Agendamento` (tipos union corretos)
- `src/hooks/useAgenda.ts` — `AgendamentoDia.status` referenciado em queries
- `src/components/molecules/RegistrarVisitaSheet.tsx` — INSERT com `resultado`
- `src/components/molecules/SugestoesAgendaSheet.tsx` — INSERT com `status: 'pendente'`
- `src/components/molecules/AgendarVisitaSheet.tsx` — INSERT/UPDATE com `status`

### Risco da Migration
**Baixo** — PostgreSQL verifica todos os dados existentes antes de aplicar a constraint. Se houver dado inválido, a migration falha sem alterar nada. O banco está protegido.

### Tratamento de Erro no Frontend
Se o frontend tentar inserir um valor inválido após esta mudança, o Supabase retornará:
```json
{
  "code": "23514",
  "message": "new row for relation \"agendamentos\" violates check constraint \"chk_agendamentos_status\""
}
```
Os handlers de erro nos hooks já fazem `try/catch`, mas **BUG-AG-006** (error handling silencioso) deve ser resolvido na Story bug-ag-006 para que esse erro seja exibido ao usuário.

---

## Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-05-28 | 1.0 | Story criada — BUG-AG-004 identificado em mapeamento brownfield | @sm (River) |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List
- **BUG INVÁLIDO:** As constraints já existiam no banco com nomes `agendamentos_status_check` e `visitas_resultado_check` — a documentação estava desatualizada.
- Constraints pré-existentes confirmadas via `pg_constraint`:
  - `agendamentos_status_check`: `status IN ('pendente','realizado','cancelado','reagendado')` ✅
  - `visitas_resultado_check`: `resultado IN ('vendeu','nao_vendeu','ausente','reagendou')` ✅
- A migration desta story criou duplicatas que foram imediatamente revertidas via `remove_duplicate_check_constraints_agenda`.
- Adicionalmente, `visitas` já possui CHECK em `origem`, `dia_semana`, `mes_do_ano`, `semana_do_mes` — schema mais completo do que a documentação indicava.

### File List
*(nenhum arquivo modificado — migration de rollback aplicada)*
