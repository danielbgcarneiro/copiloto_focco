-- ============================================================
-- Epic 3 — Migration 002: Triggers de Imutabilidade e Audit Log
-- Story 3.1 — Módulo Agenda do Representante
-- ============================================================

-- ============================================================
-- FASE 3.2: Audit Log — bloqueia UPDATE e DELETE
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_audit_log_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'agenda_audit_log é append-only. UPDATE e DELETE são proibidos para todos os roles.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_update ON agenda_audit_log;
CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON agenda_audit_log
  FOR EACH ROW EXECUTE FUNCTION enforce_audit_log_append_only();

DROP TRIGGER IF EXISTS trg_audit_no_delete ON agenda_audit_log;
CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON agenda_audit_log
  FOR EACH ROW EXECUTE FUNCTION enforce_audit_log_append_only();

-- ============================================================
-- FASE 4.1: enforce_visita_immutability
-- Bloqueia resultado/motivo após 24h da data_visita
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_visita_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Após 24h: resultado e motivo_nao_venda_id bloqueados
  IF OLD.data_visita < CURRENT_DATE - INTERVAL '1 day' THEN
    IF NEW.resultado IS DISTINCT FROM OLD.resultado
       OR NEW.motivo_nao_venda_id IS DISTINCT FROM OLD.motivo_nao_venda_id THEN
      INSERT INTO agenda_audit_log
        (tabela, registro_id, campo, valor_anterior, valor_novo, alterado_por, permitido, motivo_bloqueio)
      VALUES
        ('visitas', OLD.id, 'resultado/motivo', OLD.resultado, NEW.resultado,
         auth.uid(), FALSE, 'Edição bloqueada após 24h da data_visita');
      RAISE EXCEPTION 'resultado/motivo não pode ser alterado após 24h da data_visita';
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_visita_immutability ON visitas;
CREATE TRIGGER trg_visita_immutability
  BEFORE UPDATE ON visitas
  FOR EACH ROW EXECUTE FUNCTION enforce_visita_immutability();

-- ============================================================
-- FASE 4.2: enforce_visita_fields_never_change
-- Campos imutáveis após INSERT: identificadores e todos os snapshots
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_visita_fields_never_change()
RETURNS TRIGGER AS $$
DECLARE
  campo_alterado TEXT;
BEGIN
  campo_alterado := NULL;

  IF NEW.data_visita       IS DISTINCT FROM OLD.data_visita       THEN campo_alterado := 'data_visita'; END IF;
  IF NEW.vendedor_id       IS DISTINCT FROM OLD.vendedor_id       THEN campo_alterado := 'vendedor_id'; END IF;
  IF NEW.codigo_cliente    IS DISTINCT FROM OLD.codigo_cliente    THEN campo_alterado := 'codigo_cliente'; END IF;
  IF NEW.origem            IS DISTINCT FROM OLD.origem            THEN campo_alterado := 'origem'; END IF;
  IF NEW.created_at        IS DISTINCT FROM OLD.created_at        THEN campo_alterado := 'created_at'; END IF;
  IF NEW.rfm_perfil_snapshot        IS DISTINCT FROM OLD.rfm_perfil_snapshot        THEN campo_alterado := 'rfm_perfil_snapshot'; END IF;
  IF NEW.rfm_oportunidade_snapshot  IS DISTINCT FROM OLD.rfm_oportunidade_snapshot  THEN campo_alterado := 'rfm_oportunidade_snapshot'; END IF;
  IF NEW.rfm_dsv_snapshot           IS DISTINCT FROM OLD.rfm_dsv_snapshot           THEN campo_alterado := 'rfm_dsv_snapshot'; END IF;
  IF NEW.intervalo_desde_ultima_visita_dias IS DISTINCT FROM OLD.intervalo_desde_ultima_visita_dias THEN campo_alterado := 'intervalo_desde_ultima_visita_dias'; END IF;
  IF NEW.resultado_ultima_visita    IS DISTINCT FROM OLD.resultado_ultima_visita    THEN campo_alterado := 'resultado_ultima_visita'; END IF;
  IF NEW.motivo_ultima_nao_venda    IS DISTINCT FROM OLD.motivo_ultima_nao_venda    THEN campo_alterado := 'motivo_ultima_nao_venda'; END IF;
  IF NEW.num_visitas_90d            IS DISTINCT FROM OLD.num_visitas_90d            THEN campo_alterado := 'num_visitas_90d'; END IF;
  IF NEW.num_visitas_180d           IS DISTINCT FROM OLD.num_visitas_180d           THEN campo_alterado := 'num_visitas_180d'; END IF;
  IF NEW.num_visitas_360d           IS DISTINCT FROM OLD.num_visitas_360d           THEN campo_alterado := 'num_visitas_360d'; END IF;
  IF NEW.dia_semana                 IS DISTINCT FROM OLD.dia_semana                 THEN campo_alterado := 'dia_semana'; END IF;
  IF NEW.semana_do_mes              IS DISTINCT FROM OLD.semana_do_mes              THEN campo_alterado := 'semana_do_mes'; END IF;
  IF NEW.mes_do_ano                 IS DISTINCT FROM OLD.mes_do_ano                 THEN campo_alterado := 'mes_do_ano'; END IF;

  IF campo_alterado IS NOT NULL THEN
    INSERT INTO agenda_audit_log
      (tabela, registro_id, campo, valor_anterior, valor_novo, alterado_por, permitido, motivo_bloqueio)
    VALUES
      ('visitas', OLD.id, campo_alterado, NULL, NULL, auth.uid(), FALSE,
       'Campo imutável após INSERT — alteração bloqueada');
    RAISE EXCEPTION 'Campo "%" é imutável após o registro da visita', campo_alterado;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_visita_fields_immutable ON visitas;
