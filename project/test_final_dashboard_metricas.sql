-- Teste final da vw_dashboard_metricas

-- 1. Testar a view para todos os vendedores
SELECT 
  p.apelido as vendedor_nome,
  vm.*
FROM vw_dashboard_metricas vm
JOIN profiles p ON vm.vendedor_id = p.id;

-- 2. Comparar com dados originais para vendedor específico (exemplo: cod_vendedor = 16)
SELECT 
  'Dados da view:' as fonte,
  vm.*
FROM vw_dashboard_metricas vm
JOIN profiles p ON vm.vendedor_id = p.id
WHERE p.cod_vendedor = 16

UNION ALL

SELECT 
  'Dados originais vendas_mes:' as fonte,
  p.id as vendedor_id,
  COALESCE(vmes.total_faturado_liquido, 0) as vendas_mes,
  COALESCE(vmes.qtd_clientes_faturados, 0) as oticas_positivadas,
  (SELECT ROUND(SUM(rfm.meta_ano_atual) / 12, 2)
   FROM tabela_clientes c
   JOIN (
     SELECT DISTINCT ON (codigo_cliente) codigo_cliente, meta_ano_atual
     FROM analise_rfm
     WHERE data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
   ) rfm ON c.codigo_cliente = rfm.codigo_cliente
   WHERE c.cod_vendedor = 16
  ) as meta_mes,
  0 as percentual_atingimento
FROM profiles p
LEFT JOIN vendas_mes vmes ON p.cod_vendedor = vmes.codigo_vendedor
  AND EXTRACT(MONTH FROM vmes.mes_referencia) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM vmes.mes_referencia) = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE p.cod_vendedor = 16;

-- 3. Verificar se a view retorna dados para todos os vendedores ativos
SELECT 
  'Total de vendedores na view:' as info,
  COUNT(*) as quantidade
FROM vw_dashboard_metricas

UNION ALL

SELECT 
  'Total de vendedores profiles:' as info,
  COUNT(*) as quantidade  
FROM profiles
WHERE cargo = 'vendedor' AND cod_vendedor IS NOT NULL;