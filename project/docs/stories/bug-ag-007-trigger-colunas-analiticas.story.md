# Story BUG-AG-007 — Investigar e Criar Trigger para Colunas Analíticas em `visitas`

## Status
Won't Do — Trigger Já Existe e Funciona Corretamente

## Executor Assignment
```
executor: "@data-engineer"
quality_gate: "@dev"
quality_gate_tools: [supabase-cli, sql-review]
```

## Story
**As a** gestor do Copiloto,  
**I want** que as colunas analíticas da tabela `visitas` sejam populadas automaticamente ao registrar uma visita,  
**so that** relatórios e análises de performance de visitas (frequência, dia da semana, intervalo entre visitas) usem dados reais em vez de sempre `NULL`.

---

## Acceptance Criteria

1. A existência (ou ausência) de trigger em `visitas` é confirmada via query no banco
2. Se trigger existir mas estiver com bug: o bug é identificado e corrigido
3. Se trigger não existir: um trigger `AFTER INSERT OR UPDATE ON visitas` é criado que popula:
   - `dia_semana` — dia da semana da `data_visita` (0=dom, 1=seg ... 6=sab)
   - `semana_do_mes` — semana do mês da `data_visita` (1-5)
   - `mes_do_ano` — mês do ano da `data_visita` (1-12)
   - `intervalo_desde_ultima_visita_dias` — dias desde a visita anterior ao mesmo `codigo_cliente` e `vendedor_id`
   - `resultado_ultima_visita` — resultado da visita anterior (para contexto)
   - `motivo_ultima_nao_venda` — motivo da última não-venda anterior (se houver)
   - `num_visitas_90d` — contagem de visitas ativas ao mesmo cliente nos últimos 90 dias
   - `num_visitas_180d` — contagem nos últimos 180 dias
   - `num_visitas_360d` — contagem nos últimos 360 dias
4. Após aplicação, INSERT de nova visita popula todas as 9 colunas analíticas corretamente
5. Registros existentes com `NULL` nessas colunas têm a opção de ser reprocessados via script
6. Migration aplicada sem erros

---

## 🤖 CodeRabbit Integration

### Story Type Analysis
- **Primary Type**: Database — Triggers, Data Integrity
- **Secondary Type(s)**: Analytics, Performance
- **Complexity**: Medium-High (trigger com sub-queries correlacionadas; requer cuidado com performance)

### Specialized Agent Assignment
**Primary Agents:**
- @data-engineer: Investiga trigger existente, cria ou corrige, aplica migration

**Supporting Agents:**
- @dev: Valida que o frontend não depende de nenhuma dessas colunas para operação crítica (elas devem ser apenas para analytics)
- @architect: Revisa a lógica do trigger para garantir que não causa problemas de performance com `AFTER INSERT OR UPDATE`

### Quality Gate Tasks
- [ ] Pre-execution: Confirmar ausência de trigger via `pg_trigger` e `pg_proc`
- [ ] Pre-execution: Confirmar que colunas analíticas estão todas NULL nos registros existentes
- [ ] Post-execution: INSERT de visita de teste → confirmar que colunas são populadas
- [ ] Post-execution: EXPLAIN ANALYZE do trigger function para confirmar performance aceitável

### Self-Healing Configuration
- **Primary Agent**: @data-engineer (check mode)
- **Max Iterations**: 2
- **Severity Filter**: HIGH+
- **Predicted Behavior**: Trigger causando performance degradation → HALT + report ao usuário

### CodeRabbit Focus Areas
**Primary Focus:**
- Verificar que sub-queries no trigger usam índices existentes (evitar Sequential Scan por insert)
- Confirmar que o trigger não causa recursão (UPDATE dentro de trigger AFTER UPDATE na mesma tabela)

**Secondary Focus:**
- Verificar se há dados corrompidos que impossibilitariam o backfill

---

## Tasks / Subtasks

