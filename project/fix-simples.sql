-- =====================================================
-- CORREÇÃO SIMPLES: vw_metricas_categoria_cliente
-- =====================================================

-- 1. Verificar status atual
SELECT 
    relname as view_name,
    reloptions as current_options
FROM pg_class 
WHERE relname = 'vw_metricas_categoria_cliente';

-- 2. Aplicar correção
ALTER VIEW vw_metricas_categoria_cliente SET (security_invoker = true);

-- 3. Confirmar correção
SELECT 
    relname as view_name,
    reloptions as new_options,
    CASE 
        WHEN 'security_invoker=true' = ANY(reloptions) THEN '✅ CORRIGIDO'
        ELSE '❌ FALHOU'
    END as status
FROM pg_class 
WHERE relname = 'vw_metricas_categoria_cliente';

-- 4. Teste rápido
SELECT COUNT(*) as total_registros FROM vw_metricas_categoria_cliente;

-- ROLLBACK (se necessário):
-- ALTER VIEW vw_metricas_categoria_cliente RESET (security_invoker);