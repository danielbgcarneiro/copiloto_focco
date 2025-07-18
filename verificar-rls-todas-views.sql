-- =====================================================
-- VERIFICAR STATUS RLS DE TODAS AS VIEWS IMPORTANTES
-- =====================================================
-- Execute no Supabase SQL Editor

-- 1. Verificar status RLS de todas as views principais
SELECT 
    viewname,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'SIM - RLS ATIVO'
        WHEN definition ILIKE '%security_invoker%' THEN 'PARCIAL'
        ELSE 'NÃO - SEM RLS'
    END as status_rls,
    schemaname
FROM pg_views 
WHERE viewname IN (
    'vw_dashboard_metricas',
    'vw_metricas_por_rota', 
    'vw_cidades_completo',
    'vw_clientes_completo',
    'vw_top10_cidades',
    'vw_ranking_rotas',
    'vw_metricas_categoria_cliente'
) AND schemaname = 'public'
ORDER BY viewname;

-- 2. Testar contagem como vendedor misterclaudio
-- (Execute logado como misterclaudio1972@gmail.com)
SELECT 
    'ROTAS' as tipo,
    COUNT(*) as total,
    STRING_AGG(rota, ', ') as lista
FROM vw_metricas_por_rota
UNION ALL
SELECT 
    'CIDADES' as tipo,
    COUNT(*) as total,
    STRING_AGG(DISTINCT cidade, ', ') as lista
FROM vw_cidades_completo
UNION ALL
SELECT 
    'CLIENTES' as tipo,
    COUNT(*) as total,
    STRING_AGG(DISTINCT rota, ', ') as lista
FROM vw_clientes_completo;

-- 3. Verificar se há dados duplicados/não filtrados
SELECT 
    'VERIFICACAO_DUPLICATAS' as teste,
    COUNT(DISTINCT rota) as rotas_distintas,
    COUNT(*) as total_registros,
    CASE 
        WHEN COUNT(*) > COUNT(DISTINCT rota) THEN 'POSSIVEL PROBLEMA'
        ELSE 'OK'
    END as status
FROM vw_metricas_por_rota;