- [ ] **Task 1 — Investigação: Confirmar Ausência de Trigger** (AC: 1)
  - [ ] 1.1 Verificar triggers existentes na tabela `visitas`:
    ```sql
    SELECT trigger_name, event_manipulation, action_timing, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'visitas'
    ORDER BY trigger_name;
    ```
    **Resultado esperado:** Zero linhas (sem triggers). Se encontrar trigger, prosseguir para Task 1.2.

  - [ ] 1.2 Se trigger existir, inspecionar o corpo da função trigger:
    ```sql
    SELECT proname, prosrc
    FROM pg_proc
    WHERE proname LIKE '%visita%'
      AND prokind = 'f';
    ```
    Analisar se a função popula todas as 9 colunas listadas em AC-3.

  - [ ] 1.3 Confirmar que todas as 9 colunas analíticas estão NULL nos registros existentes:
    ```sql
    SELECT 
      COUNT(*) as total,
      COUNT(dia_semana) as com_dia_semana,
      COUNT(semana_do_mes) as com_semana_mes,
      COUNT(mes_do_ano) as com_mes_ano,
      COUNT(intervalo_desde_ultima_visita_dias) as com_intervalo,
      COUNT(resultado_ultima_visita) as com_resultado_ultima,
      COUNT(motivo_ultima_nao_venda) as com_motivo_ultima,
      COUNT(num_visitas_90d) as com_visitas_90d,
      COUNT(num_visitas_180d) as com_visitas_180d,
      COUNT(num_visitas_360d) as com_visitas_360d
    FROM visitas;
    ```
    **Resultado esperado:** `com_*` = 0 em todas as colunas analíticas (todos NULL).

- [ ] **Task 2 — Verificar Impacto no Frontend** (AC: 1 — pré-requisito antes de criar trigger)
  - [ ] 2.1 Confirmar que nenhuma query do frontend depende das colunas analíticas para operação:
    ```bash
    grep -rn "dia_semana\|semana_do_mes\|mes_do_ano\|num_visitas_\|intervalo_desde\|resultado_ultima_visita\|motivo_ultima_nao_venda" src/
    ```
    **Resultado esperado:** Zero ocorrências — essas colunas não são consumidas pelo frontend atual.

  - [ ] 2.2 Confirmar que as queries de INSERT em `visitas` (`useVisitas.ts`) não passam valores para essas colunas:
    ```bash
    grep -n "from('visitas').insert" src/hooks/useVisitas.ts
    ```
    Verificar objeto de INSERT — colunas analíticas devem estar ausentes (populadas pelo trigger).

