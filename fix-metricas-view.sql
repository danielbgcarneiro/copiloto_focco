-- Verificar e corrigir view vw_metricas_categoria_cliente
-- Execute no Supabase SQL Editor

-- 1. Verificar se a view tem security_invoker
SELECT 
    viewname,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'SIM'
        WHEN definition ILIKE '%security_invoker%' THEN 'PARCIAL'
        ELSE 'NÃO'
    END as tem_security_invoker
FROM pg_views 
WHERE viewname = 'vw_metricas_categoria_cliente'
  AND schemaname = 'public';

-- 2. Se não tiver, aplicar security_invoker
ALTER VIEW vw_metricas_categoria_cliente SET (security_invoker = true);

-- 3. Verificar novamente
SELECT 
    viewname,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'SIM'
        WHEN definition ILIKE '%security_invoker%' THEN 'PARCIAL'
        ELSE 'NÃO'
    END as tem_security_invoker
FROM pg_views 
WHERE viewname = 'vw_metricas_categoria_cliente'
  AND schemaname = 'public';