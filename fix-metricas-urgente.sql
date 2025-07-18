-- CORREÇÃO URGENTE: Aplicar security_invoker na view vw_metricas_categoria_cliente
-- Execute AGORA no Supabase SQL Editor

-- 1. Aplicar security_invoker na view de métricas
ALTER VIEW vw_metricas_categoria_cliente SET (security_invoker = true);

-- 2. Verificar se foi aplicado
SELECT 
    viewname,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'SIM - CORRIGIDO'
        WHEN definition ILIKE '%security_invoker%' THEN 'PARCIAL'
        ELSE 'NÃO - AINDA COM PROBLEMA'
    END as status_security_invoker
FROM pg_views 
WHERE viewname = 'vw_metricas_categoria_cliente'
  AND schemaname = 'public';