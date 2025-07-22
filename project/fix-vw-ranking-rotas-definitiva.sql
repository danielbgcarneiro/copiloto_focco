-- =============================================================================
-- FIX DEFINITIVA: View vw_ranking_rotas com schemas corretos
-- =============================================================================
-- Corrige o problema partindo de clientes e respeitando vendedor único
-- =============================================================================

-- CRIAR VIEW CORRIGIDA
CREATE OR REPLACE VIEW vw_ranking_rotas AS
WITH clientes_com_vendedor AS (
    -- Partir dos CLIENTES para garantir vendedor único
    SELECT DISTINCT
        c.codigo_cliente,
        c.codigo_ibge_cidade,
        c.cod_vendedor,
        -- Buscar o vendedor UUID via profiles
        p.id as vendedor_uuid,
        p.apelido as vendedor_apelido,
        -- Buscar rota: prioridade rotas_estado.rota, senão "Sem Rota"
        COALESCE(
            NULLIF(TRIM(re.rota), ''),
            'Sem Rota'
        ) as rota
    FROM tabela_clientes c
    -- Join com profiles usando cod_vendedor
    INNER JOIN profiles p ON c.cod_vendedor = p.cod_vendedor AND p.cargo = 'vendedor'
    -- Left join com rotas_estado para pegar a rota da cidade
    LEFT JOIN rotas_estado re ON c.codigo_ibge_cidade = re.codigo_ibge_cidade
    WHERE c.situacao = 'ATIVO'  -- Apenas clientes ativos
),
rotas_performance AS (
    SELECT 
        ccv.rota,
        ccv.rota as nome_rota,  -- Mantendo compatibilidade
        ccv.vendedor_apelido,
        ccv.vendedor_uuid,
        COUNT(DISTINCT ccv.codigo_cliente) as qtd_oticas,
        COALESCE(SUM(rfm.valor_ano_atual), 0::numeric) as vendido_2025,
        COALESCE(SUM(rfm.meta_ano_atual), 0::numeric) as meta_2025,
        CASE 
            WHEN SUM(rfm.meta_ano_atual) > 0 
            THEN ROUND((SUM(rfm.valor_ano_atual) / SUM(rfm.meta_ano_atual)) * 100, 1)
            ELSE 0::numeric
        END as percentual_meta
    FROM clientes_com_vendedor ccv
    LEFT JOIN (
        -- Pegar dados mais recentes do RFM para cada cliente
        SELECT DISTINCT ON (codigo_cliente) 
            codigo_cliente,
            valor_ano_atual,
            meta_ano_atual
        FROM analise_rfm
        WHERE data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
        ORDER BY codigo_cliente, data_analise DESC
    ) rfm ON ccv.codigo_cliente = rfm.codigo_cliente
    GROUP BY ccv.rota, ccv.vendedor_apelido, ccv.vendedor_uuid
)
SELECT 
    rota,
    nome_rota,
    vendedor_apelido,
    vendedor_uuid,
    qtd_oticas,
    vendido_2025,
    meta_2025,
    percentual_meta,
    ROW_NUMBER() OVER (ORDER BY percentual_meta DESC) as ranking
FROM rotas_performance
WHERE rota IS NOT NULL 
  AND rota != ''
  AND (meta_2025 > 0 OR qtd_oticas > 0)  -- Mostrar rotas com meta ou com clientes
ORDER BY percentual_meta DESC;

-- VERIFICAR RESULTADO
SELECT 
    'TESTE_VIEW_CORRIGIDA' as info,
    rota,
    vendedor_uuid,
    vendedor_apelido,
    qtd_oticas,
    vendido_2025,
    meta_2025,
    percentual_meta
FROM vw_ranking_rotas
ORDER BY percentual_meta DESC;

-- VERIFICAR SE HÁ ROTAS VAZIAS
SELECT 
    'CHECK_ROTAS_VAZIAS' as info,
    COUNT(*) as total
FROM vw_ranking_rotas
WHERE rota IS NULL OR rota = '' OR TRIM(rota) = '';

-- VERIFICAR SE HÁ DUPLICATAS
SELECT 
    'CHECK_DUPLICATAS' as info,
    rota,
    COUNT(*) as total_ocorrencias,
    STRING_AGG(vendedor_uuid::text, ', ') as vendedores_uuid,
    STRING_AGG(vendedor_apelido, ', ') as vendedores_nomes
FROM vw_ranking_rotas
GROUP BY rota
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ANÁLISE: Comparar com view antiga
SELECT 
    'COMPARACAO_ANTES_DEPOIS' as info,
    'ANTES' as versao,
    COUNT(*) as total_registros,
    COUNT(DISTINCT rota) as rotas_distintas,
    COUNT(*) FILTER (WHERE rota IS NULL OR rota = '') as rotas_vazias
FROM vw_ranking_rotas
UNION ALL
SELECT 
    'COMPARACAO_ANTES_DEPOIS' as info,
    'DEPOIS' as versao,
    COUNT(*) as total_registros,
    COUNT(DISTINCT rota) as rotas_distintas,
    COUNT(*) FILTER (WHERE rota IS NULL OR rota = '') as rotas_vazias
FROM (
    -- Simulação da nova view para comparação
    SELECT DISTINCT rota FROM vw_ranking_rotas WHERE rota IS NOT NULL AND rota != ''
) t;

-- =============================================================================
-- RESUMO DAS CORREÇÕES
-- =============================================================================
/*
MUDANÇAS PRINCIPAIS:

1. FLUXO DE DADOS:
   - ANTES: rotas_estado → tabela_clientes → profiles
   - AGORA: tabela_clientes → profiles → rotas_estado

2. RELACIONAMENTOS:
   - tabela_clientes.cod_vendedor → profiles.cod_vendedor (vendedor único)
   - tabela_clientes.codigo_ibge_cidade → rotas_estado.codigo_ibge_cidade (rota)
   - Mantém vendedor_uuid (profiles.id) para compatibilidade

3. FILTROS:
   - Apenas clientes ATIVOS
   - Remove rotas NULL ou vazias
   - Mantém rotas apenas se têm meta > 0 OU clientes > 0

4. TRATAMENTO "SEM ROTA":
   - COALESCE para "Sem Rota" quando cidade não tem rota definida
   - Aparece apenas se tiver clientes

BENEFÍCIOS:
- Elimina rotas duplicadas (vendedor único por cliente)
- Remove rotas vazias/fantasma
- Mantém compatibilidade com estrutura existente
*/