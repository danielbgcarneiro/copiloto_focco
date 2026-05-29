# Schema — Módulo Agenda

> **Versão:** 1.0.0 | **Data:** 2026-05-28 | **Agente:** @architect (Aria) + @data-engineer
> **Projeto Supabase:** `krisjvemfpnkmduebqdr` (Copiloto_Focco)
> **Schema:** `public`

---

## Diagrama ER

```
┌─────────────────────┐         ┌─────────────────────────────────────┐
│      profiles        │         │            agendamentos              │
│─────────────────────│         │─────────────────────────────────────│
│ id UUID PK           │◄────────│ id UUID PK                          │
│ cod_vendedor INT     │   FK    │ vendedor_id UUID NOT NULL ──────►profiles│
│ nome_completo TEXT   │         │ codigo_cliente INT NOT NULL          │
│ cargo TEXT           │         │ data_agendada DATE NOT NULL          │
└─────────────────────┘         │ valor_previsto NUMERIC default 0     │
                                 │ status TEXT NOT NULL default'pendente'│
         ┌───────────────────────│ observacoes TEXT                     │
         │                       │ visita_id UUID ─────────────────────►│
         ▼                       │ created_at TIMESTAMPTZ               │
┌─────────────────────┐         │ updated_at TIMESTAMPTZ               │
│   tabela_clientes    │         └──────────────┬──────────────────────┘
│─────────────────────│                         │ FK (circular ⚠️)
│ codigo_cliente INT PK│◄───────────────────────┤
│ razao_social TEXT    │                         │
│ nome_fantasia TEXT   │         ┌───────────────▼──────────────────────┐
│ cidade TEXT          │         │              visitas                  │
│ cod_vendedor INT     │         │──────────────────────────────────────│
│ situacao TEXT        │◄────────│ id UUID PK                           │
└─────────────────────┘   FK    │ vendedor_id UUID NOT NULL             │
                                 │ codigo_cliente INT NOT NULL           │
                                 │ agendamento_id UUID ─────────────────►agendamentos│
                                 │ data_visita DATE NOT NULL             │
                                 │ resultado TEXT NOT NULL               │
                                 │ motivo_nao_venda_id INT ─────────────►│
                                 │ observacoes TEXT                      │
                                 │ origem TEXT default 'manual'          │
                                 │ ativo BOOLEAN default true            │
                                 │ valor_realizado NUMERIC               │
                                 │ valor_previsto_agendamento NUMERIC    │
                                 │ valor_confirmado_erp BOOLEAN          │
                                 │ pedido_cancelado BOOLEAN              │
                                 │ rfm_perfil_snapshot TEXT              │
                                 │ rfm_oportunidade_snapshot NUMERIC     │
                                 │ rfm_dsv_snapshot INT                  │
                                 │ [colunas analíticas — ver abaixo]    │
                                 │ cliente_inativado BOOLEAN             │
                                 │ inativado_em TIMESTAMPTZ              │
                                 │ created_at / updated_at TIMESTAMPTZ  │
                                 └──────────────┬───────────────────────┘
                                                 │ FK
                                 ┌───────────────▼──────────────────────┐
                                 │         motivos_nao_venda             │
                                 │──────────────────────────────────────│
                                 │ id INT PK (autoincrement)             │
                                 │ descricao TEXT NOT NULL               │
                                 │ codigo_canonico TEXT UNIQUE           │
                                 │ ativo BOOLEAN default true            │
                                 │ ordem INT default 0                   │
                                 └──────────────────────────────────────┘

┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│        configuracoes_agenda      │    │          vendedor_rotas          │
│─────────────────────────────────│    │─────────────────────────────────│
│ chave TEXT PK                    │    │ id UUID PK                      │
│ valor TEXT NOT NULL              │    │ vendedor_id UUID → profiles     │
│ descricao TEXT NOT NULL          │    │ rota TEXT NOT NULL              │
│ tipo TEXT default 'numero'       │    │ ativo BOOLEAN default true      │
│ valor_min NUMERIC                │    │ data_inicio DATE                │
│ valor_max NUMERIC                │    │ data_fim DATE                   │
│ editavel_gestor BOOLEAN          │    │ UNIQUE(vendedor_id, rota)       │
│ updated_at TIMESTAMPTZ           │    └───────────────┬─────────────────┘
└─────────────────────────────────┘                    │ JOIN
                                        ┌──────────────▼──────────────────┐
                                        │          rotas_estado            │
                                        │─────────────────────────────────│
                                        │ id BIGINT PK                    │
                                        │ rota TEXT                       │
                                        │ estado TEXT                     │
                                        │ codigo_ibge_uf FLOAT8 ⚠️        │
                                        │ codigo_ibge_cidade TEXT UNIQUE  │
                                        │ cidade TEXT                     │
                                        │ populacao BIGINT                │
                                        │ cod_vendedor INT                │
                                        │ vendedor_uuid UUID              │
                                        └─────────────────────────────────┘
```