CREATE TRIGGER trg_visita_fields_immutable
  BEFORE UPDATE ON visitas
  FOR EACH ROW EXECUTE FUNCTION enforce_visita_fields_never_change();

-- ============================================================
-- FASE 4.3: enforce_agendamento_immutability
-- Bloqueia valor_previsto após data_agendada passada
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_agendamento_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.data_agendada < CURRENT_DATE THEN
    IF NEW.valor_previsto IS DISTINCT FROM OLD.valor_previsto THEN
      INSERT INTO agenda_audit_log
        (tabela, registro_id, campo, valor_anterior, valor_novo, alterado_por, permitido, motivo_bloqueio)
      VALUES
        ('agendamentos', OLD.id, 'valor_previsto',
         OLD.valor_previsto::TEXT, NEW.valor_previsto::TEXT,
         auth.uid(), FALSE, 'valor_previsto bloqueado após data_agendada passada');
      RAISE EXCEPTION 'valor_previsto não pode ser alterado após a data do agendamento';
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_agendamento_immutability ON agendamentos;
CREATE TRIGGER trg_agendamento_immutability
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION enforce_agendamento_immutability();

-- ============================================================
-- FASE 4.4: enforce_soft_delete_vendedor
-- Role vendedor não pode alterar campo ativo em visitas
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_soft_delete_vendedor()
RETURNS TRIGGER AS $$
DECLARE v_cargo TEXT;
BEGIN
  SELECT cargo INTO v_cargo FROM profiles WHERE id = auth.uid();
  IF v_cargo = 'vendedor' AND NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    INSERT INTO agenda_audit_log
      (tabela, registro_id, campo, valor_anterior, valor_novo, alterado_por, permitido, motivo_bloqueio)
    VALUES
      ('visitas', OLD.id, 'ativo', OLD.ativo::TEXT, NEW.ativo::TEXT,
       auth.uid(), FALSE, 'Vendedor não pode alterar campo ativo');
    RAISE EXCEPTION 'Apenas gestor ou diretor pode ativar/desativar visitas';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_soft_delete_vendedor ON visitas;
CREATE TRIGGER trg_soft_delete_vendedor
  BEFORE UPDATE ON visitas
  FOR EACH ROW
  WHEN (NEW.ativo IS DISTINCT FROM OLD.ativo)
  EXECUTE FUNCTION enforce_soft_delete_vendedor();

-- ============================================================
-- FASE 4.5: enforce_retroactive_creation
-- Bloqueia INSERT manual com data_visita > 3 dias no passado
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_retroactive_creation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.origem = 'manual' AND NEW.data_visita < CURRENT_DATE - INTERVAL '3 days' THEN
    RAISE EXCEPTION 'Visita manual não pode ser criada com data_visita anterior a 3 dias atrás';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_retroactive_creation ON visitas;
