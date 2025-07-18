-- Investigação profunda das políticas RLS
-- Execute como admin no Supabase SQL Editor

-- 1. Verificar todas as políticas RLS existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual as policy_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 2. Verificar especificamente as políticas das tabelas que afetam as views
SELECT 
    'TABELA: ' || tablename as info,
    policyname,
    cmd,
    qual as expression
FROM pg_policies 
WHERE tablename IN ('tabela_clientes', 'vendedor_rotas', 'rotas_estado')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Verificar se RLS está habilitado nas tabelas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasrules as has_rules
FROM pg_tables 
WHERE tablename IN ('tabela_clientes', 'vendedor_rotas', 'rotas_estado')
  AND schemaname = 'public';

-- 4. Verificar definições das views suspeitas vs funcionais
SELECT 
    'VIEW SUSPEITA' as tipo,
    viewname,
    LEFT(definition, 200) as definition_preview
FROM pg_views 
WHERE viewname IN ('vw_metricas_por_rota', 'vw_cidades_completo', 'vw_clientes_completo')

UNION ALL

SELECT 
    'VIEW FUNCIONAL' as tipo,
    viewname,
    LEFT(definition, 200) as definition_preview
FROM pg_views 
WHERE viewname IN ('vw_ranking_rotas', 'vw_top10_cidades', 'vw_dashboard_metricas')
ORDER BY tipo, viewname;

-- 5. Verificar se há bypass de RLS nas views
SELECT 
    viewname,
    CASE 
        WHEN definition ILIKE '%security_definer%' THEN 'SECURITY_DEFINER (pode bypassar RLS)'
        WHEN definition ILIKE '%security_invoker%' THEN 'SECURITY_INVOKER (respeita RLS)'
        ELSE 'NÃO ESPECIFICADO (default pode bypassar RLS)'
    END as security_mode,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'SIM'
        ELSE 'NÃO'
    END as tem_security_invoker_true
FROM pg_views 
WHERE viewname IN (
    'vw_metricas_por_rota', 
    'vw_cidades_completo', 
    'vw_clientes_completo',
    'vw_ranking_rotas', 
    'vw_top10_cidades', 
    'vw_dashboard_metricas'
)
ORDER BY 
    CASE WHEN viewname IN ('vw_ranking_rotas', 'vw_top10_cidades', 'vw_dashboard_metricas') 
         THEN 1 ELSE 2 END,
    viewname;

-- 6. Teste manual como misterclaudio
-- EXECUTE ESTE BLOCO LOGADO COMO misterclaudio1972@gmail.com

DO $$
DECLARE
    user_id UUID := '09f316d7-eeac-4828-85a0-ad1b891f8460';
    rotas_count INTEGER;
    clientes_count INTEGER;
    view_rotas_count INTEGER;
    view_cidades_count INTEGER;
    view_clientes_count INTEGER;
BEGIN
    -- Contar rotas diretas do usuário
    SELECT COUNT(*) INTO rotas_count
    FROM vendedor_rotas 
    WHERE vendedor_id = user_id AND ativo = true;
    
    -- Contar clientes diretos (com RLS)
    SELECT COUNT(*) INTO clientes_count
    FROM tabela_clientes;
    
    -- Contar através das views
    SELECT COUNT(*) INTO view_rotas_count FROM vw_metricas_por_rota;
    SELECT COUNT(*) INTO view_cidades_count FROM vw_cidades_completo;
    SELECT COUNT(*) INTO view_clientes_count FROM vw_clientes_completo;
    
    RAISE NOTICE 'RESULTADOS PARA MISTERCLAUDIO:';
    RAISE NOTICE 'vendedor_rotas (direto): %', rotas_count;
    RAISE NOTICE 'tabela_clientes (direto): %', clientes_count;
    RAISE NOTICE 'vw_metricas_por_rota: %', view_rotas_count;
    RAISE NOTICE 'vw_cidades_completo: %', view_cidades_count;
    RAISE NOTICE 'vw_clientes_completo: %', view_clientes_count;
    
    IF view_rotas_count > rotas_count * 5 THEN
        RAISE NOTICE 'PROBLEMA: vw_metricas_por_rota não está respeitando RLS!';
    END IF;
    
    IF view_clientes_count > 100 THEN
        RAISE NOTICE 'PROBLEMA: Views de clientes não estão respeitando RLS!';
    END IF;
END $$;