-- Teste para verificar se a view vw_dashboard_metricas está funcionando
-- Substitua 'SEU_USER_ID' pelo ID real do usuário que você está testando

-- 1. Verificar dados da view para um usuário específico
SELECT * FROM vw_dashboard_metricas;

-- 2. Verificar dados da vendas_mes para o mês atual
SELECT 
  vm.*,
  p.id as profile_id,
  p.apelido
FROM vendas_mes vm
JOIN profiles p ON p.cod_vendedor = vm.codigo_vendedor
WHERE 
  EXTRACT(MONTH FROM vm.mes_referencia) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM vm.mes_referencia) = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY vm.total_faturado_liquido DESC;

-- 3. Verificar metas da analise_rfm
SELECT 
  c.cod_vendedor,
  p.apelido,
  COUNT(DISTINCT rfm.codigo_cliente) as qtd_clientes,
  SUM(rfm.meta_ano_atual) as meta_total_ano,
  ROUND(SUM(rfm.meta_ano_atual) / 12, 2) as meta_mes
FROM tabela_clientes c
JOIN profiles p ON c.cod_vendedor = p.cod_vendedor
JOIN (
  SELECT DISTINCT ON (codigo_cliente) 
    codigo_cliente,
    meta_ano_atual,
    valor_ano_atual
  FROM analise_rfm
  WHERE data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
) rfm ON c.codigo_cliente = rfm.codigo_cliente
GROUP BY c.cod_vendedor, p.apelido
ORDER BY meta_total_ano DESC;