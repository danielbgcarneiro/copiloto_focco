-- =============================================================================
-- FIX: Corrigir view vw_ranking_rotas para respeitar vendedor único por cliente
-- =============================================================================
-- A view deve partir de tabela_clientes e respeitar o vendedor designado
-- =============================================================================

-- PASSO 1: Analisar estrutura da tabela_clientes
SELECT 
    'ESTRUTURA_TABELA_CLIENTES' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tabela_clientes'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- PASSO 2: Verificar relação cliente-vendedor na tabela_clientes
SELECT 
    'AMOSTRA_CLIENTES' as info,
    codigo_cliente,
    codigo_ibge_cidade,
    vendedor_uuid,
    nome_fantasia
FROM tabela_clientes
LIMIT 10;

-- PASSO 3: Verificar se há clientes sem vendedor
SELECT 
    'CLIENTES_SEM_VENDEDOR' as info,
    COUNT(*) as total
FROM tabela_clientes
WHERE vendedor_uuid IS NULL;

-- PASSO 4: Nova definição da view corrigida
CREATE OR REPLACE VIEW vw_ranking_rotas AS
WITH clientes_vendedor AS (
    -- PARTIR DE tabela_clientes respeitando vendedor único
    SELECT 
        c.codigo_cliente,
        c.vendedor_uuid,
        c.codigo_ibge_cidade,
        -- Buscar rota do vendedor ou da cidade
        COALESCE(p.rota, re.rota, 'Sem Rota') as rota,
        COALESCE(p.rota, re.rota, 'Sem Rota') as nome_rota,
        p.apelido as vendedor_apelido
    FROM tabela_clientes c
    -- JOIN com profiles usando vendedor da tabela_clientes
    INNER JOIN profiles p ON c.vendedor_uuid = p.id
    -- LEFT JOIN com rotas_estado apenas para pegar nome da rota se necessário
    LEFT JOIN rotas_estado re ON c.codigo_ibge_cidade = re.codigo_ibge_cidade
    WHERE p.cargo = 'vendedor'
),
rotas_performance AS (
    SELECT 
        cv.rota,
        cv.nome_rota,
        cv.vendedor_apelido,
        cv.vendedor_uuid,
        COUNT(DISTINCT cv.codigo_cliente) as qtd_oticas,
        COALESCE(SUM(r.valor_vendas_2025), 0) as vendido_2025,
        COALESCE(SUM(r.meta_2025), 0) as meta_2025,
        CASE 
            WHEN SUM(r.meta_2025) > 0 
            THEN ROUND((SUM(r.valor_vendas_2025) / SUM(r.meta_2025)) * 100, 1)
            ELSE 0 
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
WHERE rota IS NOT NULL AND rota != ''  -- Filtrar rotas vazias
  AND qtd_oticas > 0  -- Apenas rotas com clientes
ORDER BY percentual_meta DESC;

-- PASSO 5: Testar a nova view
SELECT 
    'TESTE_NOVA_VIEW' as info,
    rota,
    vendedor_uuid,
    qtd_oticas,
    vendido_2025,
    meta_2025,
    percentual_meta
FROM vw_ranking_rotas
ORDER BY percentual_meta DESC;

-- PASSO 6: Verificar se ainda há rotas vazias
SELECT 
    'VERIFICA_ROTAS_VAZIAS' as info,
    COUNT(*) as total
FROM vw_ranking_rotas
WHERE rota IS NULL OR rota = '' OR rota = 'Sem Rota';

-- PASSO 7: Verificar se ainda há duplicatas
SELECT 
    'VERIFICA_DUPLICATAS' as info,
    rota,
    COUNT(*) as total_registros,
    STRING_AGG(vendedor_uuid::text, ', ') as vendedores
FROM vw_ranking_rotas
GROUP BY rota
HAVING COUNT(*) > 1;

-- =============================================================================
-- ANÁLISE DAS MUDANÇAS
-- =============================================================================
/*
PRINCIPAIS ALTERAÇÕES:

1. ORIGEM DOS DADOS:
   - ANTES: rotas_estado → clientes → vendedor
   - AGORA: clientes → vendedor (direto da tabela_clientes)

2. VENDEDOR ÚNICO:
   - ANTES: Pegava vendedor de rotas_estado (pode ter múltiplos)
   - AGORA: Pega vendedor_uuid direto de tabela_clientes (único por cliente)

3. TRATAMENTO DE ROTAS:
   - Prioridade 1: rota do vendedor (profiles)
   - Prioridade 2: rota da cidade (rotas_estado)
   - Prioridade 3: 'Sem Rota' (para casos não mapeados)

4. FILTROS:
   - Remove rotas vazias/NULL
   - Remove rotas sem clientes (qtd_oticas > 0)

BENEFÍCIOS:
- Garante vendedor único por cliente
- Elimina rotas duplicadas
- Remove rotas sem clientes
- Mantém compatibilidade com estrutura atual
*/

-- PASSO 8: Query alternativa caso tabela_clientes não tenha vendedor_uuid
-- (usar apenas se necessário)
/*
-- Se tabela_clientes não tem vendedor_uuid, precisamos buscar de outra forma
SELECT 
    'ALTERNATIVA_SEM_VENDEDOR_UUID' as info,
    'Verificar como relacionar cliente com vendedor' as acao;
    
-- Possíveis alternativas:
-- 1. Existe outra tabela de relacionamento cliente-vendedor?
-- 2. O vendedor está em algum campo da tabela_clientes?
-- 3. Precisamos criar essa relação baseada em regras de negócio?
*/