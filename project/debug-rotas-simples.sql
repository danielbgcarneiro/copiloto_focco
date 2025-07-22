-- =============================================================================
-- DEBUG: Investigar duplicação de rotas no ranking
-- =============================================================================
-- Execute estas queries no Supabase SQL Editor para investigar o problema
-- =============================================================================

-- 1. DADOS BRUTOS DA VIEW vw_ranking_rotas
SELECT 
    'DADOS_BRUTOS' as info,
    rota,
    nome_rota,
    vendedor_uuid,
    vendido_2025,
    meta_2025,
    percentual_meta,
    ranking
FROM vw_ranking_rotas
ORDER BY percentual_meta DESC;

-- 2. CONTAR OCORRÊNCIAS DE CADA ROTA
SELECT 
    'CONTAGEM_ROTAS' as info,
    COALESCE(rota, 'ROTA_VAZIA') as nome_rota,
    COUNT(*) as total_ocorrencias,
    STRING_AGG(CAST(vendedor_uuid as TEXT), ', ') as vendedores_uuids
FROM vw_ranking_rotas
GROUP BY rota
HAVING COUNT(*) > 1
ORDER BY total_ocorrencias DESC;

-- 3. IDENTIFICAR ROTAS VAZIAS OU NULL
SELECT 
    'ROTAS_VAZIAS' as info,
    vendedor_uuid,
    rota,
    nome_rota,
    vendido_2025,
    meta_2025,
    percentual_meta
FROM vw_ranking_rotas
WHERE rota IS NULL OR rota = '' OR TRIM(rota) = '';

-- 4. FOCO NA ROTA "João Pessoa / Litoral"
SELECT 
    'JOAO_PESSOA_ESPECIFICO' as info,
    rota,
    nome_rota,
    vendedor_uuid,
    vendido_2025,
    meta_2025,
    percentual_meta,
    ranking
FROM vw_ranking_rotas
WHERE rota ILIKE '%joão pessoa%' OR rota ILIKE '%litoral%'
ORDER BY vendedor_uuid;

-- 5. VERIFICAR SE HÁ MÚLTIPLOS VENDEDORES PARA A MESMA ROTA
SELECT 
    'MULTIPLOS_VENDEDORES_POR_ROTA' as info,
    rota,
    COUNT(DISTINCT vendedor_uuid) as qtd_vendedores_distintos,
    STRING_AGG(CAST(vendedor_uuid as TEXT), ', ') as vendedores_list
FROM vw_ranking_rotas
WHERE rota IS NOT NULL AND rota != ''
GROUP BY rota
HAVING COUNT(DISTINCT vendedor_uuid) > 1
ORDER BY qtd_vendedores_distintos DESC;

-- 6. VERIFICAR SE UM MESMO VENDEDOR TEM MÚLTIPLAS ROTAS
SELECT 
    'MULTIPLAS_ROTAS_POR_VENDEDOR' as info,
    vendedor_uuid,
    COUNT(DISTINCT rota) as qtd_rotas_distintas,
    STRING_AGG(DISTINCT rota, ' | ') as rotas_list
FROM vw_ranking_rotas
WHERE rota IS NOT NULL AND rota != ''
GROUP BY vendedor_uuid
HAVING COUNT(DISTINCT rota) > 1
ORDER BY qtd_rotas_distintas DESC;

-- 7. VERIFICAR DEFINIÇÃO DA VIEW (para entender a estrutura)
SELECT 
    'DEFINICAO_VIEW' as info,
    viewname,
    LEFT(definition, 500) as definicao_parcial
FROM pg_views 
WHERE viewname = 'vw_ranking_rotas' AND schemaname = 'public';

-- 8. DADOS AGREGADOS PARA ENTENDER O PADRÃO
SELECT 
    'RESUMO_GERAL' as info,
    COUNT(*) as total_registros,
    COUNT(DISTINCT rota) as rotas_unicas,
    COUNT(DISTINCT vendedor_uuid) as vendedores_unicos,
    COUNT(*) FILTER (WHERE rota IS NULL OR rota = '') as rotas_vazias,
    AVG(percentual_meta) as percentual_medio,
    MAX(percentual_meta) as percentual_maximo
FROM vw_ranking_rotas;

-- 9. ORDENAÇÃO EXATA COMO NO FRONTEND (para comparar com a tela)
SELECT 
    'ORDENACAO_FRONTEND' as info,
    ROW_NUMBER() OVER (ORDER BY percentual_meta DESC) as posicao,
    COALESCE(rota, '<<VAZIO>>') as rota_display,
    vendido_2025,
    meta_2025,
    ROUND(percentual_meta, 1) as percentual,
    vendedor_uuid
FROM vw_ranking_rotas
ORDER BY percentual_meta DESC;

-- =============================================================================
-- INTERPRETAÇÃO DOS RESULTADOS:
-- =============================================================================
/*
PROBLEMAS POSSÍVEIS E COMO IDENTIFICÁ-LOS:

1. ROTA DUPLICADA:
   - Query 2 mostrará rotas com COUNT > 1
   - Indica problema na view ou dados base

2. ROTA VAZIA:
   - Query 3 mostrará registros com rota NULL/vazia
   - HTML mostra <span> vazio mas com dados

3. MÚLTIPLOS VENDEDORES NA MESMA ROTA:
   - Query 5 mostrará rotas com múltiplos vendedores
   - Pode causar duplicação se RLS não funcionar corretamente

4. UM VENDEDOR COM MÚLTIPLAS ROTAS:
   - Query 6 mostrará vendedores com múltiplas rotas
   - Normal se vendedor atende várias regiões

5. PROBLEMA NA ORDENAÇÃO:
   - Query 9 replica exatamente a ordenação do frontend
   - Compare com o que aparece na tela

NEXT STEPS APÓS EXECUTAR:
- Se encontrar duplicatas: investigar definição da view
- Se encontrar rotas vazias: verificar dados fonte
- Se tudo parecer normal: problema pode ser no RLS ou cache
*/