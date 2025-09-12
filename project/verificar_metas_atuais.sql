-- Verificar as metas atuais na tabela metas_vendedores

-- 1. Ver todas as metas do mês atual
SELECT 
  mv.cod_vendedor,
  p.apelido,
  mv.ano,
  mv.mes,
  mv.meta_valor,
  TO_CHAR(mv.meta_valor, 'FM999,999,999') as meta_formatada
FROM metas_vendedores mv
JOIN profiles p ON mv.cod_vendedor = p.cod_vendedor
WHERE mv.ano = EXTRACT(YEAR FROM CURRENT_DATE)
  AND mv.mes = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY mv.cod_vendedor;

-- 2. Verificar especificamente o Misterclaudio (cod_vendedor = 16)
SELECT 
  'Tabela metas_vendedores:' as fonte,
  cod_vendedor,
  ano,
  mes,
  meta_valor
FROM metas_vendedores 
WHERE cod_vendedor = 16
  AND ano = EXTRACT(YEAR FROM CURRENT_DATE)
  AND mes = EXTRACT(MONTH FROM CURRENT_DATE);

-- 3. Testar a view diretamente para o Misterclaudio
SELECT 
  'View vw_dashboard_metricas:' as fonte,
  vm.vendedor_id,
  p.cod_vendedor,
  p.apelido,
  vm.vendas_mes,
  vm.meta_mes,
  vm.percentual_atingimento
FROM vw_dashboard_metricas vm
JOIN profiles p ON vm.vendedor_id = p.id
WHERE p.cod_vendedor = 16;