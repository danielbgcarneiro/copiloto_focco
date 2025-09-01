-- Verificar como a view vendas_mes está calculando os valores

-- 1. Ver o que vendas_mes está retornando para o vendedor 16
SELECT 
  mes_referencia,
  codigo_vendedor,
  nome_vendedor,
  total_faturado_bruto,
  total_devolvido,
  total_faturado_liquido,
  total_em_aberto,
  total_vendas,
  qtd_notas_fiscais,
  qtd_pedidos_aberto,
  qtd_clientes_faturados,
  qtd_clientes_aberto,
  qtd_clientes_total
FROM vendas_mes 
WHERE codigo_vendedor = 16
  AND mes_referencia = '2025-08-01'::date;

-- 2. Verificar a estrutura da view v_vendas_mensais (que alimenta vendas_mes)
SELECT 
  table_name,
  view_definition 
FROM information_schema.views 
WHERE table_name = 'v_vendas_mensais' 
  AND table_schema = 'public';

-- 3. Soma manual dos pedidos FATURADOS do vendedor 16 em agosto/2025
SELECT 
  'Pedidos FATURADOS' as tipo,
  COUNT(DISTINCT pedido_codigo) as qtd_pedidos,
  COUNT(DISTINCT codigo_cliente) as qtd_clientes,
  SUM(valor_faturado) as total_valor
FROM vendas_pedidos_com_data_emissao
WHERE codigo_vendedor = 16
  AND EXTRACT(MONTH FROM data_competencia) = 8
  AND EXTRACT(YEAR FROM data_competencia) = 2025
  AND status_pedido = 'FATURADO'
  AND codigo_cliente != 16; -- Excluir pedidos de assistência

-- 4. Verificar se há pedidos com NF de julho mas data_competencia em agosto
SELECT 
  pedido_codigo,
  nota_fiscal_numero,
  valor_faturado,
  data_competencia,
  data_faturamento,
  'Data competência: ' || TO_CHAR(data_competencia, 'DD/MM/YYYY') as comp,
  'Data faturamento: ' || TO_CHAR(data_faturamento, 'DD/MM/YYYY') as fat
FROM vendas_pedidos_com_data_emissao
WHERE codigo_vendedor = 16
  AND status_pedido = 'FATURADO'
  AND EXTRACT(MONTH FROM data_competencia) = 8
  AND EXTRACT(YEAR FROM data_competencia) = 2025
ORDER BY data_faturamento;