CREATE TRIGGER trg_retroactive_creation
  BEFORE INSERT ON visitas
  FOR EACH ROW EXECUTE FUNCTION enforce_retroactive_creation();

-- ============================================================
-- FASE 4.7: enforce_agendamento_state_machine
-- Bloqueia transições inválidas: realizado/cancelado/reagendado → qualquer mudança de status
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_agendamento_state_machine()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('realizado','cancelado') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Agendamento com status "%" não pode ter status alterado', OLD.status;
  END IF;
  -- reagendado só pode ir para pendente (quando um novo agendamento é criado)
  IF OLD.status = 'reagendado' AND NEW.status NOT IN ('reagendado','pendente') THEN
    RAISE EXCEPTION 'Agendamento reagendado só pode voltar para pendente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agendamento_state_machine ON agendamentos;
CREATE TRIGGER trg_agendamento_state_machine
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION enforce_agendamento_state_machine();

-- ============================================================
-- FASE 4.8: auto_populate_visita_snapshots
-- Preenche automaticamente todos os campos calculados no INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION auto_populate_visita_snapshots()
RETURNS TRIGGER AS $$
DECLARE
  v_rfm RECORD;
  v_ultima_visita RECORD;
BEGIN
  -- Contexto temporal
  NEW.dia_semana    := EXTRACT(DOW FROM NEW.data_visita)::SMALLINT;
  NEW.mes_do_ano    := EXTRACT(MONTH FROM NEW.data_visita)::SMALLINT;
  NEW.semana_do_mes := CEIL(EXTRACT(DAY FROM NEW.data_visita) / 7.0)::SMALLINT;

  -- Snapshots RFM da data mais recente do cliente
  SELECT perfil, previsao_pedido, dias_sem_comprar
    INTO v_rfm
    FROM analise_rfm
   WHERE codigo_cliente = NEW.codigo_cliente
   ORDER BY data_analise DESC
   LIMIT 1;

  IF FOUND THEN
    NEW.rfm_perfil_snapshot       := v_rfm.perfil;
    NEW.rfm_oportunidade_snapshot := v_rfm.previsao_pedido;
    NEW.rfm_dsv_snapshot          := v_rfm.dias_sem_comprar;
  END IF;

  -- Última visita anterior a esta
  SELECT resultado, motivo_nao_venda_id, data_visita
    INTO v_ultima_visita
    FROM visitas
   WHERE codigo_cliente = NEW.codigo_cliente
     AND vendedor_id    = NEW.vendedor_id
     AND data_visita    < NEW.data_visita
     AND ativo          = TRUE
   ORDER BY data_visita DESC
   LIMIT 1;

  IF FOUND THEN
    NEW.intervalo_desde_ultima_visita_dias :=
      (NEW.data_visita - v_ultima_visita.data_visita)::INTEGER;
    NEW.resultado_ultima_visita := v_ultima_visita.resultado;
    IF v_ultima_visita.motivo_nao_venda_id IS NOT NULL THEN
      SELECT codigo_canonico INTO NEW.motivo_ultima_nao_venda
        FROM motivos_nao_venda WHERE id = v_ultima_visita.motivo_nao_venda_id;
    END IF;
  END IF;

  -- Contagens de visitas por janela temporal
  SELECT
    COUNT(*) FILTER (WHERE data_visita >= NEW.data_visita - INTERVAL '90 days'),
    COUNT(*) FILTER (WHERE data_visita >= NEW.data_visita - INTERVAL '180 days'),
    COUNT(*) FILTER (WHERE data_visita >= NEW.data_visita - INTERVAL '360 days')
  INTO
    NEW.num_visitas_90d,
    NEW.num_visitas_180d,
    NEW.num_visitas_360d
  FROM visitas
  WHERE codigo_cliente = NEW.codigo_cliente
    AND vendedor_id    = NEW.vendedor_id
    AND data_visita    < NEW.data_visita
    AND ativo          = TRUE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_populate_snapshots ON visitas;
CREATE TRIGGER trg_auto_populate_snapshots
  BEFORE INSERT ON visitas
  FOR EACH ROW EXECUTE FUNCTION auto_populate_visita_snapshots();
