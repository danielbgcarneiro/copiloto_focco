-- Teste para verificar as novas views

-- 1. Verificar estrutura da vendas_mes
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'vendas_mes' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar dados de exemplo da vendas_mes
SELECT * FROM vendas_mes LIMIT 5;

-- 3. Verificar estrutura da vendas_pedidos_com_data_emissao
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'vendas_pedidos_com_data_emissao' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar se existe relação entre profiles e vendas_mes
SELECT 
  p.id,
  p.codigo_vendedor,
  p.apelido,
  vm.codigo_vendedor as vm_codigo_vendedor,
  vm.nome_vendedor,
  vm.total_faturado_liquido
FROM profiles p
LEFT JOIN vendas_mes vm ON p.codigo_vendedor = vm.codigo_vendedor
WHERE p.cargo = 'vendedor'
LIMIT 5;

-- 5. Testar a view vw_dashboard_metricas para um vendedor específico
-- Substitua 'UUID_DO_VENDEDOR' pelo ID real de um vendedor
-- SELECT * FROM vw_dashboard_metricas WHERE vendedor_id = 'UUID_DO_VENDEDOR';