-- ============================================================
-- Epic 3 — Story 3.5: Auto-populate visitas via ERP
-- Migration: 20260327001_epic3_erp_auto_populate.sql
--
-- Fonte ERP:   pedidos_vendas_mes
-- Mapeamento:  pedidos_vendas_mes.vendedor → profiles.vendedor → profiles.id (UUID)
-- Cancelado:   valor_faturado = 0 AND valor_aberto = 0
-- Mecanismo:   Edge Function (sync-erp-visitas) agendada / on-demand
-- ============================================================

-- ============================================================
-- 1. Trigger: enforce valor_realizado imutável em visitas automáticas (AC6)
--    Vendedor não pode alterar valor_realizado quando origem = 'automatica_venda'.
--    O sistema ERP bypassa via set_config('my.erp_sync_bypass', 'true', true).
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_automatic_valor_immutable()
RETURNS TRIGGER AS $$
BEGIN
  -- Permite atualização pelo sistema ERP (SECURITY DEFINER + set_config bypass)
  IF current_setting('my.erp_sync_bypass', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Bloqueia se visita automática e valor_realizado está mudando
  IF OLD.origem = 'automatica_venda'
     AND NEW.valor_realizado IS DISTINCT FROM OLD.valor_realizado
  THEN
    INSERT INTO agenda_audit_log
      (tabela, registro_id, campo, valor_anterior, valor_novo,
       alterado_por, permitido, motivo_bloqueio)
    VALUES
      ('visitas', OLD.id, 'valor_realizado',
       OLD.valor_realizado::TEXT, NEW.valor_realizado::TEXT,
       auth.uid(), FALSE,
       'valor_realizado de visita automática é imutável — apenas o sistema ERP pode alterar');

    RAISE EXCEPTION
      'valor_realizado de visita com origem=automatica_venda não pode ser alterado pelo vendedor';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists para idempotência
DROP TRIGGER IF EXISTS trg_automatic_valor_immutable ON visitas;

CREATE TRIGGER trg_automatic_valor_immutable
  BEFORE UPDATE ON visitas
  FOR EACH ROW
  EXECUTE FUNCTION enforce_automatic_valor_immutable();

-- ============================================================
-- 2. Função principal: auto_populate_visita_from_venda (AC1–AC8)
--
--    Lógica:
--    - AC1: Verifica se já existe visita ±1 dia antes de criar
--    - AC2: Cria visita automática com origem='automatica_venda', resultado='vendeu'
--    - AC3: Trigger trg_auto_populate_snapshots preenche campos ML no INSERT
--    - AC4: Atualiza valor_realizado por até 60 dias quando pedido muda
--    - AC5: Pedido cancelado → pedido_cancelado=true, valor_realizado=0 (registro mantido)
--    - AC6: SECURITY DEFINER + bypass flag permitem esta função alterar valor_realizado
--    - AC7: Visita manual existente → só atualiza valor_realizado se valor_confirmado_erp=false
--    - AC8: Após atualização → valor_confirmado_erp=true
-- ============================================================
CREATE OR REPLACE FUNCTION auto_populate_visita_from_venda(
  p_vendedor_id    UUID,
  p_codigo_cliente INTEGER,
  p_data_venda     DATE,
  p_valor_venda    NUMERIC,
  p_cancelado      BOOLEAN DEFAULT FALSE
)
RETURNS TEXT AS $$
DECLARE
  v_visita_existente UUID;
  v_visita_nova      UUID;
  v_janela           INTEGER;
  v_resultado        TEXT;
BEGIN
  -- Sinalizar para triggers que esta é uma operação do sistema ERP (AC6)
  PERFORM set_config('my.erp_sync_bypass', 'true', true);

  -- Obter janela retroativa de configuracoes_agenda (AC9)
  SELECT valor::INTEGER INTO v_janela
  FROM configuracoes_agenda
  WHERE chave = 'janela_retroativa_vendas_dias';
  v_janela := COALESCE(v_janela, 60);

  -- Rejeitar registros fora da janela retroativa (AC9)
  IF p_data_venda < CURRENT_DATE - v_janela THEN
    RETURN 'skipped_outside_window';
  END IF;

  -- Buscar visita existente do mesmo vendedor/cliente no dia ±1 (AC1, AC7)
  SELECT id INTO v_visita_existente
  FROM visitas
  WHERE vendedor_id    = p_vendedor_id
    AND codigo_cliente = p_codigo_cliente
    AND data_visita BETWEEN p_data_venda - 1 AND p_data_venda + 1
    AND ativo = true
  ORDER BY ABS(data_visita - p_data_venda)
  LIMIT 1;

  IF v_visita_existente IS NOT NULL THEN
    -- Visita já existe: atualizar valor_realizado se ERP ainda não confirmou (AC4, AC7, AC8)
    UPDATE visitas SET
      valor_realizado    = CASE WHEN p_cancelado THEN 0 ELSE p_valor_venda END,
      valor_confirmado_erp = TRUE,
      pedido_cancelado   = p_cancelado,
      updated_at         = NOW()
    WHERE id = v_visita_existente
      AND (valor_confirmado_erp = FALSE OR valor_confirmado_erp IS NULL);

    v_resultado := CASE WHEN p_cancelado THEN 'updated_cancelled' ELSE 'updated_existing' END;

    -- Audit log (AC10)
    INSERT INTO agenda_audit_log
      (tabela, registro_id, campo, valor_anterior, valor_novo, alterado_por, permitido)
    VALUES
      ('visitas', v_visita_existente, 'erp_sync_update',
       NULL, v_resultado, p_vendedor_id, TRUE);

  ELSIF NOT p_cancelado THEN
    -- Sem visita existente e pedido ativo: criar visita automática (AC2)
    -- O trigger trg_auto_populate_snapshots preenche os campos ML automaticamente (AC3)
    INSERT INTO visitas (
      vendedor_id, codigo_cliente, data_visita,
      resultado,  origem,              valor_realizado, valor_confirmado_erp
    ) VALUES (
      p_vendedor_id, p_codigo_cliente, p_data_venda,
      'vendeu',  'automatica_venda',   p_valor_venda,   TRUE
    )
    RETURNING id INTO v_visita_nova;

    v_resultado := 'created';

    -- Audit log (AC10)
    INSERT INTO agenda_audit_log
      (tabela, registro_id, campo, valor_anterior, valor_novo, alterado_por, permitido)
    VALUES
      ('visitas', v_visita_nova, 'erp_sync_create',
       NULL, 'automatica_venda', p_vendedor_id, TRUE);

  ELSE
    -- Pedido cancelado mas não há visita para atualizar
    v_resultado := 'skipped_cancelled_no_visit';
  END IF;

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Função: handle_pedido_cancelado (FASE 4 — AC5)
--    Marca pedido_cancelado=true e valor_realizado=0 sem deletar o registro.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_pedido_cancelado(p_visita_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('my.erp_sync_bypass', 'true', true);

  UPDATE visitas SET
    pedido_cancelado     = TRUE,
    valor_realizado      = 0,
    valor_confirmado_erp = TRUE,
    updated_at           = NOW()
  WHERE id = p_visita_id;

  INSERT INTO agenda_audit_log
    (tabela, registro_id, campo, valor_anterior, valor_novo, alterado_por, permitido)
  VALUES
    ('visitas', p_visita_id, 'pedido_cancelado', 'false', 'true', NULL, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. Permissões — service_role executa as funções via Edge Function
-- ============================================================
GRANT EXECUTE ON FUNCTION auto_populate_visita_from_venda(UUID, INTEGER, DATE, NUMERIC, BOOLEAN)
  TO service_role;

GRANT EXECUTE ON FUNCTION handle_pedido_cancelado(UUID)
  TO service_role;
