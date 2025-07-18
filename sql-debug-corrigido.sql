-- Script SQL corrigido para debug de RLS
-- Execute no Supabase SQL Editor

-- 1. Verificar RLS nas tabelas principais
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('tabela_clientes', 'vendedor_rotas', 'rotas_estado')
  AND schemaname = 'public';

-- 2. Verificar políticas RLS existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual as policy_expression
FROM pg_policies 
WHERE tablename IN ('tabela_clientes', 'vendedor_rotas', 'rotas_estado')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Verificar views e sua configuração security_invoker
SELECT 
    viewname,
    definition,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'SIM'
        WHEN definition ILIKE '%security_invoker%' THEN 'PARCIAL'
        ELSE 'NÃO'
    END as tem_security_invoker
FROM pg_views 
WHERE viewname IN (
    'vw_metricas_por_rota',     -- Problemática (Rotas)
    'vw_cidades_completo',      -- Problemática (Cidades)  
    'vw_clientes_completo',     -- Problemática (Clientes)
    'vw_ranking_rotas',         -- Funcional (Dashboard)
    'vw_top10_cidades',         -- Funcional (Dashboard)
    'vw_dashboard_metricas'     -- Funcional (Dashboard)
)
  AND schemaname = 'public'
ORDER BY tem_security_invoker DESC, viewname;

-- 4. Testar contexto de autenticação atual
SELECT 
    'auth.uid()' as funcao,
    auth.uid() as valor,
    CASE 
        WHEN auth.uid() IS NULL THEN 'NULL - Executando como admin'
        ELSE 'OK - Contexto do usuário'
    END as status

UNION ALL

SELECT 
    'auth.email()' as funcao,
    auth.email() as valor,
    CASE 
        WHEN auth.email() IS NULL THEN 'NULL - Sem contexto de usuário'
        ELSE 'OK - Email do usuário'
    END as status;

-- 5. Verificar se as views referenciam tabelas com RLS
SELECT 
    v.viewname,
    v.definition,
    CASE 
        WHEN v.definition ILIKE '%tabela_clientes%' THEN 'USA tabela_clientes'
        WHEN v.definition ILIKE '%vendedor_rotas%' THEN 'USA vendedor_rotas'
        WHEN v.definition ILIKE '%rotas_estado%' THEN 'USA rotas_estado'
        ELSE 'Não usa tabelas principais'
    END as dependencias_rls
FROM pg_views v
WHERE v.viewname IN (
    'vw_metricas_por_rota', 'vw_cidades_completo', 'vw_clientes_completo',
    'vw_ranking_rotas', 'vw_top10_cidades', 'vw_dashboard_metricas'
)
  AND v.schemaname = 'public'
ORDER BY dependencias_rls, viewname;

-- 6. Contar registros em views (apenas se logado como misterclaudio)
-- ATENÇÃO: Execute isso apenas logado como misterclaudio1972@gmail.com
SELECT 'CONTAGEM DE REGISTROS' as info;

-- Views que funcionam (Dashboard)
SELECT 'vw_dashboard_metricas' as view_name, COUNT(*) as total_registros 
FROM vw_dashboard_metricas

UNION ALL

SELECT 'vw_ranking_rotas' as view_name, COUNT(*) as total_registros 
FROM vw_ranking_rotas

UNION ALL

SELECT 'vw_top10_cidades' as view_name, COUNT(*) as total_registros 
FROM vw_top10_cidades

UNION ALL

-- Views problemáticas
SELECT 'vw_metricas_por_rota' as view_name, COUNT(*) as total_registros 
FROM vw_metricas_por_rota

UNION ALL

SELECT 'vw_cidades_completo' as view_name, COUNT(*) as total_registros 
FROM vw_cidades_completo

UNION ALL

SELECT 'vw_clientes_completo' as view_name, COUNT(*) as total_registros 
FROM vw_clientes_completo

ORDER BY view_name;