-- ============================================================================
-- SCRIPT DE VERIFICAÇÃO - ESTRUTURA DE DADOS PARA TABELAS OURO/PRATA/BRONZE
-- ============================================================================
-- Execute estas queries no Supabase SQL Editor para verificar a estrutura

-- 1. VERIFICAR PROFILES DO USUÁRIO
-- ============================================================================
SELECT 
    'PROFILES' as tabela,
    id as user_uuid,
    cod_vendedor,
    apelido,
    cargo,
    status
FROM profiles
WHERE id = '09f316d7-eeac-4828-85a0-ad1b891f8460'  -- Substitua pelo seu UUID
LIMIT 1;

-- 2. VERIFICAR CLIENTES DO VENDEDOR
-- ============================================================================
SELECT 
    'TABELA_CLIENTES' as tabela,
    COUNT(*) as total_clientes,
    MIN(codigo_cliente) as primeiro_cliente,
    MAX(codigo_cliente) as ultimo_cliente
FROM tabela_clientes
WHERE cod_vendedor = 16  -- Substitua pelo seu cod_vendedor
GROUP BY cod_vendedor;

-- 3. LISTAR ALGUNS CLIENTES DO VENDEDOR
-- ============================================================================
SELECT 
    codigo_cliente,
    nome_fantasia,
    cidade,
    cod_vendedor
FROM tabela_clientes
WHERE cod_vendedor = 16  -- Substitua pelo seu cod_vendedor
ORDER BY codigo_cliente
LIMIT 10;

-- 4. VERIFICAR VALORES ÚNICOS EM analise_rfm.perfil
-- ============================================================================
SELECT 
    'ANALISE_RFM - VALORES DE PERFIL' as info,
    perfil,
    COUNT(*) as quantidade
FROM analise_rfm
GROUP BY perfil
ORDER BY perfil;

-- 5. VERIFICAR DADOS RFM PARA CLIENTES DO VENDEDOR (OURO = '30')
-- ============================================================================
SELECT 
    'DADOS_RFM_OURO' as info,
    r.codigo_cliente,
    r.perfil,
    r.meta_ano_atual,
    r.valor_ano_atual,
    ROUND((r.valor_ano_atual::numeric / NULLIF(r.meta_ano_atual, 0)) * 100, 2) as percentual,
    c.nome_fantasia
FROM analise_rfm r
INNER JOIN tabela_clientes c ON r.codigo_cliente = c.codigo_cliente
WHERE c.cod_vendedor = 16  -- Substitua pelo seu cod_vendedor
  AND r.perfil = '30'      -- Perfil Ouro
ORDER BY r.valor_ano_atual DESC
LIMIT 10;

-- 6. VERIFICAR DADOS RFM PARA CLIENTES DO VENDEDOR (PRATA = '10')
-- ============================================================================
SELECT 
    'DADOS_RFM_PRATA' as info,
    r.codigo_cliente,
    r.perfil,
    r.meta_ano_atual,
    r.valor_ano_atual,
    ROUND((r.valor_ano_atual::numeric / NULLIF(r.meta_ano_atual, 0)) * 100, 2) as percentual,
    c.nome_fantasia
FROM analise_rfm r
INNER JOIN tabela_clientes c ON r.codigo_cliente = c.codigo_cliente
WHERE c.cod_vendedor = 16  -- Substitua pelo seu cod_vendedor
  AND r.perfil = '10'      -- Perfil Prata
ORDER BY r.valor_ano_atual DESC
LIMIT 10;

-- 7. VERIFICAR DADOS RFM PARA CLIENTES DO VENDEDOR (BRONZE = '5')
-- ============================================================================
SELECT 
    'DADOS_RFM_BRONZE' as info,
    r.codigo_cliente,
    r.perfil,
    r.meta_ano_atual,
    r.valor_ano_atual,
    ROUND((r.valor_ano_atual::numeric / NULLIF(r.meta_ano_atual, 0)) * 100, 2) as percentual,
    c.nome_fantasia