---

## Tabelas Detalhadas

### `agendamentos`

Agenda de visitas planejadas por vendedores.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `vendedor_id` | `uuid` | NOT NULL | — | FK → `profiles.id` (auth user) |
| `codigo_cliente` | `integer` | NOT NULL | — | FK → `tabela_clientes.codigo_cliente` |
| `data_agendada` | `date` | NOT NULL | — | Data planejada da visita |
| `valor_previsto` | `numeric` | NULL | `0` | Valor esperado da venda |
| `status` | `text` | NOT NULL | `'pendente'` | `pendente` \| `realizado` \| `cancelado` \| `reagendado` ⚠️ sem CHECK |
| `observacoes` | `text` | NULL | — | Notas do agendamento |
| `visita_id` | `uuid` | NULL | — | FK → `visitas.id` (preenchido ao realizar) ⚠️ FK circular |
| `created_at` | `timestamptz` | NULL | `now()` | — |
| `updated_at` | `timestamptz` | NULL | `now()` | — |

**Índices:**

| Nome | Colunas | Tipo | Observação |
|------|---------|------|------------|
| `agendamentos_pkey` | `id` | PRIMARY UNIQUE | — |
| `idx_agendamentos_vendedor_data` | `(vendedor_id, data_agendada)` | BTREE | Índice principal |
| `idx_agendamentos_pendentes` | `(vendedor_id, data_agendada)` | BTREE | ⚠️ **DUPLICADO** — remover |
| `idx_agendamentos_cliente` | `(codigo_cliente)` | BTREE | — |

**Foreign Keys:**

| Constraint | De | Para | On Delete |
|------------|-----|------|-----------|
| `agendamentos_codigo_cliente_fkey` | `codigo_cliente` | `tabela_clientes.codigo_cliente` | RESTRICT |
| `fk_agendamentos_visita` | `visita_id` | `visitas.id` | NO ACTION |

**RLS Policies:**

| Policy | Operação | Regra |
|--------|----------|-------|
| `agendamentos_vendedor_select` | SELECT | `vendedor_id = auth.uid()` OR `get_user_cargo() IN ('gestor','diretor')` |
| `agendamentos_vendedor_insert` | INSERT | `vendedor_id = auth.uid()` |
| `agendamentos_vendedor_update` | UPDATE | `vendedor_id = auth.uid()` OR `get_user_cargo() IN ('gestor','diretor')` |
| *(ausente)* | DELETE | ⚠️ **Sem política** |

**RLS Enabled:** ✅ | **RLS Forced:** ❌ | **Registros:** 128

---

### `visitas`

