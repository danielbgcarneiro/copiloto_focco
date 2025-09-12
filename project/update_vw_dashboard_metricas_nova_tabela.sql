-- Atualizar vw_dashboard_metricas para usar a nova tabela metas_vendedores
CREATE OR REPLACE VIEW public.vw_dashboard_metricas AS
SELECT 
  p.id as vendedor_id,
  COALESCE(vm.total_faturado_liquido, 0) as vendas_mes,
  COALESCE(vm.qtd_clientes_faturados, 0) as oticas_positivadas,
  COALESCE(mv.meta_valor, 0) as meta_mes,
  CASE 
    WHEN COALESCE(mv.meta_valor, 0) > 0 THEN 
      ROUND((COALESCE(vm.total_faturado_liquido, 0) / mv.meta_valor) * 100, 2)
    ELSE 0 
  END as percentual_atingimento
FROM profiles p
LEFT JOIN vendas_mes vm ON p.cod_vendedor = vm.codigo_vendedor
  AND EXTRACT(MONTH FROM vm.mes_referencia) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM vm.mes_referencia) = EXTRACT(YEAR FROM CURRENT_DATE)
LEFT JOIN metas_vendedores mv ON p.cod_vendedor = mv.cod_vendedor
  AND mv.ano = EXTRACT(YEAR FROM CURRENT_DATE)
  AND mv.mes = EXTRACT(MONTH FROM CURRENT_DATE)
WHERE p.cargo = 'vendedor' 
  AND p.cod_vendedor IS NOT NULL;

-- Garantir permissões
GRANT SELECT ON public.vw_dashboard_metricas TO authenticated;
GRANT SELECT ON public.metas_vendedores TO authenticated;

-- Teste da view atualizada
SELECT 
  p.apelido,
  vm.*
FROM vw_dashboard_metricas vm
JOIN profiles p ON vm.vendedor_id = p.id
ORDER BY p.cod_vendedor
LIMIT 5;