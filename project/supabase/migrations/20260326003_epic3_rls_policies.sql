-- ============================================================
-- Epic 3 — Migration 003: RLS Policies
-- Story 3.1 — Módulo Agenda do Representante
-- Roles: vendedor | gestor | diretor (via profiles.cargo)
-- ============================================================

-- Helper: função para cargo do usuário atual (evita subconsulta repetida)
CREATE OR REPLACE FUNCTION get_user_cargo()
RETURNS TEXT AS $$
  SELECT cargo FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- FASE 5.1: Habilitar RLS em todas as tabelas
-- ============================================================

ALTER TABLE motivos_nao_venda    ENABLE ROW LEVEL SECURITY;
ALTER TABLE telefones_clientes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_audit_log     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FASE 5.6: motivos_nao_venda
-- Todos podem SELECT; gestor/diretor podem INSERT/UPDATE
-- ============================================================

DROP POLICY IF EXISTS "motivos_select_all"   ON motivos_nao_venda;
DROP POLICY IF EXISTS "motivos_write_gestor" ON motivos_nao_venda;

CREATE POLICY "motivos_select_all"
  ON motivos_nao_venda FOR SELECT
  USING (TRUE);

CREATE POLICY "motivos_write_gestor"
  ON motivos_nao_venda FOR ALL
  USING (get_user_cargo() IN ('gestor','diretor'))
  WITH CHECK (get_user_cargo() IN ('gestor','diretor'));

-- ============================================================
-- FASE 5.4: telefones_clientes
-- Todos SELECT; INSERT/UPDATE apenas no próprio registro (adicionado_por)
-- Gestor/diretor: full access
-- ============================================================

DROP POLICY IF EXISTS "telefones_select_all"       ON telefones_clientes;
DROP POLICY IF EXISTS "telefones_insert_proprio"    ON telefones_clientes;
DROP POLICY IF EXISTS "telefones_update_proprio"    ON telefones_clientes;
DROP POLICY IF EXISTS "telefones_gestor_full"       ON telefones_clientes;

CREATE POLICY "telefones_select_all"
  ON telefones_clientes FOR SELECT
  USING (TRUE);

CREATE POLICY "telefones_insert_proprio"
  ON telefones_clientes FOR INSERT
  WITH CHECK (
    adicionado_por = auth.uid()
    OR get_user_cargo() IN ('gestor','diretor')
  );

CREATE POLICY "telefones_update_proprio"
  ON telefones_clientes FOR UPDATE
  USING (
    adicionado_por = auth.uid()
    OR get_user_cargo() IN ('gestor','diretor')
  );

CREATE POLICY "telefones_gestor_full"
  ON telefones_clientes FOR DELETE
  USING (get_user_cargo() IN ('gestor','diretor'));

-- ============================================================
-- FASE 5.5: configuracoes_agenda
-- Vendedor: SELECT apenas onde editavel_gestor IS NOT NULL
-- Gestor: UPDATE apenas onde editavel_gestor = true
-- Diretor: full access
-- ============================================================

DROP POLICY IF EXISTS "config_select_vendedor" ON configuracoes_agenda;
DROP POLICY IF EXISTS "config_update_gestor"   ON configuracoes_agenda;
DROP POLICY IF EXISTS "config_full_diretor"    ON configuracoes_agenda;

CREATE POLICY "config_select_vendedor"
  ON configuracoes_agenda FOR SELECT
  USING (TRUE); -- todos podem ler (frontend filtra editavel_gestor)

CREATE POLICY "config_update_gestor"
  ON configuracoes_agenda FOR UPDATE
  USING (
    (get_user_cargo() = 'gestor' AND editavel_gestor = TRUE)
    OR get_user_cargo() = 'diretor'
  )
  WITH CHECK (
    (get_user_cargo() = 'gestor' AND editavel_gestor = TRUE)
    OR get_user_cargo() = 'diretor'
  );

CREATE POLICY "config_insert_diretor"
  ON configuracoes_agenda FOR INSERT
  WITH CHECK (get_user_cargo() = 'diretor');

-- ============================================================
-- FASE 5.3: agendamentos
-- Vendedor: SELECT/INSERT/UPDATE apenas onde vendedor_id = auth.uid()
-- Gestor/Diretor: SELECT em todos
-- ============================================================

DROP POLICY IF EXISTS "agendamentos_vendedor_select" ON agendamentos;
DROP POLICY IF EXISTS "agendamentos_vendedor_insert" ON agendamentos;
DROP POLICY IF EXISTS "agendamentos_vendedor_update" ON agendamentos;
DROP POLICY IF EXISTS "agendamentos_gestor_select"   ON agendamentos;

CREATE POLICY "agendamentos_vendedor_select"
  ON agendamentos FOR SELECT
  USING (
    vendedor_id = auth.uid()
    OR get_user_cargo() IN ('gestor','diretor')
  );

CREATE POLICY "agendamentos_vendedor_insert"
  ON agendamentos FOR INSERT
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "agendamentos_vendedor_update"
  ON agendamentos FOR UPDATE
  USING (
    vendedor_id = auth.uid()
    OR get_user_cargo() IN ('gestor','diretor')
  );

-- ============================================================
-- FASE 5.2: visitas
-- Vendedor: SELECT/INSERT/UPDATE apenas onde vendedor_id = auth.uid()
-- Gestor/Diretor: SELECT em todos; UPDATE (soft-delete) controlado por trigger
-- ============================================================

DROP POLICY IF EXISTS "visitas_vendedor_select" ON visitas;
DROP POLICY IF EXISTS "visitas_vendedor_insert" ON visitas;
DROP POLICY IF EXISTS "visitas_vendedor_update" ON visitas;
DROP POLICY IF EXISTS "visitas_gestor_select"   ON visitas;
DROP POLICY IF EXISTS "visitas_gestor_update"   ON visitas;

CREATE POLICY "visitas_vendedor_select"
  ON visitas FOR SELECT
  USING (
    vendedor_id = auth.uid()
    OR get_user_cargo() IN ('gestor','diretor')
  );

CREATE POLICY "visitas_vendedor_insert"
  ON visitas FOR INSERT
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "visitas_vendedor_update"
  ON visitas FOR UPDATE
  USING (
    vendedor_id = auth.uid()
    OR get_user_cargo() IN ('gestor','diretor')
  );

-- ============================================================
-- FASE 5.7: agenda_audit_log
-- Vendedor: sem acesso (zero)
-- Gestor: SELECT dos seus vendedores (via join profiles)
-- Diretor: SELECT em tudo
-- INSERT: apenas via triggers (SECURITY DEFINER)
-- ============================================================

DROP POLICY IF EXISTS "audit_gestor_select"  ON agenda_audit_log;
DROP POLICY IF EXISTS "audit_diretor_select" ON agenda_audit_log;

CREATE POLICY "audit_gestor_select"
  ON agenda_audit_log FOR SELECT
  USING (
    get_user_cargo() = 'gestor'
    -- gestor vê logs dos seus vendedores
    AND alterado_por IN (
      SELECT p.id FROM profiles p
       WHERE p.vendedor_responsavel = (
         SELECT vendedor FROM profiles WHERE id = auth.uid()
       )
    )
  );

CREATE POLICY "audit_diretor_select"
  ON agenda_audit_log FOR SELECT
  USING (get_user_cargo() = 'diretor');

-- Sem policy de INSERT para role normal: triggers usam SECURITY DEFINER (bypassam RLS)