Registro de visitas realizadas em campo, com resultado e snapshots RFM para auditoria.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `vendedor_id` | `uuid` | NOT NULL | — | Vendedor que realizou |
| `codigo_cliente` | `integer` | NOT NULL | — | FK → `tabela_clientes.codigo_cliente` |
| `agendamento_id` | `uuid` | NULL | — | FK → `agendamentos.id` (se havia agendamento) |
| `data_visita` | `date` | NOT NULL | — | Data da visita |
| `resultado` | `text` | NOT NULL | — | `vendeu` \| `nao_vendeu` \| `ausente` \| `reagendou` ⚠️ sem CHECK |
| `motivo_nao_venda_id` | `integer` | NULL | — | FK → `motivos_nao_venda.id` |
| `observacoes` | `text` | NULL | — | Notas do vendedor |
| `origem` | `text` | NOT NULL | `'manual'` | `manual` \| `automatica_venda` |
| `ativo` | `boolean` | NOT NULL | `true` | Soft delete |
| `valor_realizado` | `numeric` | NULL | — | Valor do pedido gerado |
| `valor_previsto_agendamento` | `numeric` | NULL | — | Valor previsto copiado do agendamento |
| `valor_confirmado_erp` | `boolean` | NULL | `false` | Se pedido foi confirmado no ERP |
| `pedido_cancelado` | `boolean` | NULL | `false` | Se pedido foi cancelado |
| `rfm_perfil_snapshot` | `text` | NULL | — | Perfil RFM no momento da visita (auditoria) |
| `rfm_oportunidade_snapshot` | `numeric` | NULL | — | Oportunidade RFM no momento |
| `rfm_dsv_snapshot` | `integer` | NULL | — | DSV no momento |
| `intervalo_desde_ultima_visita_dias` | `integer` | NULL | — | ⚠️ Campo analítico — não populado pelo frontend |
| `resultado_ultima_visita` | `text` | NULL | — | ⚠️ Campo analítico — não populado pelo frontend |
| `motivo_ultima_nao_venda` | `text` | NULL | — | ⚠️ Campo analítico — não populado pelo frontend |
| `num_visitas_90d` | `integer` | NULL | `0` | ⚠️ Campo analítico — não populado pelo frontend |
| `num_visitas_180d` | `integer` | NULL | `0` | ⚠️ Campo analítico — não populado pelo frontend |
| `num_visitas_360d` | `integer` | NULL | `0` | ⚠️ Campo analítico — não populado pelo frontend |
| `dia_semana` | `smallint` | NULL | — | ⚠️ Campo analítico — não populado pelo frontend |
| `semana_do_mes` | `smallint` | NULL | — | ⚠️ Campo analítico — não populado pelo frontend |
| `mes_do_ano` | `smallint` | NULL | — | ⚠️ Campo analítico — não populado pelo frontend |
| `cliente_inativado` | `boolean` | NULL | `false` | Se cliente foi marcado como inativo via gestor |
| `inativado_em` | `timestamptz` | NULL | — | Quando foi inativado |
| `created_at` | `timestamptz` | NULL | `now()` | — |
| `updated_at` | `timestamptz` | NULL | `now()` | — |

> **Nota:** Os campos analíticos (colunas `dia_semana`, `semana_do_mes`, `mes_do_ano`, `num_visitas_*`, `intervalo_*`, `resultado_ultima_visita`, `motivo_ultima_nao_venda`) parecem ser destinados a serem populados por um trigger de banco de dados ou ETL externo. Verificar existência de trigger `trg_visitas_after_insert`.

**Índices:**

| Nome | Colunas | Tipo |
|------|---------|------|
| `visitas_pkey` | `id` | PRIMARY UNIQUE |
| `idx_visitas_ativas` | `(vendedor_id, data_visita)` | BTREE |
| `idx_visitas_vendedor_data` | `(vendedor_id, data_visita)` | BTREE |
| `idx_visitas_agendamento` | `(agendamento_id)` | BTREE |
| *(ausente)* | `(codigo_cliente, data_visita)` | — | ⚠️ **Faltando** — necessário para `calcularSugestaoData()` |

**Foreign Keys:**

