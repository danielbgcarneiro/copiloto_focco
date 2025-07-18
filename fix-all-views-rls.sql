-- =====================================================
-- APLICAR RLS EM TODAS AS VIEWS RESTANTES
-- =====================================================
-- Execute no Supabase SQL Editor

-- 1. Aplicar security_invoker em todas as views que faltam
ALTER VIEW vw_metricas_por_rota SET (security_invoker = true);
ALTER VIEW vw_cidades_completo SET (security_invoker = true);

-- 2. Verificar se foi aplicado corretamente
SELECT 
    viewname,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'SIM - RLS ATIVO'
        WHEN definition ILIKE '%security_invoker%' THEN 'PARCIAL'
        ELSE 'NÃO - SEM RLS'
    END as status_rls
FROM pg_views 
WHERE viewname IN ('vw_metricas_por_rota', 'vw_cidades_completo', 'vw_dashboard_metricas')
  AND schemaname = 'public'
ORDER BY viewname;

-- 3. Testar como vendedor misterclaudio
-- (Execute este teste logado como misterclaudio1972@gmail.com)
SELECT 
    'TESTE ROTAS' as tipo_teste,
    COUNT(*) as total_rotas,
    STRING_AGG(rota, ', ') as rotas_encontradas
FROM vw_metricas_por_rota;

SELECT 
    'TESTE CIDADES' as tipo_teste,
    COUNT(*) as total_cidades,
    STRING_AGG(DISTINCT rota, ', ') as rotas_das_cidades
FROM vw_cidades_completo;

-- 4. Comparar com antes (descomente para testar como diretor)
-- SELECT 
--     'TESTE COMO DIRETOR' as tipo_teste,
--     COUNT(*) as total_rotas
-- FROM vw_metricas_por_rota;