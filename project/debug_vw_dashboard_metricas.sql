-- Debug: Investigar por que vw_dashboard_metricas está vazia

-- 1. Verificar se a view existe
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE viewname = 'vw_dashboard_metricas';

-- 2. Tentar executar a view diretamente
SELECT * FROM vw_dashboard_metricas LIMIT 5;

-- 3. Verificar se existem dados na view vendas_mes
SELECT 
  mes_referencia,
  codigo_vendedor,
  nome_vendedor,
  total_faturado_liquido,
  qtd_clientes_faturados
FROM vendas_mes 
WHERE EXTRACT(MONTH FROM mes_referencia) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM mes_referencia) = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY codigo_vendedor;

-- 4. Verificar se existem profiles com cod_vendedor preenchido
SELECT 
  id,
  cod_vendedor,
  nome_completo,
  apelido,
  cargo
FROM profiles 
WHERE cod_vendedor IS NOT NULL
ORDER BY cod_vendedor;

-- 5. Verificar se existe relação entre profiles e vendas_mes
SELECT 
  p.id,
  p.cod_vendedor,
  p.apelido,
  vm.codigo_vendedor,
  vm.nome_vendedor,
  vm.total_faturado_liquido
FROM profiles p
LEFT JOIN vendas_mes vm ON p.cod_vendedor = vm.codigo_vendedor
  AND EXTRACT(MONTH FROM vm.mes_referencia) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM vm.mes_referencia) = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE p.cod_vendedor IS NOT NULL
ORDER BY p.cod_vendedor;

-- 6. Verificar dados da analise_rfm (para metas)
SELECT 
  c.cod_vendedor,
  COUNT(DISTINCT c.codigo_cliente) as qtd_clientes,
  SUM(rfm.meta_ano_atual) as meta_total_ano,
  ROUND(SUM(rfm.meta_ano_atual) / 12, 2) as meta_mes_calculada
FROM tabela_clientes c
JOIN (
  SELECT DISTINCT ON (codigo_cliente) 
    codigo_cliente,
    meta_ano_atual,
    valor_ano_atual
  FROM analise_rfm
  WHERE data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
    AND meta_ano_atual > 0
) rfm ON c.codigo_cliente = rfm.codigo_cliente
WHERE c.cod_vendedor IS NOT NULL
GROUP BY c.cod_vendedor
ORDER BY c.cod_vendedor;