| Constraint | De | Para | On Delete |
|------------|-----|------|-----------|
| `visitas_codigo_cliente_fkey` | `codigo_cliente` | `tabela_clientes.codigo_cliente` | RESTRICT |
| `visitas_agendamento_id_fkey` | `agendamento_id` | `agendamentos.id` | NO ACTION |
| `visitas_motivo_nao_venda_id_fkey` | `motivo_nao_venda_id` | `motivos_nao_venda.id` | NO ACTION |

**RLS Policies:**

| Policy | Operação | Regra |
|--------|----------|-------|
| `visitas_vendedor_select` | SELECT | `vendedor_id = auth.uid()` OR `get_user_cargo() IN ('gestor','diretor')` |
| `visitas_vendedor_insert` | INSERT | `vendedor_id = auth.uid()` |
| `visitas_vendedor_update` | UPDATE | `vendedor_id = auth.uid()` OR `get_user_cargo() IN ('gestor','diretor')` |
| *(ausente)* | DELETE | ⚠️ **Sem política** |

**RLS Enabled:** ✅ | **Registros:** 222

---

### `motivos_nao_venda`

Catálogo de motivos para visitas onde o vendedor não realizou venda.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | `integer` | NOT NULL | `nextval(seq)` | PK autoincrement |
| `descricao` | `text` | NOT NULL | — | Texto exibido ao vendedor |
| `codigo_canonico` | `text` | NOT NULL UNIQUE | — | Identificador técnico (ex: `ENCERROU_ATIVIDADES`) |
| `ativo` | `boolean` | NOT NULL | `true` | Soft delete |
| `ordem` | `integer` | NOT NULL | `0` | Ordem de exibição no dropdown |
| `created_at` | `timestamptz` | NULL | `now()` | — |

**Índices:**
- `motivos_nao_venda_pkey` — `id` (PRIMARY)
- `motivos_nao_venda_codigo_canonico_key` — `codigo_canonico` (UNIQUE)

**RLS Policies:**

| Policy | Operação | Regra |
|--------|----------|-------|
| `motivos_select_all` | SELECT | `true` (todos autenticados) |
| `motivos_write_gestor` | ALL (write) | `get_user_cargo() IN ('gestor','diretor')` |

**RLS Enabled:** ✅ | **Registros:** 10

---

### `configuracoes_agenda`

Parâmetros de comportamento do módulo, editáveis via interface de gestão.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `chave` | `text` | NOT NULL | — | PK — Identificador da configuração |
| `valor` | `text` | NOT NULL | — | Valor atual (sempre string, parseado no código) |
| `descricao` | `text` | NOT NULL | — | Descrição legível |
| `tipo` | `text` | NOT NULL | `'numero'` | Tipo de dado (`numero`, `booleano`, etc.) |
| `valor_min` | `numeric` | NULL | — | Limite mínimo permitido |
| `valor_max` | `numeric` | NULL | — | Limite máximo permitido |
| `editavel_gestor` | `boolean` | NOT NULL | `true` | Se gestor pode editar (diretor sempre pode) |
| `updated_at` | `timestamptz` | NULL | `now()` | — |

**Registros atuais (6 entradas):**

| chave | valor | editavel_gestor |
|-------|-------|-----------------|
| `prazo_alerta_amarelo_dias` | `60` | ✅ |
| `prazo_alerta_vermelho_dias` | `90` | ✅ |
| `threshold_forecast_risco_pct` | `40` | ✅ |
| `score_peso_oportunidade` | `0.5` | ❌ |
| `score_peso_dsv` | `0.3` | ❌ |
| `score_peso_historico` | `0.2` | ❌ |

**RLS Policies:**

| Policy | Operação | Regra |
|--------|----------|-------|
| `config_select_vendedor` | SELECT | `true` (todos autenticados) |
| `config_update_gestor` | UPDATE | `(cargo='gestor' AND editavel_gestor=true)` OR `cargo='diretor'` |
| `config_insert_diretor` | INSERT | `get_user_cargo() = 'diretor'` |
| *(ausente)* | DELETE | ⚠️ **Sem política** |

