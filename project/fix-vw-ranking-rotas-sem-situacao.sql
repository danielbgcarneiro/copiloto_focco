-- =============================================================================
-- FIX: View vw_ranking_rotas SEM filtro de situação
-- =============================================================================

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
    -- SEM FILTRO DE SITUAÇÃO
),
rotas_performance AS (
    SELECT 
        ccv.rota,
        ccv.rota as nome_rota,
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
  AND (meta_2025 > 0 OR qtd_oticas > 0)
ORDER BY percentual_meta DESC;

-- TESTAR SE AGORA TEM DADOS
SELECT 
    'TESTE_VIEW_SEM_FILTRO' as info,
    COUNT(*) as total_rotas,
    COUNT(DISTINCT vendedor_uuid) as vendedores
FROM vw_ranking_rotas;

-- VER PRIMEIROS RESULTADOS
SELECT 
    'AMOSTRA_RESULTADOS' as info,
    rota,
    vendedor_apelido,
    qtd_oticas,
    vendido_2025,
    meta_2025,
    percentual_meta
FROM vw_ranking_rotas
ORDER BY percentual_meta DESC
LIMIT 10;