- [ ] **Task 3 — Preparar Função e Trigger** (AC: 3, 6)
  - [ ] 3.1 Criar `supabase/migrations/20260528_create_trigger_visitas_analiticas.sql`:

    ```sql
    -- BUG-AG-007: Criar trigger para popular colunas analíticas em visitas
    -- Dispara AFTER INSERT OR UPDATE OF data_visita, resultado, motivo_nao_venda_id
    -- Usa SECURITY DEFINER para acessar dados sem restrição de RLS

    CREATE OR REPLACE FUNCTION fn_populate_visita_analitica()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_ultima RECORD;
    BEGIN
      -- Campos temporais da visita atual
      NEW.dia_semana      := EXTRACT(DOW FROM NEW.data_visita)::smallint;
      NEW.mes_do_ano      := EXTRACT(MONTH FROM NEW.data_visita)::smallint;
      NEW.semana_do_mes   := CEIL(EXTRACT(DAY FROM NEW.data_visita) / 7.0)::smallint;

      -- Buscar visita anterior do mesmo vendedor ao mesmo cliente
      SELECT resultado, motivo_ultima_nao_venda, data_visita
      INTO v_ultima
      FROM visitas
      WHERE vendedor_id = NEW.vendedor_id
        AND codigo_cliente = NEW.codigo_cliente
        AND id <> NEW.id
        AND ativo = true
      ORDER BY data_visita DESC
      LIMIT 1;

      IF FOUND THEN
        NEW.intervalo_desde_ultima_visita_dias :=
          (NEW.data_visita - v_ultima.data_visita)::integer;
        NEW.resultado_ultima_visita    := v_ultima.resultado;
        NEW.motivo_ultima_nao_venda    := v_ultima.motivo_ultima_nao_venda;
      ELSE
        NEW.intervalo_desde_ultima_visita_dias := NULL;
        NEW.resultado_ultima_visita            := NULL;
        NEW.motivo_ultima_nao_venda            := NULL;
      END IF;

      -- Contagens de frequência de visitas ativas
      SELECT
        COUNT(*) FILTER (WHERE data_visita >= NEW.data_visita - INTERVAL '90 days'),
        COUNT(*) FILTER (WHERE data_visita >= NEW.data_visita - INTERVAL '180 days'),
        COUNT(*) FILTER (WHERE data_visita >= NEW.data_visita - INTERVAL '360 days')
      INTO
        NEW.num_visitas_90d,
        NEW.num_visitas_180d,
        NEW.num_visitas_360d
      FROM visitas
      WHERE vendedor_id = NEW.vendedor_id
        AND codigo_cliente = NEW.codigo_cliente
        AND id <> NEW.id
        AND ativo = true;

      RETURN NEW;
    END;
    $$;

    -- Trigger BEFORE INSERT OR UPDATE (BEFORE para poder modificar NEW)
    DROP TRIGGER IF EXISTS trg_visitas_analitica ON visitas;

    CREATE TRIGGER trg_visitas_analitica
      BEFORE INSERT OR UPDATE OF data_visita, resultado, motivo_nao_venda_id
      ON visitas
      FOR EACH ROW
      EXECUTE FUNCTION fn_populate_visita_analitica();
    ```

    > **Nota Crítica:** Usar `BEFORE` (não `AFTER`) para poder modificar `NEW` diretamente sem UPDATE adicional, evitando recursão.

  - [ ] 3.2 Revisão com @architect: confirmar que sub-queries no trigger usam `idx_visitas_vendedor_data` (que já existe) — EXPLAIN na sub-query de busca de visita anterior.

- [ ] **Task 4 — Script de Backfill dos Registros Existentes** (AC: 5)
  - [ ] 4.1 Após criar o trigger, criar script SQL para reprocessar registros existentes (executar com cautela, preferencialmente fora do horário de pico):
    ```sql
    -- Backfill: reprocessar todos os registros existentes via UPDATE
    -- O trigger BEFORE UPDATE será disparado para cada linha
    -- ATENÇÃO: Esta operação atualiza 222 registros — confirmar com usuário antes de executar
    UPDATE visitas
    SET updated_at = now()
    WHERE ativo = true;
    ```
    > **Nota:** Este script não está incluído na migration principal — executar separadamente após validação.

- [ ] **Task 5 — Aplicar Migration** (AC: 6)
  - [ ] 5.1 Aplicar via Supabase MCP `apply_migration`
  - [ ] 5.2 Verificar no log se aplicou sem erro

- [ ] **Task 6 — Validar Pós-Aplicação** (AC: 3, 4)
  - [ ] 6.1 Confirmar trigger criado:
    ```sql
    SELECT trigger_name, event_manipulation, action_timing
    FROM information_schema.triggers
    WHERE event_object_table = 'visitas';
    ```
    **Resultado esperado:** 1 linha — `trg_visitas_analitica`, `INSERT` e `UPDATE`, `BEFORE`.

  - [ ] 6.2 Testar com INSERT de visita (usar dados reais existentes no banco):
    ```sql
    -- Inserir visita de teste (usar vendedor_id e codigo_cliente reais)
    INSERT INTO visitas (vendedor_id, codigo_cliente, data_visita, resultado, origem)
    VALUES (
      'UUID-DE-VENDEDOR-REAL',
      CODIGO-CLIENTE-REAL,
      CURRENT_DATE,
      'nao_vendeu',
      'manual'
    )
    RETURNING dia_semana, semana_do_mes, mes_do_ano,
              intervalo_desde_ultima_visita_dias,
              num_visitas_90d, num_visitas_180d, num_visitas_360d;
    ```
    **Resultado esperado:** Todas as colunas analíticas preenchidas (não NULL).

  - [ ] 6.3 Limpar registro de teste:
    ```sql
    DELETE FROM visitas WHERE origem = 'manual' AND created_at > now() - INTERVAL '5 minutes';
    ```