**RLS Enabled:** ✅

---

### `vendedor_rotas`

Mapeamento de vendedores para suas rotas de atuação geográfica.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `vendedor_id` | `uuid` | ⚠️ NULL | — | FK → `profiles.id` (deveria ser NOT NULL) |
| `rota` | `text` | NOT NULL | — | Identificador da rota |
| `ativo` | `boolean` | NULL | `true` | Se rota está ativa para este vendedor |
| `data_inicio` | `date` | NULL | `CURRENT_DATE` | Início da vigência |
| `data_fim` | `date` | NULL | — | Fim da vigência (NULL = sem fim) |
| `created_at` | `timestamptz` | NULL | `now()` | — |
| `updated_at` | `timestamptz` | NULL | `now()` | — |

**Índices:**

| Nome | Colunas | Tipo |
|------|---------|------|
| `vendedor_rotas_pkey` | `id` | PRIMARY UNIQUE |
| `idx_vendedor_rotas_unique_ativa` | `(vendedor_id, rota)` | UNIQUE |
| `idx_vendedor_rotas_vendedor` | `vendedor_id` | BTREE |
| `idx_vendedor_rotas_rota` | `rota` | BTREE |
| `idx_vendedor_rotas_ativo` | `ativo` | BTREE |

**Foreign Keys:**
- `vendedor_rotas_vendedor_id_fkey`: `vendedor_id → profiles.id` (CASCADE DELETE)

**RLS Policies:**

| Policy | Operação | Regra |
|--------|----------|-------|
| `vendedor_acessa_proprias_rotas` | SELECT | `vendedor_id = auth.uid()` |
| `vendedor_rotas_select` | SELECT | `vendedor_id = auth.uid()` OR `cargo IN ('gestor','diretor')` |
| `vendedor_rotas_admin` | ALL | `cargo = 'diretor'` |

> ⚠️ **Duas políticas SELECT sobrepostas** — `vendedor_acessa_proprias_rotas` é subconjunto de `vendedor_rotas_select`. Consolidar em uma.

**RLS Enabled:** ✅ | **Registros:** 65

---

### `rotas_estado`

Catálogo geográfico de cidades com mapeamento para rotas comerciais.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | `bigint` | NOT NULL | `nextval(seq)` | PK |
| `estado` | `text` | NULL | — | Nome do estado |
| `codigo_ibge_uf` | `double precision` | NULL | — | ⚠️ Deveria ser `integer` |
| `codigo_ibge_cidade` | `text` | NULL UNIQUE | — | Código IBGE da cidade |
| `cidade` | `text` | NULL | — | Nome da cidade |
| `populacao` | `bigint` | NULL | — | População |
| `microrregiao` | `bigint` | NULL | — | Código de microrregião IBGE |
| `num_oticas` | `bigint` | NULL | — | Qtd de óticas cadastradas |
| `meta_n_oticas` | `bigint` | NULL | — | Meta de óticas |
| `rota` | `text` | NULL | — | Rota comercial |
| `ordem` | `integer` | NULL | — | Ordem de atendimento |
| `cod_vendedor` | `integer` | NULL | — | Vendedor responsável (cod numérico) |
| `vendedor_uuid` | `uuid` | NULL | — | Vendedor responsável (UUID) |

**Índices:**

| Nome | Colunas |
|------|---------|
| `rotas_estado_pkey` | `id` |
| `rotas_estado_codigo_ibge_cidade_key` | `codigo_ibge_cidade` (UNIQUE) |
| `idx_rotas_estado_rota` | `rota` |
| `idx_rotas_estado_cidade` | `cidade` |
| `idx_rotas_estado_estado` | `estado` |
| `idx_rotas_estado_cod_vendedor` | `cod_vendedor` |
| `idx_rotas_estado_vendedor_uuid` | `vendedor_uuid` |

**RLS Enabled:** ✅ | **Registros:** 5.570

---

## Script de Correções Prioritárias

