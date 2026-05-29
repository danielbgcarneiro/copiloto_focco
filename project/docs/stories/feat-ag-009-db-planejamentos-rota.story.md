# Story FEAT-AG-009 — DB: Tabelas e RLS para Planejamento de Rota em Lote

## Status
Draft

## Executor Assignment
```
executor: "@data-engineer"
quality_gate: "@architect"
quality_gate_tools: [supabase-cli, rls-audit, sql-review]
```

## Story
**As a** desenvolvedor do Copiloto,  
**I want** que o banco de dados tenha as tabelas `planejamentos_rota` e `planejamento_clientes` com RLS, índices e constraints corretos,  
**so that** o módulo de planejamento de rota em lote (FEAT-AG-010) tenha uma base de dados robusta que rastreie o estado de cada plano e de cada cliente incluído.

---

## Acceptance Criteria

1. A tabela `planejamentos_rota` existe com colunas: `id`, `vendedor_id`, `rota`, `data_inicio`, `data_fim`, `status`, `created_at`, `updated_at`
2. A tabela `planejamento_clientes` existe com colunas: `id`, `planejamento_id`, `codigo_cliente`, `cidade`, `data_prevista`, `status`, `agendamento_id`, `created_at`
3. `status` de `planejamentos_rota` aceita apenas: `'rascunho'`, `'confirmado'`, `'em_andamento'`, `'concluido'` (CHECK constraint)
4. `status` de `planejamento_clientes` aceita apenas: `'pendente'`, `'agendado'`, `'pulado'` (CHECK constraint)
5. RLS ativo em ambas: vendedor acessa apenas seus próprios planos; gestor e diretor leem todos
6. Índices criados para os acessos mais frequentes
7. Migration aplicada sem erros

---

## 🤖 CodeRabbit Integration

### Story Type Analysis
- **Primary Type**: Database — Schema Design, RLS
- **Secondary Type(s)**: Foundation (pré-requisito de FEAT-AG-010)
- **Complexity**: Medium (2 tabelas novas com RLS + constraints + índices)

### Specialized Agent Assignment
**Primary Agents:**
- @data-engineer: Cria migration completa
- @architect: Valida modelo de dados contra os requisitos de FEAT-AG-010

**Supporting Agents:**
- Nenhum

### Quality Gate Tasks
- [ ] Pre-execution: Confirmar que tabelas ainda não existem
- [ ] Post-execution: Validar RLS com query de vendedor simulado
- [ ] Post-execution: Confirmar CHECK constraints via `pg_constraint`

### Self-Healing Configuration
- **Primary Agent**: @data-engineer (check mode)
- **Severity Filter**: CRITICAL only
- **Predicted Behavior**: RLS incorreto → HALT + report

---

## Tasks / Subtasks

- [ ] **Task 1 — Investigação** (AC: 1, 2)
  - [ ] 1.1 Confirmar que tabelas não existem:
    ```sql
    SELECT table_name FROM information_schema.tables
    WHERE table_name IN ('planejamentos_rota', 'planejamento_clientes');
    ```
    **Resultado esperado:** Zero linhas.

  - [ ] 1.2 Confirmar existência da função `get_user_cargo()` para usar nas policies:
    ```sql
    SELECT proname FROM pg_proc WHERE proname = 'get_user_cargo';
    ```

