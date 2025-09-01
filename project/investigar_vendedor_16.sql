-- Investigar dados do vendedor Mistreclaudio (cod_vendedor = 16)

-- 1. Verificar o profile do vendedor
SELECT 
  id as uuid,
  cod_vendedor,
  nome_completo,
  apelido,
  cargo
FROM profiles 
WHERE cod_vendedor = 16;

-- 2. Verificar dados na view vendas_mes para o vendedor 16
SELECT 
  mes_referencia,
  codigo_vendedor,
  nome_vendedor,
  total_faturado_liquido,
  qtd_clientes_faturados,
  qtd_notas_fiscais
FROM vendas_mes 
WHERE codigo_vendedor = 16
  AND EXTRACT(MONTH FROM mes_referencia) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM mes_referencia) = EXTRACT(YEAR FROM CURRENT_DATE);

-- 3. Verificar pedidos na vendas_pedidos_com_data_emissao
SELECT 
  pedido_codigo,
  nota_fiscal_numero,
  codigo_vendedor,
  codigo_cliente,
  nome_vendedor,
  nome_cliente,
  valor_faturado,
  data_competencia,
  data_faturamento,
  status_pedido
FROM vendas_pedidos_com_data_emissao
WHERE codigo_vendedor = 16
  AND EXTRACT(MONTH FROM data_competencia) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM data_competencia) = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY data_competencia DESC;

-- 4. Verificar se há clientes com cod_vendedor = 16
SELECT 
  codigo_cliente,
  nome_fantasia,
  cod_vendedor,
  cidade
FROM tabela_clientes
WHERE cod_vendedor = 16
LIMIT 20;

-- 5. Verificar o que a view vw_dashboard_metricas está retornando
-- Primeiro, pegar o UUID do vendedor
WITH vendedor_uuid AS (
  SELECT id FROM profiles WHERE cod_vendedor = 16
)
SELECT 
  'Resultado da view para vendedor 16:' as info,
  vm.*
FROM vw_dashboard_metricas vm
WHERE vm.vendedor_id = (SELECT id FROM vendedor_uuid);

-- 6. Debug: Ver todos os dados de vendas_mes do mês atual
SELECT 
  codigo_vendedor,
  nome_vendedor,
  total_faturado_liquido,
  qtd_clientes_faturados,
  mes_referencia
FROM vendas_mes 
WHERE EXTRACT(MONTH FROM mes_referencia) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM mes_referencia) = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY codigo_vendedor;