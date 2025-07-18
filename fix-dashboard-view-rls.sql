-- =====================================================
-- APLICAR RLS NA VIEW vw_dashboard_metricas
-- =====================================================
-- Execute no Supabase SQL Editor

-- 1. Aplicar security_invoker na view de dashboard
ALTER VIEW vw_dashboard_metricas SET (security_invoker = true);

-- 2. Verificar se foi aplicado corretamente
SELECT 
    viewname,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'SIM - RLS ATIVO'
        WHEN definition ILIKE '%security_invoker%' THEN 'PARCIAL'
        ELSE 'NÃO - SEM RLS'
    END as status_rls
FROM pg_views 
WHERE viewname = 'vw_dashboard_metricas'
  AND schemaname = 'public';

-- 3. Testar como vendedor misterclaudio
-- (Execute este teste logado como misterclaudio1972@gmail.com)
SELECT 
    'TESTE COMO VENDEDOR' as tipo_teste,
    vendedor_id,
    vendedor_nome,
    vendas_mes,
    oticas_positivadas,
    meta_mes,
    percentual_atingimento
FROM vw_dashboard_metricas
ORDER BY vendedor_nome;

-- 4. Verificar quantas linhas retorna para vendedor vs diretor
SELECT 
    'CONTAGEM POR TIPO' as info,
    COUNT(*) as total_linhas,
    COUNT(CASE WHEN vendedor_id IS NULL THEN 1 END) as linhas_total,
    COUNT(CASE WHEN vendedor_id IS NOT NULL THEN 1 END) as linhas_individuais
FROM vw_dashboard_metricas;