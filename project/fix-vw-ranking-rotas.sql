-- =============================================================================
-- FIX: Corrigir duplicações e rotas vazias na view vw_ranking_rotas
-- =============================================================================
-- Este script identifica e corrige o problema de rotas duplicadas e vazias
-- =============================================================================

-- PASSO 1: Verificar definição atual da view
SELECT 
    'DEFINICAO_ATUAL' as info,
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'vw_ranking_rotas' 
  AND schemaname = 'public';

-- PASSO 2: Analisar os dados problemáticos em detalhe
-- Rotas vazias (3 registros)
SELECT 
    'ANALISE_ROTAS_VAZIAS' as info,
    vendedor_uuid,
    rota,
    nome_rota,
    vendido_2025,
    meta_2025,
    percentual_meta,
    qtd_oticas,
    ranking
FROM vw_ranking_rotas
WHERE rota IS NULL OR rota = '' OR TRIM(rota) = ''
ORDER BY vendedor_uuid;

-- PASSO 3: Verificar vendedores com rotas vazias
WITH vendedores_problema AS (
    SELECT DISTINCT vendedor_uuid
    FROM vw_ranking_rotas
    WHERE rota IS NULL OR rota = '' OR TRIM(rota) = ''
)
SELECT 
    'VENDEDORES_COM_ROTAS_VAZIAS' as info,
    p.id,
    p.nome,
    p.codigo_vendedor,
    p.cargo,
    p.rota
FROM profiles p
INNER JOIN vendedores_problema vp ON p.id = vp.vendedor_uuid;

-- PASSO 4: Verificar duplicação de Redenção
SELECT 
    'ANALISE_REDENCAO' as info,
    vendedor_uuid,
    rota,
    nome_rota,
    vendido_2025,
    meta_2025,
    percentual_meta
FROM vw_ranking_rotas
WHERE rota = 'Redenção'
ORDER BY vendedor_uuid;

-- PASSO 5: Verificar se há vendedores sem rota definida em profiles
SELECT 
    'VENDEDORES_SEM_ROTA' as info,
    id as vendedor_uuid,
    nome,
    codigo_vendedor,
    cargo,
    rota
FROM profiles
WHERE cargo = 'vendedor'
  AND (rota IS NULL OR rota = '' OR TRIM(rota) = '');

-- PASSO 6: Verificar todas as rotas únicas dos vendedores
SELECT 
    'ROTAS_UNICAS_PROFILES' as info,
    rota,
    COUNT(*) as qtd_vendedores
FROM profiles
WHERE cargo = 'vendedor'
GROUP BY rota
ORDER BY rota;

-- =============================================================================
-- SOLUÇÃO PROPOSTA
-- =============================================================================
-- A view vw_ranking_rotas provavelmente está:
-- 1. Incluindo vendedores sem rota definida
-- 2. Fazendo GROUP BY incorreto que agrupa vendedores diferentes na mesma rota
--
-- OPÇÃO 1: Filtrar rotas vazias na view (solução rápida)
/*
CREATE OR REPLACE VIEW vw_ranking_rotas AS
SELECT 
    -- campos da view original
FROM (
    -- query original da view
) base
WHERE rota IS NOT NULL AND rota != '' AND TRIM(rota) != '';
*/

-- OPÇÃO 2: Garantir que cada vendedor tenha sua própria linha (solução completa)
/*
CREATE OR REPLACE VIEW vw_ranking_rotas AS
WITH vendas_por_vendedor_rota AS (
    SELECT 
        v.vendedor_uuid,
        p.rota,
        p.nome as nome_rota,
        COUNT(DISTINCT v.codigo_cliente) as qtd_oticas,
        COALESCE(SUM(v.valor_vendas_2025), 0) as vendido_2025,
        -- Meta deve vir da tabela metas_vendedores
        COALESCE(mv.meta_valor, 0) as meta_2025
    FROM vendas v
    INNER JOIN profiles p ON v.vendedor_uuid = p.id
    LEFT JOIN metas_vendedores mv ON (
        mv.cod_vendedor = p.codigo_vendedor::bigint
        AND mv.ano = 2025
        -- Ajustar conforme necessário
    )
    WHERE p.cargo = 'vendedor'
      AND p.rota IS NOT NULL 
      AND p.rota != ''
    GROUP BY v.vendedor_uuid, p.rota, p.nome, mv.meta_valor
)
SELECT 
    vendedor_uuid,
    rota,
    nome_rota,
    qtd_oticas,
    vendido_2025,
    meta_2025,
    CASE 
        WHEN meta_2025 > 0 
        THEN ROUND((vendido_2025::numeric / meta_2025 * 100), 1)
        ELSE 0 
    END as percentual_meta,
    DENSE_RANK() OVER (ORDER BY 
        CASE 
            WHEN meta_2025 > 0 
            THEN vendido_2025::numeric / meta_2025 
            ELSE 0 
        END DESC
    ) as ranking
FROM vendas_por_vendedor_rota;
*/

-- PASSO 7: Testar se filtrar rotas vazias resolve
SELECT 
    'PREVIEW_SEM_ROTAS_VAZIAS' as info,
    rota,
    nome_rota,
    vendedor_uuid,
    vendido_2025,
    meta_2025,
    percentual_meta
FROM vw_ranking_rotas
WHERE rota IS NOT NULL AND rota != '' AND TRIM(rota) != ''
ORDER BY percentual_meta DESC;

-- PASSO 8: Verificar se há GROUP BY na view atual
-- Execute a query do PASSO 1 e procure por GROUP BY
-- Se houver GROUP BY por rota sem incluir vendedor_uuid, esse é o problema!

-- =============================================================================
-- AÇÃO IMEDIATA (TEMPORÁRIA)
-- =============================================================================
-- Enquanto não corrigimos a view, você pode adicionar um filtro no frontend:
-- 
-- No arquivo dashboard.ts, linha ~140, adicione:
-- .filter('rota', 'neq', '')
-- 
-- Ou no map do frontend, linha ~523:
-- {dashboardData.rankingRotas.filter(rota => rota.rota && rota.rota.trim() !== '').map((rota) => (
--
-- Mas o ideal é corrigir a view no banco!