- [ ] **Task 2 — Criar Migration** (AC: 1–7)
  - [ ] 2.1 Criar `supabase/migrations/YYYYMMDD_create_planejamentos_rota.sql`:

    ```sql
    -- FEAT-AG-009: Tabelas para planejamento de rota em lote
    -- planejamentos_rota: representa a intenção de planejar uma rota num período
    -- planejamento_clientes: cada cliente incluído no plano, com estado individual

    -- ─── Tabela principal ────────────────────────────────────────────────────────
    CREATE TABLE planejamentos_rota (
      id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      vendedor_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      rota         TEXT        NOT NULL,
      data_inicio  DATE        NOT NULL,
      data_fim     DATE,
      status       TEXT        NOT NULL DEFAULT 'rascunho',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

      CONSTRAINT chk_planejamento_status
        CHECK (status IN ('rascunho', 'confirmado', 'em_andamento', 'concluido')),
      CONSTRAINT chk_planejamento_datas
        CHECK (data_fim IS NULL OR data_fim >= data_inicio)
    );

    -- ─── Clientes do plano ───────────────────────────────────────────────────────
    CREATE TABLE planejamento_clientes (
      id               UUID  NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      planejamento_id  UUID  NOT NULL REFERENCES planejamentos_rota(id) ON DELETE CASCADE,
      codigo_cliente   INT   NOT NULL,
      cidade           TEXT,
      data_prevista    DATE,            -- NULL = na fila (pendente sem data)
      status           TEXT  NOT NULL DEFAULT 'pendente',
      agendamento_id   UUID  REFERENCES agendamentos(id) ON DELETE SET NULL,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

      CONSTRAINT chk_planejamento_cliente_status
        CHECK (status IN ('pendente', 'agendado', 'pulado')),
      CONSTRAINT uq_planejamento_cliente
        UNIQUE (planejamento_id, codigo_cliente)   -- cliente aparece uma vez por plano
    );

    -- ─── Índices ─────────────────────────────────────────────────────────────────
    -- Acessos mais frequentes do hook usePlanejamentoRota
    CREATE INDEX idx_planejamentos_vendedor_status
      ON planejamentos_rota (vendedor_id, status);

    CREATE INDEX idx_planejamentos_rota_periodo
      ON planejamentos_rota (vendedor_id, rota, data_inicio);

    CREATE INDEX idx_planejamento_clientes_plano
      ON planejamento_clientes (planejamento_id, status);

    CREATE INDEX idx_planejamento_clientes_pendentes
      ON planejamento_clientes (planejamento_id, data_prevista)
      WHERE status = 'pendente';

    -- ─── RLS ─────────────────────────────────────────────────────────────────────
    ALTER TABLE planejamentos_rota    ENABLE ROW LEVEL SECURITY;
    ALTER TABLE planejamento_clientes ENABLE ROW LEVEL SECURITY;

    -- planejamentos_rota
    CREATE POLICY "planejamentos_rota_vendedor_select"
      ON planejamentos_rota FOR SELECT
      USING (vendedor_id = auth.uid()
          OR get_user_cargo() IN ('gestor', 'diretor'));

    CREATE POLICY "planejamentos_rota_vendedor_insert"
      ON planejamentos_rota FOR INSERT
      WITH CHECK (vendedor_id = auth.uid());

    CREATE POLICY "planejamentos_rota_vendedor_update"
      ON planejamentos_rota FOR UPDATE
      USING (vendedor_id = auth.uid());

    CREATE POLICY "planejamentos_rota_vendedor_delete"
      ON planejamentos_rota FOR DELETE
      USING (vendedor_id = auth.uid());

    -- planejamento_clientes (acesso via plano do vendedor)
    CREATE POLICY "planejamento_clientes_vendedor_select"
      ON planejamento_clientes FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM planejamentos_rota pr
          WHERE pr.id = planejamento_id
            AND (pr.vendedor_id = auth.uid()
                 OR get_user_cargo() IN ('gestor', 'diretor'))
        )
      );

    CREATE POLICY "planejamento_clientes_vendedor_insert"
      ON planejamento_clientes FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM planejamentos_rota pr
          WHERE pr.id = planejamento_id
            AND pr.vendedor_id = auth.uid()
        )
      );

    CREATE POLICY "planejamento_clientes_vendedor_update"
      ON planejamento_clientes FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM planejamentos_rota pr
          WHERE pr.id = planejamento_id
            AND pr.vendedor_id = auth.uid()
        )
      );

    CREATE POLICY "planejamento_clientes_vendedor_delete"
      ON planejamento_clientes FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM planejamentos_rota pr
          WHERE pr.id = planejamento_id
            AND pr.vendedor_id = auth.uid()
        )
      );

    -- ─── Trigger updated_at ───────────────────────────────────────────────────────
    CREATE OR REPLACE FUNCTION fn_update_planejamento_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$;

    CREATE TRIGGER trg_planejamentos_rota_updated_at
      BEFORE UPDATE ON planejamentos_rota
      FOR EACH ROW EXECUTE FUNCTION fn_update_planejamento_updated_at();
    ```

