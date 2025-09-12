-- Popular a tabela metas_vendedores com dados baseados na analise_rfm atual

-- 1. Inserir metas mensais baseadas nas metas anuais da analise_rfm divididas por 12
INSERT INTO metas_vendedores (cod_vendedor, ano, mes, meta_valor)
SELECT DISTINCT
  c.cod_vendedor,
  EXTRACT(YEAR FROM CURRENT_DATE) as ano,
  EXTRACT(MONTH FROM CURRENT_DATE) as mes,
  ROUND(SUM(rfm.meta_ano_atual) / 12) as meta_valor
FROM tabela_clientes c
JOIN (
  SELECT DISTINCT ON (codigo_cliente) 
    codigo_cliente,
    meta_ano_atual
  FROM analise_rfm
  WHERE data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
    AND meta_ano_atual > 0
  ORDER BY codigo_cliente, data_analise DESC
) rfm ON c.codigo_cliente = rfm.codigo_cliente
WHERE c.cod_vendedor IS NOT NULL
GROUP BY c.cod_vendedor
ON CONFLICT (cod_vendedor, ano, mes) 
DO UPDATE SET 
  meta_valor = EXCLUDED.meta_valor;

-- 2. Verificar dados inseridos
SELECT 
  mv.cod_vendedor,
  p.apelido,
  mv.ano,
  mv.mes,
  mv.meta_valor
FROM metas_vendedores mv
JOIN profiles p ON mv.cod_vendedor = p.cod_vendedor
WHERE mv.ano = EXTRACT(YEAR FROM CURRENT_DATE)
  AND mv.mes = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY mv.cod_vendedor;

-- 3. Comparar com dados anteriores da analise_rfm
SELECT 
  'Nova tabela metas_vendedores' as fonte,
  cod_vendedor,
  meta_valor
FROM metas_vendedores
WHERE ano = EXTRACT(YEAR FROM CURRENT_DATE)
  AND mes = EXTRACT(MONTH FROM CURRENT_DATE)
  AND cod_vendedor = 16

UNION ALL

SELECT 
  'Analise_rfm (dividido por 12)' as fonte,
  c.cod_vendedor,
  ROUND(SUM(rfm.meta_ano_atual) / 12) as meta_valor
FROM tabela_clientes c
JOIN (
  SELECT DISTINCT ON (codigo_cliente) 
    codigo_cliente,
    meta_ano_atual
  FROM analise_rfm
  WHERE data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
) rfm ON c.codigo_cliente = rfm.codigo_cliente
WHERE c.cod_vendedor = 16
GROUP BY c.cod_vendedor;