FROM analise_rfm r
INNER JOIN tabela_clientes c ON r.codigo_cliente = c.codigo_cliente
WHERE c.cod_vendedor = 16  -- Substitua pelo seu cod_vendedor
  AND r.perfil = '5'       -- Perfil Bronze
ORDER BY r.valor_ano_atual DESC
LIMIT 10;

-- 8. RESUMO FINAL POR PERFIL
-- ============================================================================
SELECT 
    'RESUMO_POR_PERFIL' as info,
    CASE r.perfil
        WHEN '30' THEN 'OURO'
        WHEN '10' THEN 'PRATA'
        WHEN '5' THEN 'BRONZE'
        ELSE 'DESCONHECIDO'
    END as perfil_nome,
    r.perfil,
    COUNT(*) as total_clientes,
    SUM(r.meta_ano_atual)::bigint as soma_meta,
    SUM(r.valor_ano_atual)::bigint as soma_vendas,
    ROUND((SUM(r.valor_ano_atual)::numeric / NULLIF(SUM(r.meta_ano_atual), 0)) * 100, 2) as percentual_geral
FROM analise_rfm r
INNER JOIN tabela_clientes c ON r.codigo_cliente = c.codigo_cliente
WHERE c.cod_vendedor = 16  -- Substitua pelo seu cod_vendedor
GROUP BY r.perfil
ORDER BY CASE r.perfil
    WHEN '30' THEN 1
    WHEN '10' THEN 2
    WHEN '5' THEN 3
    ELSE 4
END;

-- 9. DIAGNÓSTICO COMPLETO
-- ============================================================================
WITH diagnostico AS (
    SELECT 
        'PROFILES' as verificacao,
        COUNT(*) as registros
    FROM profiles
    WHERE id = '09f316d7-eeac-4828-85a0-ad1b891f8460'
    
    UNION ALL
    
    SELECT 
        'CLIENTES_DO_VENDEDOR' as verificacao,
        COUNT(*) as registros
    FROM tabela_clientes
    WHERE cod_vendedor = (
        SELECT cod_vendedor FROM profiles 
        WHERE id = '09f316d7-eeac-4828-85a0-ad1b891f8460'
    )
    
    UNION ALL
    
    SELECT 
        'RFM_OURO' as verificacao,
        COUNT(*) as registros
    FROM analise_rfm r
    INNER JOIN tabela_clientes c ON r.codigo_cliente = c.codigo_cliente
    WHERE c.cod_vendedor = (
        SELECT cod_vendedor FROM profiles 
        WHERE id = '09f316d7-eeac-4828-85a0-ad1b891f8460'
    )
    AND r.perfil = '30'
    
    UNION ALL
    
    SELECT 
        'RFM_PRATA' as verificacao,
        COUNT(*) as registros
    FROM analise_rfm r
    INNER JOIN tabela_clientes c ON r.codigo_cliente = c.codigo_cliente
    WHERE c.cod_vendedor = (
        SELECT cod_vendedor FROM profiles 
        WHERE id = '09f316d7-eeac-4828-85a0-ad1b891f8460'
    )
    AND r.perfil = '10'
    
    UNION ALL
    
    SELECT 
        'RFM_BRONZE' as verificacao,
        COUNT(*) as registros
    FROM analise_rfm r
    INNER JOIN tabela_clientes c ON r.codigo_cliente = c.codigo_cliente
    WHERE c.cod_vendedor = (
        SELECT cod_vendedor FROM profiles 
        WHERE id = '09f316d7-eeac-4828-85a0-ad1b891f8460'
    )
    AND r.perfil = '5'
)
SELECT * FROM diagnostico
ORDER BY registros DESC;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Substitua o UUID '09f316d7-eeac-4828-85a0-ad1b891f8460' pelo seu UUID real
-- 2. Substitua o cod_vendedor '16' pelo seu código (obtido via profiles.cod_vendedor)
-- 3. Valores em analise_rfm.perfil devem ser: '30' (ouro), '10' (prata), '5' (bronze)
-- 4. Se alguma query retornar 0 registros, significa dados faltando naquela tabela
-- ============================================================================
