-- SQL de DEBUG para investigar dados RFM do vendedor Michel (cod_vendedor = 9)

-- 1. Verificar os primeiros 10 clientes do Michel
SELECT
  'Clientes do Michel' as tipo,
  codigo_cliente,
  nome_fantasia,
  cidade
FROM tabela_clientes
WHERE cod_vendedor = 9
ORDER BY codigo_cliente
LIMIT 10;

-- 2. Verificar se esses códigos específicos existem na analise_rfm
SELECT
  'RFM dos clientes do Michel' as tipo,
  codigo_cliente,
  perfil,
  valor_ano_atual,
  meta_ano_atual
FROM analise_rfm
WHERE codigo_cliente IN (101473, 100669, 100673, 100678, 100168, 101651, 101774, 100037, 100171, 101474);

-- 3. Contar quantos clientes do Michel têm dados na analise_rfm
SELECT
  'Contagem: Clientes Michel com RFM' as tipo,
  COUNT(DISTINCT tc.codigo_cliente) as total_clientes_michel,
  COUNT(DISTINCT ar.codigo_cliente) as clientes_com_rfm,
  COUNT(DISTINCT CASE WHEN ar.perfil IS NOT NULL THEN ar.codigo_cliente END) as clientes_com_perfil
FROM tabela_clientes tc
LEFT JOIN analise_rfm ar ON ar.codigo_cliente = tc.codigo_cliente
WHERE tc.cod_vendedor = 9;

-- 4. Ver amostra de clientes do Michel que TÊM dados RFM (se existirem)
SELECT
  'Clientes Michel COM RFM' as tipo,
  tc.codigo_cliente,
  tc.nome_fantasia,
  ar.perfil,
  ar.valor_ano_atual,
  ar.meta_ano_atual
FROM tabela_clientes tc
INNER JOIN analise_rfm ar ON ar.codigo_cliente = tc.codigo_cliente
WHERE tc.cod_vendedor = 9
  AND ar.perfil IS NOT NULL
LIMIT 10;

-- 5. Verificar se existe algum padrão nos clientes que TÊM perfil vs os do Michel
SELECT
  'Distribuição de perfis (geral)' as tipo,
  ar.perfil,
  COUNT(*) as quantidade,
  MIN(ar.codigo_cliente) as codigo_min,
  MAX(ar.codigo_cliente) as codigo_max
FROM analise_rfm ar
WHERE ar.perfil IN ('Ouro', 'Prata', 'Bronze')
GROUP BY ar.perfil
ORDER BY ar.perfil;

-- 6. Ver se existe sobreposição entre cod_vendedor na tabela_clientes e analise_rfm
SELECT
  'Vendedores com clientes RFM' as tipo,
  tc.cod_vendedor,
  p.apelido,
  COUNT(DISTINCT tc.codigo_cliente) as total_clientes,
  COUNT(DISTINCT ar.codigo_cliente) as clientes_com_rfm,
  COUNT(DISTINCT CASE WHEN ar.perfil IN ('Ouro', 'Prata', 'Bronze') THEN ar.codigo_cliente END) as clientes_com_perfil
FROM tabela_clientes tc
LEFT JOIN analise_rfm ar ON ar.codigo_cliente = tc.codigo_cliente
LEFT JOIN profiles p ON p.cod_vendedor = tc.cod_vendedor
WHERE tc.cod_vendedor IN (9, 10, 11, 12)  -- Michel e mais alguns para comparar
GROUP BY tc.cod_vendedor, p.apelido
ORDER BY tc.cod_vendedor;

-- 7. Verificar se a tabela analise_rfm usa cod_vendedor ou codigo_cliente como chave
SELECT
  'Estrutura analise_rfm' as tipo,
  COUNT(*) as total_registros,
  COUNT(DISTINCT codigo_cliente) as codigos_unicos,
  COUNT(CASE WHEN perfil IS NOT NULL THEN 1 END) as com_perfil,
  COUNT(CASE WHEN perfil IN ('Ouro', 'Prata', 'Bronze') THEN 1 END) as perfis_validos
FROM analise_rfm;