---

## Dev Notes

### Contexto do Bug
A tabela `visitas` tem 9 colunas que parecem destinadas a análise de padrões de visita:

```
dia_semana                      smallint  — ⚠️ NULL em todos os 222 registros
semana_do_mes                   smallint  — ⚠️ NULL
mes_do_ano                      smallint  — ⚠️ NULL
intervalo_desde_ultima_visita_dias integer  — ⚠️ NULL
resultado_ultima_visita         text      — ⚠️ NULL
motivo_ultima_nao_venda         text      — ⚠️ NULL
num_visitas_90d                 integer   — ⚠️ NULL (default 0, mas NULL na prática)
num_visitas_180d                integer   — ⚠️ NULL
num_visitas_360d                integer   — ⚠️ NULL
```

O frontend (`useVisitas.ts`) nunca popula essas colunas ao fazer INSERT. A arquitetura sugere que deveriam ser populadas por um trigger de banco de dados, mas nenhum trigger foi encontrado na investigação inicial. Sem esses dados, qualquer relatório ou funcionalidade futura de análise de frequência de visitas terá dados históricos perdidos.

### Decisão de Design: BEFORE vs AFTER Trigger
- **BEFORE:** Permite modificar `NEW` diretamente. Evita UPDATE adicional na mesma linha (que causaria recursão se o trigger fosse `AFTER UPDATE`).
- **AFTER:** Seria necessário fazer `UPDATE visitas SET ... WHERE id = NEW.id`, que dispararia o trigger novamente → recursão infinita.
- **Escolha:** `BEFORE INSERT OR UPDATE` é o padrão correto.

### Performance do Trigger
O trigger executa 2 sub-queries por INSERT/UPDATE:
1. Busca visita anterior: usa `idx_visitas_vendedor_data` (já existente) + filtro `codigo_cliente`
   - ⚠️ Após BUG-AG-004, `idx_visitas_cliente_data` melhorará essa query
2. Contagem de frequência: varredura das visitas do mesmo vendedor/cliente

Com 222 registros atuais, performance não é problema. Monitorar quando tabela crescer para 10k+ registros.

### Referências de Código
- `src/hooks/useVisitas.ts` — INSERT atual sem colunas analíticas (linhas ~80-110)
- `docs/architecture/schema-agenda.md` — definição completa das colunas analíticas

---

## Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-05-28 | 1.0 | Story criada — BUG-AG-007 identificado em mapeamento brownfield | @sm (River) |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List
- **BUG INVÁLIDO:** O trigger `trg_auto_populate_snapshots` (BEFORE INSERT) já existe e popula todas as 9 colunas analíticas.
- A função `auto_populate_visita_snapshots()` implementa exatamente o que a story propunha:
  - `dia_semana`, `mes_do_ano`, `semana_do_mes` via `EXTRACT` de `data_visita`
  - `rfm_perfil_snapshot`, `rfm_oportunidade_snapshot`, `rfm_dsv_snapshot` via JOIN em `analise_rfm`
  - `intervalo_desde_ultima_visita_dias`, `resultado_ultima_visita`, `motivo_ultima_nao_venda` via última visita anterior
  - `num_visitas_90d`, `num_visitas_180d`, `num_visitas_360d` via contagens com FILTER
- Dados confirmados: 222/222 registros com `dia_semana`, `mes_do_ano`, `semana_do_mes`, `num_visitas_*` populados.
- `intervalo_desde_ultima_visita_dias` com 26/222 é correto — NULL para primeira visita por cliente/vendedor (sem histórico anterior).
- A documentação estava desatualizada, não o banco.

### File List
*(nenhum arquivo modificado)*