```sql
-- ============================================================
-- CORREÇÕES PRIORITÁRIAS — Módulo Agenda
-- Gerado por @architect (Aria) — 2026-05-28
-- ============================================================

-- BUG-AG-001: Remover índice duplicado
DROP INDEX IF EXISTS idx_agendamentos_pendentes;

-- BUG-AG-003: Adicionar políticas DELETE ausentes
CREATE POLICY "agendamentos_vendedor_delete" ON agendamentos
  FOR DELETE USING (vendedor_id = auth.uid());

CREATE POLICY "visitas_vendedor_delete" ON visitas
  FOR DELETE USING (vendedor_id = auth.uid());

-- BUG-AG-004: Adicionar CHECK constraints em campos enum
ALTER TABLE agendamentos
  ADD CONSTRAINT chk_agendamentos_status
  CHECK (status IN ('pendente', 'realizado', 'cancelado', 'reagendado'));

ALTER TABLE visitas
  ADD CONSTRAINT chk_visitas_resultado
  CHECK (resultado IN ('vendeu', 'nao_vendeu', 'ausente', 'reagendou'));

-- BUG-AG-008: Corrigir tipo de codigo_ibge_uf
ALTER TABLE rotas_estado
  ALTER COLUMN codigo_ibge_uf TYPE integer
  USING codigo_ibge_uf::integer;

-- BUG-AG-009: Tornar vendedor_id NOT NULL em vendedor_rotas
ALTER TABLE vendedor_rotas
  ALTER COLUMN vendedor_id SET NOT NULL;

-- PERF-AG-001: Índice missing em visitas por cliente
CREATE INDEX idx_visitas_cliente_data
  ON visitas(codigo_cliente, data_visita DESC);

-- ============================================================
-- VERIFICAÇÃO: Triggers em visitas (campos analíticos)
-- ============================================================
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'visitas'
  AND trigger_schema = 'public';
```

---

## Consultas de Referência

### Agendamentos pendentes desta semana (por vendedor)
```sql
SELECT a.*, c.razao_social, c.cidade, r.perfil, r.dias_sem_comprar
FROM agendamentos a
JOIN tabela_clientes c ON c.codigo_cliente = a.codigo_cliente
LEFT JOIN LATERAL (
  SELECT perfil, dias_sem_comprar, previsao_pedido
  FROM analise_rfm
  WHERE codigo_cliente = a.codigo_cliente
  ORDER BY data_analise DESC
  LIMIT 1
) r ON true
WHERE a.vendedor_id = auth.uid()
  AND a.status = 'pendente'
  AND a.data_agendada BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 days'
ORDER BY r.dias_sem_comprar DESC NULLS LAST;
```

### Histórico de visitas de um cliente (para sugestão de data)
```sql
SELECT data_visita, resultado, valor_realizado
FROM visitas
WHERE codigo_cliente = $codigo
  AND ativo = true
ORDER BY data_visita DESC
LIMIT 5;
```

### KPIs de visita por vendedor no mês
```sql
SELECT
  COUNT(*) FILTER (WHERE resultado = 'vendeu') AS vendas,
  COUNT(*) FILTER (WHERE resultado = 'nao_vendeu') AS nao_vendeu,
  COUNT(*) FILTER (WHERE resultado = 'ausente') AS ausentes,
  COUNT(*) AS total,
  SUM(valor_realizado) AS total_realizado,
  ROUND(COUNT(*) FILTER (WHERE resultado = 'vendeu')::numeric / COUNT(*) * 100, 1) AS taxa_conversao
FROM visitas
WHERE vendedor_id = $vendedor_id
  AND data_visita BETWEEN DATE_TRUNC('month', CURRENT_DATE) AND CURRENT_DATE
  AND ativo = true;
```

---

*Schema documentado por @architect (Aria) | Synkra AIOS v1.0.0*
*Fonte: Supabase projeto krisjvemfpnkmduebqdr — 2026-05-28*
