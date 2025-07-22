-- =============================================================================
-- FIX FINAL: Corrigir view vw_ranking_rotas usando cod_vendedor
-- =============================================================================
-- Corrige duplicações e rotas vazias respeitando vendedor único por cliente
-- =============================================================================

-- VERIFICAR RELAÇÃO ENTRE cod_vendedor nas duas tabelas
SELECT 
    'TESTE_RELACAO_VENDEDOR' as info,
    c.codigo_cliente,
    c.cod_vendedor as cod_vendedor_cliente,
    p.codigo_vendedor as cod_vendedor_profile,
    p.id as vendedor_uuid,
    p.rota,
    p.apelido
FROM tabela_clientes c
INNER JOIN profiles p ON c.cod_vendedor = p.codigo_vendedor
WHERE p.cargo = 'vendedor'
LIMIT 10;

-- CRIAR VIEW CORRIGIDA
CREATE OR REPLACE VIEW vw_ranking_rotas AS
WITH clientes_vendedor AS (
    -- Partir de tabela_clientes usando cod_vendedor
    SELECT DISTINCT
        c.codigo_cliente,
        c.cod_vendedor,
        c.codigo_ibge_cidade,
        p.id as vendedor_uuid,
        p.apelido as vendedor_apelido,
        -- Priorizar rota do perfil do vendedor, depois da cidade
        COALESCE(
            NULLIF(TRIM(p.rota), ''),
            NULLIF(TRIM(re.rota), ''),
            'Sem Rota'
        ) as rota,
        COALESCE(
            NULLIF(TRIM(p.rota), ''),
            NULLIF(TRIM(re.rota), ''),
            'Sem Rota'
        ) as nome_rota
    FROM tabela_clientes c
    -- JOIN com profiles via cod_vendedor
    INNER JOIN profiles p ON c.cod_vendedor = p.codigo_vendedor AND p.cargo = 'vendedor'
    -- LEFT JOIN com rotas_estado para pegar rota da cidade se necessário
    LEFT JOIN rotas_estado re ON c.codigo_ibge_cidade = re.codigo_ibge_cidade
),
rotas_performance AS (
    SELECT 
        cv.rota,
        cv.nome_rota,
        cv.vendedor_apelido,
        cv.vendedor_uuid,
        COUNT(DISTINCT cv.codigo_cliente) as qtd_oticas,
        COALESCE(SUM(r.valor_vendas_2025), 0::numeric) as vendido_2025,
        COALESCE(SUM(r.meta_2025), 0::numeric) as meta_2025,
        CASE 
            WHEN SUM(r.meta_2025) > 0 
            THEN ROUND((SUM(r.valor_vendas_2025) / SUM(r.meta_2025)) * 100, 1)
            ELSE 0::numeric
        END as percentual_meta
    FROM clientes_vendedor cv
    LEFT JOIN (
        SELECT DISTINCT ON (codigo_cliente) 
            codigo_cliente,
            valor_ano_atual as valor_vendas_2025,
            meta_ano_atual as meta_2025
        FROM analise_rfm
        WHERE data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
    ) r ON cv.codigo_cliente = r.codigo_cliente
    GROUP BY cv.rota, cv.nome_rota, cv.vendedor_apelido, cv.vendedor_uuid
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
WHERE rota != 'Sem Rota' OR qtd_oticas > 0  -- Mostrar "Sem Rota" apenas se tiver clientes
ORDER BY percentual_meta DESC;

-- TESTAR NOVA VIEW
SELECT 
    'TESTE_APOS_CORRECAO' as info,
    rota,
    vendedor_uuid,
    vendedor_apelido,
    qtd_oticas,
    vendido_2025,
    meta_2025,
    percentual_meta
FROM vw_ranking_rotas
ORDER BY percentual_meta DESC
LIMIT 20;

-- VERIFICAR SE AINDA HÁ ROTAS VAZIAS
SELECT 
    'CHECK_ROTAS_VAZIAS' as info,
    COUNT(*) as total
FROM vw_ranking_rotas
WHERE rota IS NULL OR rota = '' OR TRIM(rota) = '';

-- VERIFICAR SE AINDA HÁ DUPLICATAS
SELECT 
    'CHECK_DUPLICATAS' as info,
    rota,
    COUNT(*) as total_registros,
    STRING_AGG(vendedor_uuid::text, ', ') as vendedores
FROM vw_ranking_rotas
GROUP BY rota
HAVING COUNT(*) > 1;

-- ANÁLISE ESPECÍFICA: Vendedores e suas rotas
SELECT 
    'VENDEDORES_E_ROTAS' as info,
    p.id as vendedor_uuid,
    p.apelido,
    p.codigo_vendedor,
    p.rota as rota_profile,
    COUNT(DISTINCT c.codigo_cliente) as qtd_clientes
FROM profiles p
LEFT JOIN tabela_clientes c ON p.codigo_vendedor = c.cod_vendedor
WHERE p.cargo = 'vendedor'
GROUP BY p.id, p.apelido, p.codigo_vendedor, p.rota
ORDER BY p.rota, p.apelido;

-- =============================================================================
-- RESUMO DAS MUDANÇAS
-- =============================================================================
/*
PRINCIPAIS CORREÇÕES:

1. ORIGEM DOS DADOS:
   - AGORA: tabela_clientes → profiles (via cod_vendedor)
   - Garante vendedor único por cliente

2. TRATAMENTO DE ROTAS:
   - NULLIF(TRIM()) para limpar espaços e strings vazias
   - Prioridade: rota do vendedor > rota da cidade > "Sem Rota"
   - Filtro final remove rotas vazias

3. ELIMINAÇÃO DE DUPLICATAS:
   - JOIN direto via cod_vendedor (relação 1:1)
   - GROUP BY completo incluindo vendedor_uuid

4. PERFORMANCE:
   - DISTINCT apenas onde necessário
   - Índices recomendados abaixo

ÍNDICES RECOMENDADOS PARA PERFORMANCE:
*/

-- CREATE INDEX idx_tabela_clientes_cod_vendedor ON tabela_clientes(cod_vendedor);
-- CREATE INDEX idx_tabela_clientes_codigo_ibge ON tabela_clientes(codigo_ibge_cidade);
-- CREATE INDEX idx_profiles_codigo_vendedor ON profiles(codigo_vendedor) WHERE cargo = 'vendedor';
-- CREATE INDEX idx_analise_rfm_data ON analise_rfm(data_analise);

/*
VALIDAÇÕES PÓS-IMPLEMENTAÇÃO:
1. Executar CHECK_ROTAS_VAZIAS - deve retornar 0
2. Executar CHECK_DUPLICATAS - não deve retornar resultados
3. Verificar se todos os vendedores aparecem corretamente
4. Confirmar que o frontend não mostra mais rotas vazias
*/