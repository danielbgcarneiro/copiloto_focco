-- =============================================================================
-- BUSCAR CLIENTES SEM ROTA DO VENDEDOR MISTERCLAUDIO
-- =============================================================================

-- 1. Primeiro, identificar o cod_vendedor do Misterclaudio
SELECT 
    'DADOS_MISTERCLAUDIO' as info,
    id as vendedor_uuid,
    cod_vendedor,
    apelido,
    cargo
FROM profiles
WHERE apelido = 'Misterclaudio';

-- 2. Buscar todos os clientes do Misterclaudio e suas rotas
WITH misterclaudio_info AS (
    SELECT cod_vendedor, id as vendedor_uuid
    FROM profiles 
    WHERE apelido = 'Misterclaudio'
)
SELECT 
    'CLIENTES_MISTERCLAUDIO' as info,
    c.codigo_cliente,
    c.nome_fantasia,
    c.cidade,
    c.estado,
    c.codigo_ibge_cidade,
    re.rota as rota_cidade,
    CASE 
        WHEN re.rota IS NULL OR re.rota = '' THEN 'SEM ROTA'
        ELSE 'COM ROTA'
    END as status_rota
FROM tabela_clientes c
INNER JOIN misterclaudio_info m ON c.cod_vendedor = m.cod_vendedor
LEFT JOIN rotas_estado re ON c.codigo_ibge_cidade = re.codigo_ibge_cidade
ORDER BY status_rota DESC, c.cidade, c.nome_fantasia;

-- 3. Contar quantos clientes estão sem rota
WITH misterclaudio_info AS (
    SELECT cod_vendedor 
    FROM profiles 
    WHERE apelido = 'Misterclaudio'
)
SELECT 
    'RESUMO_MISTERCLAUDIO' as info,
    COUNT(*) as total_clientes,
    COUNT(re.rota) as clientes_com_rota,
    COUNT(*) - COUNT(re.rota) as clientes_sem_rota,
    ROUND((COUNT(*) - COUNT(re.rota))::numeric / COUNT(*) * 100, 1) as percentual_sem_rota
FROM tabela_clientes c
INNER JOIN misterclaudio_info m ON c.cod_vendedor = m.cod_vendedor
LEFT JOIN rotas_estado re ON c.codigo_ibge_cidade = re.codigo_ibge_cidade;

-- 4. Listar especificamente os clientes SEM ROTA
WITH misterclaudio_info AS (
    SELECT cod_vendedor 
    FROM profiles 
    WHERE apelido = 'Misterclaudio'
)
SELECT 
    'CLIENTES_SEM_ROTA_DETALHE' as info,
    c.codigo_cliente,
    c.nome_fantasia,
    c.cidade,
    c.estado,
    c.codigo_ibge_cidade,
    c.situacao
FROM tabela_clientes c
INNER JOIN misterclaudio_info m ON c.cod_vendedor = m.cod_vendedor
LEFT JOIN rotas_estado re ON c.codigo_ibge_cidade = re.codigo_ibge_cidade
WHERE re.rota IS NULL OR re.rota = ''
ORDER BY c.cidade, c.nome_fantasia;

-- 5. Agrupar por cidade para ver padrões
WITH misterclaudio_info AS (
    SELECT cod_vendedor 
    FROM profiles 
    WHERE apelido = 'Misterclaudio'
)
SELECT 
    'CIDADES_SEM_ROTA' as info,
    c.cidade,
    c.estado,
    COUNT(*) as qtd_clientes_sem_rota,
    STRING_AGG(c.codigo_ibge_cidade::text, ', ') as codigos_ibge
FROM tabela_clientes c
INNER JOIN misterclaudio_info m ON c.cod_vendedor = m.cod_vendedor
LEFT JOIN rotas_estado re ON c.codigo_ibge_cidade = re.codigo_ibge_cidade
WHERE re.rota IS NULL OR re.rota = ''
GROUP BY c.cidade, c.estado
ORDER BY COUNT(*) DESC, c.cidade;