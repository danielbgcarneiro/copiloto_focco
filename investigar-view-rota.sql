-- =====================================================
-- INVESTIGAR VIEW vw_metricas_por_rota
-- =====================================================
-- Execute no Supabase SQL Editor

-- 1. Ver a estrutura da view
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'vw_metricas_por_rota' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Ver a definição completa da view
SELECT definition
FROM pg_views 
WHERE viewname = 'vw_metricas_por_rota' 
  AND schemaname = 'public';

-- 3. Verificar se há coluna de vendedor
SELECT 
    'VERIFICACAO_COLUNAS' as teste,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'vw_metricas_por_rota' 
              AND column_name LIKE '%vendedor%'
        ) THEN 'TEM COLUNA VENDEDOR'
        ELSE 'SEM COLUNA VENDEDOR'
    END as resultado;

-- 4. Testar consulta direta como misterclaudio
-- (Execute logado como misterclaudio1972@gmail.com)
SELECT 
    'TESTE_DIRETO' as tipo,
    *
FROM vw_metricas_por_rota
LIMIT 5;

-- 5. Comparar com vw_clientes_completo (que funciona)
SELECT 
    'COMPARACAO' as tipo,
    COUNT(*) as total_rotas,
    STRING_AGG(DISTINCT rota, ', ') as rotas_encontradas
FROM vw_clientes_completo;

-- 6. Verificar se auth.uid() está disponível
SELECT 
    'AUTH_UID' as teste,
    auth.uid() as user_id,
    CASE 
        WHEN auth.uid() IS NULL THEN 'AUTH.UID() NULL'
        ELSE 'AUTH.UID() FUNCIONA'
    END as status;