- [ ] **Task 3 — Aplicar Migration** (AC: 7)
  - [ ] 3.1 Aplicar via Supabase MCP `apply_migration`
  - [ ] 3.2 Confirmar sucesso no log

- [ ] **Task 4 — Validar Pós-Aplicação** (AC: 1–6)
  - [ ] 4.1 Confirmar tabelas criadas:
    ```sql
    SELECT table_name FROM information_schema.tables
    WHERE table_name IN ('planejamentos_rota', 'planejamento_clientes');
    ```

  - [ ] 4.2 Confirmar CHECK constraints:
    ```sql
    SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid IN ('planejamentos_rota'::regclass, 'planejamento_clientes'::regclass)
      AND contype = 'c';
    ```

  - [ ] 4.3 Confirmar RLS ativo:
    ```sql
    SELECT relname, relrowsecurity
    FROM pg_class
    WHERE relname IN ('planejamentos_rota', 'planejamento_clientes');
    ```

  - [ ] 4.4 Confirmar índices:
    ```sql
    SELECT indexname FROM pg_indexes
    WHERE tablename IN ('planejamentos_rota', 'planejamento_clientes')
    ORDER BY tablename, indexname;
    ```

---

## Dev Notes

### Modelo de Dados — Decisões de Design

**Por que `data_fim` é nullable?**
O vendedor pode iniciar um plano sem definir quando termina — a data pode ser expandida durante o fluxo de overflow (FEAT-AG-010). O plano começa com `data_inicio` e `data_fim` é preenchida conforme o vendor distribui as cidades.

**Por que `UNIQUE (planejamento_id, codigo_cliente)`?**
Evita duplicatas silenciosas ao re-processar o lote. Um cliente pode aparecer em planos diferentes (semanas diferentes), mas apenas uma vez dentro do mesmo plano.

**Por que `agendamento_id` com `ON DELETE SET NULL`?**
Se o agendamento criado pelo plano for cancelado/deletado, o registro do `planejamento_clientes` volta para `status = 'agendado'` com `agendamento_id = NULL`. Isso permite detectar clientes cujo agendamento foi cancelado (reprocessar).

**Fluxo de status:**
```
planejamentos_rota:
  rascunho → confirmado → em_andamento → concluido

planejamento_clientes:
  pendente (sem data_prevista) → pendente (com data_prevista) → agendado
                                                              → pulado
```

**Classificação de clientes para o plano** (de `tabela_clientes.situacao`):
```
Auto (adimplentes):   A, E, S, V
Manual (toggle):      P (inadimplente), B (bloqueado)
Excluídos:            I (inativo), C (cancelado)
```

### Tabelas Relacionadas
- `profiles` — FK `vendedor_id`
- `agendamentos` — FK `agendamento_id` (preenchida ao confirmar o plano)
- `tabela_clientes` — JOIN para listar clientes por rota (não FK — relação por `codigo_cliente`)
- `vendedor_rotas` + `rotas_estado` — JOIN para descobrir clientes de uma rota

### Pré-requisito para
- FEAT-AG-010 — Frontend do planejamento de rota
- FEAT-AG-012 — Tabela de cobertura (lê `planejamento_clientes` para aderência)

---

## Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-05-28 | 1.0 | Story criada — DB foundation para planejamento de rota em lote | @sm (River) |

---

## Dev Agent Record
*(Preenchido por @data-engineer durante implementação)*

### Agent Model Used
*—*

### Completion Notes List
*—*

### File List
*—*
