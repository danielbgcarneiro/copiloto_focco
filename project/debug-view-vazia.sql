-- =============================================================================
-- DEBUG: Investigar por que a view está vazia
-- =============================================================================

-- 1. Verificar se há clientes ativos
SELECT 
    'CLIENTES_ATIVOS' as info,
    COUNT(*) as total,
    COUNT(DISTINCT cod_vendedor) as vendedores_distintos
FROM tabela_clientes
WHERE situacao = 'ATIVO';

-- 2. Verificar valores possíveis de situacao
SELECT 
    'VALORES_SITUACAO' as info,
    situacao,
    COUNT(*) as total
FROM tabela_clientes
GROUP BY situacao
ORDER BY COUNT(*) DESC;

-- 3. Verificar join entre clientes e profiles
SELECT 
    'JOIN_CLIENTES_PROFILES' as info,
    COUNT(*) as total_matches
FROM tabela_clientes c
INNER JOIN profiles p ON c.cod_vendedor = p.cod_vendedor 
WHERE p.cargo = 'vendedor';

-- 4. Verificar se profiles tem vendedores
SELECT 
    'VENDEDORES_EM_PROFILES' as info,
    cargo,
    COUNT(*) as total
FROM profiles
GROUP BY cargo;

-- 5. Verificar amostra do join completo
SELECT 
    'AMOSTRA_JOIN_COMPLETO' as info,
    c.codigo_cliente,
    c.cod_vendedor,
    c.situacao,
    p.id as vendedor_uuid,
    p.apelido,
    p.cargo,
    re.rota
FROM tabela_clientes c
LEFT JOIN profiles p ON c.cod_vendedor = p.cod_vendedor
LEFT JOIN rotas_estado re ON c.codigo_ibge_cidade = re.codigo_ibge_cidade
LIMIT 10;

-- 6. Verificar dados RFM mais recentes
SELECT 
    'DATA_MAIS_RECENTE_RFM' as info,
    MAX(data_analise) as data_max,
    COUNT(DISTINCT codigo_cliente) as clientes_com_rfm
FROM analise_rfm;

-- 7. Testar CTE passo a passo - Primeira parte
WITH clientes_com_vendedor AS (
    SELECT DISTINCT
        c.codigo_cliente,
        c.codigo_ibge_cidade,
        c.cod_vendedor,
        c.situacao,
        p.id as vendedor_uuid,
        p.apelido as vendedor_apelido,
        p.cargo,
        COALESCE(NULLIF(TRIM(re.rota), ''), 'Sem Rota') as rota
    FROM tabela_clientes c
    LEFT JOIN profiles p ON c.cod_vendedor = p.cod_vendedor
    LEFT JOIN rotas_estado re ON c.codigo_ibge_cidade = re.codigo_ibge_cidade
)
SELECT 
    'CTE_CLIENTES_VENDEDOR' as info,
    COUNT(*) as total,
    COUNT(DISTINCT vendedor_uuid) as vendedores_distintos,
    COUNT(*) FILTER (WHERE cargo = 'vendedor') as vendedores_cargo_ok,
    COUNT(*) FILTER (WHERE situacao = 'ATIVO') as clientes_ativos
FROM clientes_com_vendedor;

-- 8. Verificar problema específico: cod_vendedor vs codigo_vendedor
SELECT 
    'CAMPOS_VENDEDOR_PROFILES' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE '%vendedor%'
ORDER BY ordinal_position;

-- 9. Contar vendedores por cod_vendedor
SELECT 
    'VENDEDORES_POR_COD' as info,
    p.cod_vendedor,
    p.apelido,
    p.cargo,
    COUNT(c.codigo_cliente) as qtd_clientes
FROM profiles p
LEFT JOIN tabela_clientes c ON p.cod_vendedor = c.cod_vendedor
WHERE p.cargo = 'vendedor'
GROUP BY p.cod_vendedor, p.apelido, p.cargo
ORDER BY qtd_clientes DESC
LIMIT 10;

-- 10. Verificar se o problema é no campo cod_vendedor
SELECT 
    'VERIFICAR_COD_VENDEDOR' as info,
    'profiles' as tabela,
    COUNT(*) as total_registros,
    COUNT(cod_vendedor) as com_cod_vendedor,
    COUNT(*) FILTER (WHERE cod_vendedor IS NULL) as cod_vendedor_null
FROM profiles
WHERE cargo = 'vendedor'
UNION ALL
SELECT 
    'VERIFICAR_COD_VENDEDOR' as info,
    'tabela_clientes' as tabela,
    COUNT(*) as total_registros,
    COUNT(cod_vendedor) as com_cod_vendedor,
    COUNT(*) FILTER (WHERE cod_vendedor IS NULL) as cod_vendedor_null
FROM tabela_clientes;