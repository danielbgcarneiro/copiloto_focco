-- =============================================================================
-- FIX CORRETA: View vw_ranking_rotas usando vendedor_uuid
-- =============================================================================
-- A view original já usa vendedor_uuid corretamente
-- O problema é que está partindo de rotas_estado em vez de clientes
-- =============================================================================

-- CRIAR VIEW CORRIGIDA
CREATE OR REPLACE VIEW vw_ranking_rotas AS
WITH clientes_com_vendedor AS (
    -- Partir dos CLIENTES e seus vendedores
    SELECT DISTINCT
        c.codigo_cliente,
        c.codigo_ibge_cidade,
        -- Usar vendedor da tabela_clientes via cod_vendedor → profiles
        p.id as vendedor_uuid,
        p.apelido as vendedor_apelido,
        -- Pegar rota: prioridade vendedor > cidade > "Sem Rota"
        COALESCE(
            NULLIF(TRIM(p.rota), ''),
            NULLIF(TRIM(re.rota), ''),
            'Sem Rota'
        ) as rota
    FROM tabela_clientes c
    -- Join com profiles usando cod_vendedor
    INNER JOIN profiles p ON c.cod_vendedor = p.codigo_vendedor AND p.cargo = 'vendedor'
    -- Left join com rotas_estado apenas para backup da rota
    LEFT JOIN rotas_estado re ON c.codigo_ibge_cidade = re.codigo_ibge_cidade
    WHERE c.situacao = 'ATIVO'  -- Apenas clientes ativos
),
rotas_performance AS (
    SELECT 
        ccv.rota,
        ccv.rota as nome_rota,
        ccv.vendedor_apelido,
        ccv.vendedor_uuid,
        COUNT(DISTINCT ccv.codigo_cliente) as qtd_oticas,
        COALESCE(SUM(r.valor_vendas_2025), 0::numeric) as vendido_2025,
        COALESCE(SUM(r.meta_2025), 0::numeric) as meta_2025,
        CASE 
            WHEN SUM(r.meta_2025) > 0 
            THEN ROUND((SUM(r.valor_vendas_2025) / SUM(r.meta_2025)) * 100, 1)
            ELSE 0::numeric
        END as percentual_meta
    FROM clientes_com_vendedor ccv
    LEFT JOIN (
        SELECT DISTINCT ON (codigo_cliente) 
            codigo_cliente,
            valor_ano_atual as valor_vendas_2025,
            meta_ano_atual as meta_2025
        FROM analise_rfm
        WHERE data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
    ) r ON ccv.codigo_cliente = r.codigo_cliente
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
  AND (meta_2025 > 0 OR qtd_oticas > 0)  -- Manter lógica original mas incluir rotas com clientes
ORDER BY percentual_meta DESC;

-- VERIFICAR RESULTADO
SELECT 
    'RESULTADO_FINAL' as info,
    COUNT(*) as total_rotas,
    COUNT(DISTINCT vendedor_uuid) as total_vendedores,
    COUNT(*) FILTER (WHERE rota = 'Sem Rota') as rotas_sem_nome
FROM vw_ranking_rotas;

-- VERIFICAR SE RESOLVEU ROTAS VAZIAS
SELECT 
    'CHECK_ROTAS_VAZIAS_FINAL' as info,
    rota,
    vendedor_uuid,
    qtd_oticas,
    vendido_2025,
    meta_2025
FROM vw_ranking_rotas
WHERE rota IS NULL OR rota = '' OR TRIM(rota) = '';