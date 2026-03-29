-- ============================================================
-- Epic 3 — Migration 001: Foundation Tables
-- Story 3.1 — Módulo Agenda do Representante
-- ============================================================

-- ============================================================
-- FASE 1: Tabelas auxiliares
-- ============================================================

-- 1.1 motivos_nao_venda
CREATE TABLE IF NOT EXISTS motivos_nao_venda (
  id              SERIAL PRIMARY KEY,
  descricao       TEXT NOT NULL,
  codigo_canonico TEXT NOT NULL UNIQUE,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  ordem           INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  motivos_nao_venda IS 'Motivos de não-venda configuráveis pelo gestor. codigo_canonico é imutável após INSERT.';
COMMENT ON COLUMN motivos_nao_venda.codigo_canonico IS 'Identificador canônico imutável. Gerado no frontend via gerarCodigoCanonico().';

-- 1.2 Seed inicial
INSERT INTO motivos_nao_venda (descricao, codigo_canonico, ordem) VALUES
  ('Ausente',              'AUSENTE',              1),
  ('Sem interesse',        'SEM_INTERESSE',         2),
  ('Inadimplência',        'INADIMPLENCIA',         3),
  ('Estoque cheio',        'ESTOQUE_CHEIO',         4),
  ('Aguardando promoção',  'AGUARDANDO_PROMOCAO',   5),
  ('Concorrência',         'CONCORRENCIA',          6),
  ('Encerrou atividades',  'ENCERROU_ATIVIDADES',   7),
  ('Proprietário ausente', 'PROPRIETARIO_AUSENTE',  8),
  ('Reagendou',            'REAGENDOU',             9),
  ('Outro',                'OUTRO',                10)
ON CONFLICT (codigo_canonico) DO NOTHING;

-- Trigger: impede UPDATE em codigo_canonico
CREATE OR REPLACE FUNCTION enforce_motivo_canonico_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo_canonico IS DISTINCT FROM OLD.codigo_canonico THEN
    RAISE EXCEPTION 'codigo_canonico é imutável após criação';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_motivo_canonico_immutable ON motivos_nao_venda;
CREATE TRIGGER trg_motivo_canonico_immutable
  BEFORE UPDATE ON motivos_nao_venda
  FOR EACH ROW
  WHEN (OLD.codigo_canonico IS DISTINCT FROM NEW.codigo_canonico)
  EXECUTE FUNCTION enforce_motivo_canonico_immutability();

-- ============================================================
-- 1.3 telefones_clientes
CREATE TABLE IF NOT EXISTS telefones_clientes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_cliente      INTEGER NOT NULL REFERENCES tabela_clientes(codigo_cliente) ON DELETE RESTRICT,
  numero              TEXT NOT NULL,
  tipo                TEXT NOT NULL DEFAULT 'celular' CHECK (tipo IN ('celular','fixo','whatsapp','outro')),
  descricao           TEXT,
  whatsapp_habilitado BOOLEAN NOT NULL DEFAULT FALSE,
  adicionado_por      UUID NOT NULL REFERENCES auth.users(id),
  ativo               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telefones_cliente ON telefones_clientes(codigo_cliente) WHERE ativo = TRUE;
COMMENT ON TABLE telefones_clientes IS 'Múltiplos contatos telefônicos por cliente, adicionados pelos representantes.';

-- ============================================================
-- 1.4 configuracoes_agenda
CREATE TABLE IF NOT EXISTS configuracoes_agenda (
  chave           TEXT PRIMARY KEY,
  valor           TEXT NOT NULL,
  descricao       TEXT NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'numero' CHECK (tipo IN ('numero','texto','booleano')),
  valor_min       NUMERIC,
  valor_max       NUMERIC,
  editavel_gestor BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE configuracoes_agenda IS 'Parâmetros operacionais da agenda, editáveis pelo gestor sem deploy.';

-- 1.5 Seed de configuracoes_agenda
INSERT INTO configuracoes_agenda (chave, valor, descricao, tipo, valor_min, valor_max, editavel_gestor) VALUES
  ('prazo_alerta_amarelo_dias',      '60', 'Dias sem comprar para badge amarelo de alerta',       'numero', 1,  365, TRUE),
  ('prazo_alerta_vermelho_dias',     '90', 'Dias sem comprar para badge vermelho de alerta',      'numero', 1,  365, TRUE),
  ('janela_retroativa_vendas_dias',  '60', 'Dias retroativos para auto-populate de visitas ERP',  'numero', 7,  180, FALSE),
  ('threshold_forecast_risco_pct',   '40', 'Percentual da meta abaixo do qual aciona alerta',     'numero', 1,  99,  TRUE),
  ('max_visitas_dia',                '15', 'Máximo de visitas que o rep pode agendar por dia',    'numero', 1,  50,  TRUE),
  ('intervalo_sugestao_visita_dias', '30', 'Intervalo padrão sugerido entre visitas ao cliente',  'numero', 7,  180, TRUE)
ON CONFLICT (chave) DO NOTHING;

-- Trigger: valida valor_min/max
CREATE OR REPLACE FUNCTION enforce_configuracoes_limits()
RETURNS TRIGGER AS $$
DECLARE v_num NUMERIC;
BEGIN
  IF NEW.tipo = 'numero' THEN
    BEGIN
      v_num := NEW.valor::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Valor "%" não é numérico para a configuração "%"', NEW.valor, NEW.chave;
    END;
    IF NEW.valor_min IS NOT NULL AND v_num < NEW.valor_min THEN
      RAISE EXCEPTION 'Valor % abaixo do mínimo % para "%"', v_num, NEW.valor_min, NEW.chave;
    END IF;
    IF NEW.valor_max IS NOT NULL AND v_num > NEW.valor_max THEN
      RAISE EXCEPTION 'Valor % acima do máximo % para "%"', v_num, NEW.valor_max, NEW.chave;
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_configuracoes_limits ON configuracoes_agenda;
CREATE TRIGGER trg_configuracoes_limits
  BEFORE INSERT OR UPDATE ON configuracoes_agenda
  FOR EACH ROW EXECUTE FUNCTION enforce_configuracoes_limits();

-- ============================================================
-- FASE 2: Tabelas principais
-- ============================================================

-- agendamentos (criada antes de visitas — visitas referencia agendamentos)
CREATE TABLE IF NOT EXISTS agendamentos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id    UUID NOT NULL REFERENCES auth.users(id),
  codigo_cliente INTEGER NOT NULL REFERENCES tabela_clientes(codigo_cliente) ON DELETE RESTRICT,
  data_agendada  DATE NOT NULL,
  valor_previsto NUMERIC(12,2) DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente','realizado','cancelado','reagendado')),
  observacoes    TEXT,
  visita_id      UUID, -- FK adicionada após criação de visitas
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_vendedor_data ON agendamentos(vendedor_id, data_agendada);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente       ON agendamentos(codigo_cliente);
CREATE INDEX IF NOT EXISTS idx_agendamentos_pendentes     ON agendamentos(vendedor_id, data_agendada) WHERE status = 'pendente';

COMMENT ON TABLE  agendamentos IS 'Visitas planejadas pelo representante. valor_previsto bloqueia após data_agendada < hoje (enforced via trigger).';

-- visitas (tabela principal de registro de campo)
CREATE TABLE IF NOT EXISTS visitas (
  -- Identidade
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id       UUID NOT NULL REFERENCES auth.users(id),
  codigo_cliente    INTEGER NOT NULL REFERENCES tabela_clientes(codigo_cliente) ON DELETE RESTRICT,
  agendamento_id    UUID REFERENCES agendamentos(id),

  -- Dados da visita (editáveis dentro da janela de 24h)
  data_visita              DATE NOT NULL,
  resultado                TEXT NOT NULL CHECK (resultado IN ('vendeu','nao_vendeu','ausente','reagendou')),
  motivo_nao_venda_id      INTEGER REFERENCES motivos_nao_venda(id),
  observacoes              TEXT,
  origem                   TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','automatica_venda')),
  ativo                    BOOLEAN NOT NULL DEFAULT TRUE,

  -- Valores
  valor_realizado           NUMERIC(12,2),
  valor_previsto_agendamento NUMERIC(12,2),
  valor_confirmado_erp      BOOLEAN DEFAULT FALSE,
  pedido_cancelado          BOOLEAN DEFAULT FALSE,

  -- Snapshots RFM imutáveis (preenchidos no INSERT via trigger, nunca editáveis)
  rfm_perfil_snapshot      TEXT,       -- de analise_rfm.perfil
  rfm_oportunidade_snapshot NUMERIC(12,2), -- de analise_rfm.previsao_pedido
  rfm_dsv_snapshot         INTEGER,    -- de analise_rfm.dias_sem_comprar

  -- Snapshots para ML (calculados via trigger no INSERT)
  intervalo_desde_ultima_visita_dias INTEGER,
  resultado_ultima_visita            TEXT,
  motivo_ultima_nao_venda            TEXT,
  num_visitas_90d                    INTEGER DEFAULT 0,
  num_visitas_180d                   INTEGER DEFAULT 0,
  num_visitas_360d                   INTEGER DEFAULT 0,

  -- Contexto temporal (calculados via trigger no INSERT)
  dia_semana    SMALLINT CHECK (dia_semana BETWEEN 0 AND 6),
  semana_do_mes SMALLINT CHECK (semana_do_mes BETWEEN 1 AND 5),
  mes_do_ano    SMALLINT CHECK (mes_do_ano BETWEEN 1 AND 12),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitas_vendedor_data ON visitas(vendedor_id, data_visita DESC);
CREATE INDEX IF NOT EXISTS idx_visitas_cliente_data  ON visitas(codigo_cliente, data_visita DESC);
CREATE INDEX IF NOT EXISTS idx_visitas_ativas        ON visitas(vendedor_id, data_visita) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_visitas_agendamento   ON visitas(agendamento_id) WHERE agendamento_id IS NOT NULL;

COMMENT ON TABLE  visitas IS 'Registro de campo de visitas realizadas. Campos snapshot são imutáveis após INSERT (enforced via triggers).';
COMMENT ON COLUMN visitas.rfm_perfil_snapshot IS 'Snapshot imutável do perfil RFM no momento da visita (ex: Ouro, Prata, Bronze).';
COMMENT ON COLUMN visitas.num_visitas_90d IS 'Snapshot calculado no INSERT: qtd de visitas dos 90 dias anteriores (feature ML).';

-- FK circular: agendamentos.visita_id → visitas
DO $$
BEGIN
  ALTER TABLE agendamentos
    ADD CONSTRAINT fk_agendamentos_visita FOREIGN KEY (visita_id) REFERENCES visitas(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- FASE 3: Audit Log
-- ============================================================

CREATE TABLE IF NOT EXISTS agenda_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela          TEXT NOT NULL,
  registro_id     UUID NOT NULL,
  campo           TEXT NOT NULL,
  valor_anterior  TEXT,
  valor_novo      TEXT,
  alterado_por    UUID REFERENCES auth.users(id),
  alterado_em     TIMESTAMPTZ DEFAULT NOW(),
  permitido       BOOLEAN NOT NULL,
  motivo_bloqueio TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_tabela_registro ON agenda_audit_log(tabela, registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_usuario         ON agenda_audit_log(alterado_por, alterado_em DESC);

COMMENT ON TABLE agenda_audit_log IS 'Append-only. Registra toda tentativa de edição em campos auditáveis. Triggers bloqueiam UPDATE e DELETE.';
