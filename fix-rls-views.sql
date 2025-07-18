-- Script para corrigir RLS nas views problemáticas
-- Execute este script no Supabase SQL Editor

-- 1. Verificar views atuais que podem ter problema de RLS
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE viewname IN ('vw_metricas_por_rota', 'vw_cidades_completo')
ORDER BY viewname;

-- 2. Verificar se as views têm security_invoker configurado
SELECT 
    schemaname,
    viewname,
    -- Verificar se a view foi criada com security_invoker
    CASE 
        WHEN definition ILIKE '%security_invoker%' THEN 'SIM'
        ELSE 'NÃO'
    END as tem_security_invoker
FROM pg_views 
WHERE viewname IN ('vw_metricas_por_rota', 'vw_cidades_completo')
ORDER BY viewname;

-- 3. Para cada view problemática, você precisará recriar com security_invoker = true
-- IMPORTANTE: Execute apenas UMA view por vez e teste antes de continuar

-- Para vw_metricas_por_rota:
/*
DROP VIEW IF EXISTS vw_metricas_por_rota;
CREATE VIEW vw_metricas_por_rota 
WITH (security_invoker = true) AS
-- [Cole aqui a definição atual da view]
-- Você pode obter a definição executando:
-- SELECT definition FROM pg_views WHERE viewname = 'vw_metricas_por_rota';
*/

-- Para vw_cidades_completo:
/*
DROP VIEW IF EXISTS vw_cidades_completo;
CREATE VIEW vw_cidades_completo
WITH (security_invoker = true) AS  
-- [Cole aqui a definição atual da view]
-- Você pode obter a definição executando:
-- SELECT definition FROM pg_views WHERE viewname = 'vw_cidades_completo';
*/

-- 4. Após recriar cada view, teste com um usuário vendedor:
-- SELECT COUNT(*) FROM vw_metricas_por_rota;
-- SELECT COUNT(*) FROM vw_cidades_completo;

-- 5. Teste específico para o usuário misterclaudio:
/*
-- Simular login como misterclaudio (substitua pelo UUID real se necessário)
SET SESSION AUTHORIZATION 'misterclaudio1972@gmail.com';

-- Testar se as views agora retornam apenas os dados do usuário
SELECT COUNT(*) as total_rotas FROM vw_metricas_por_rota;
SELECT COUNT(*) as total_cidades FROM vw_cidades_completo;

-- Resetar autorização
RESET SESSION AUTHORIZATION;
*/

-- 6. Verificar se funcionou comparando com tabelas de permissão:
SELECT 
    'vendedor_rotas' as tabela,
    COUNT(*) as registros
FROM vendedor_rotas 
WHERE vendedor_id = '09f316d7-eeac-4828-85a0-ad1b891f8460' 
  AND ativo = true

UNION ALL

SELECT 
    'vw_metricas_por_rota' as tabela,
    COUNT(*) as registros  
FROM vw_metricas_por_rota;

-- Os números devem ser similares se o RLS estiver funcionando corretamente