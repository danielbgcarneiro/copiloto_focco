-- =====================================================
-- SCRIPT COMPLETO: CORREÇÃO vw_metricas_categoria_cliente
-- =====================================================
-- PROBLEMA: View sem security_invoker causando vazamento de dados entre vendedores
-- SOLUÇÃO: Configurar security_invoker = true para respeitar RLS
-- EXECUTAR NO: Supabase SQL Editor
-- DATA: 2025-01-18
-- =====================================================

-- 1. VERIFICAÇÃO INICIAL - Status atual da view
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=== INICIANDO VERIFICAÇÃO DA VIEW vw_metricas_categoria_cliente ===';
    RAISE NOTICE 'Timestamp: %', NOW();
END $$;

-- Verificar se a view existe
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE viewname = 'vw_metricas_categoria_cliente';

-- Verificar configurações atuais da view
SELECT 
    n.nspname as schema_name,
    c.relname as view_name,
    c.reloptions as view_options
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'vw_metricas_categoria_cliente' 
AND c.relkind = 'v';

-- Verificar RLS status nas tabelas base
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasrls as has_rls_policies
FROM pg_tables 
WHERE tablename IN ('vendas', 'clientes', 'produtos')
ORDER BY tablename;

-- =====================================================
-- 2. BACKUP DA CONFIGURAÇÃO ATUAL
-- =====================================================
RAISE NOTICE '=== FAZENDO BACKUP DA CONFIGURAÇÃO ATUAL ===';

-- Criar tabela de backup se não existir
CREATE TABLE IF NOT EXISTS view_backup_log (
    id SERIAL PRIMARY KEY,
    view_name TEXT NOT NULL,
    backup_date TIMESTAMP DEFAULT NOW(),
    original_definition TEXT,
    original_options TEXT[],
    action_taken TEXT,
    success BOOLEAN DEFAULT FALSE
);

-- Salvar configuração atual
INSERT INTO view_backup_log (view_name, original_definition, original_options, action_taken)
SELECT 
    'vw_metricas_categoria_cliente',
    definition,
    c.reloptions,
    'BACKUP_BEFORE_FIX'
FROM pg_views v
LEFT JOIN pg_class c ON c.relname = v.viewname
WHERE v.viewname = 'vw_metricas_categoria_cliente';

-- =====================================================
-- 3. APLICAR CORREÇÃO PRINCIPAL
-- =====================================================
RAISE NOTICE '=== APLICANDO CORREÇÃO: security_invoker = true ===';

-- Aplicar correção principal
ALTER VIEW vw_metricas_categoria_cliente SET (security_invoker = true);

-- Registrar ação no log
UPDATE view_backup_log 
SET action_taken = 'APPLIED_security_invoker_true', 
    success = TRUE 
WHERE view_name = 'vw_metricas_categoria_cliente' 
AND backup_date = (
    SELECT MAX(backup_date) 
    FROM view_backup_log 
    WHERE view_name = 'vw_metricas_categoria_cliente'
);

RAISE NOTICE 'Correção aplicada com sucesso!';

-- =====================================================
-- 4. VERIFICAÇÃO PÓS-CORREÇÃO
-- =====================================================
RAISE NOTICE '=== VERIFICANDO CONFIGURAÇÃO PÓS-CORREÇÃO ===';

-- Verificar se a correção foi aplicada
SELECT 
    n.nspname as schema_name,
    c.relname as view_name,
    c.reloptions as view_options,
    CASE 
        WHEN 'security_invoker=true' = ANY(c.reloptions) THEN '✅ CONFIGURADO'
        ELSE '❌ NÃO CONFIGURADO'
    END as security_invoker_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'vw_metricas_categoria_cliente' 
AND c.relkind = 'v';

-- =====================================================
-- 5. TESTE BÁSICO DE FUNCIONAMENTO
-- =====================================================
RAISE NOTICE '=== EXECUTANDO TESTE BÁSICO ===';

-- Teste 1: Verificar se a view ainda funciona
SELECT 
    COUNT(*) as total_registros,
    COUNT(DISTINCT codigo_cliente) as clientes_unicos,
    CURRENT_USER as usuario_atual
FROM vw_metricas_categoria_cliente;

-- Teste 2: Verificar se há dados por categoria
SELECT 
    categoria,
    COUNT(*) as quantidade
FROM vw_metricas_categoria_cliente
GROUP BY categoria
ORDER BY categoria;

-- =====================================================
-- 6. COMANDOS DE VALIDAÇÃO MANUAL
-- =====================================================
RAISE NOTICE '=== COMANDOS PARA VALIDAÇÃO MANUAL ===';
RAISE NOTICE 'Execute os comandos abaixo para validar completamente:';
RAISE NOTICE '1. Teste com usuário específico:';
RAISE NOTICE '   SELECT * FROM vw_metricas_categoria_cliente WHERE codigo_cliente = 100476;';
RAISE NOTICE '2. Compare com query direta:';
RAISE NOTICE '   SELECT COUNT(*) FROM vendas v JOIN clientes c ON v.codigo_cliente = c.codigo_cliente WHERE c.vendedor_uuid = auth.uid();';
RAISE NOTICE '3. Teste filtro por vendedor na aplicação';

-- =====================================================
-- 7. COMANDOS DE ROLLBACK (SE NECESSÁRIO)
-- =====================================================
COMMENT ON VIEW vw_metricas_categoria_cliente IS 
'ROLLBACK: ALTER VIEW vw_metricas_categoria_cliente RESET (security_invoker);';

-- =====================================================
-- 8. STATUS FINAL
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=== CORREÇÃO FINALIZADA ===';
    RAISE NOTICE 'View: vw_metricas_categoria_cliente';
    RAISE NOTICE 'Correção: security_invoker = true aplicado';
    RAISE NOTICE 'Status: ✅ COMPLETO';
    RAISE NOTICE 'Próximo passo: Testar na aplicação React';
    RAISE NOTICE 'Timestamp final: %', NOW();
    RAISE NOTICE '=======================================';
END $$;

-- =====================================================
-- 9. CONSULTA FINAL DE VERIFICAÇÃO
-- =====================================================
-- Execute esta query para confirmar que tudo está correto:
SELECT 
    '✅ VERIFICAÇÃO FINAL' as status,
    CASE 
        WHEN 'security_invoker=true' = ANY(c.reloptions) THEN 'CONFIGURADO CORRETAMENTE'
        ELSE 'ERRO: NÃO CONFIGURADO'
    END as security_invoker,
    c.reloptions as opcoes_view,
    NOW() as verificado_em
FROM pg_class c
WHERE c.relname = 'vw_metricas_categoria_cliente' 
AND c.relkind = 'v';