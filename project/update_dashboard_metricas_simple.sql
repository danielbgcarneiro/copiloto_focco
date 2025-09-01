-- Versão simplificada da vw_dashboard_metricas
-- Esta versão assume que existe uma relação entre profiles.codigo_vendedor e vendas_mes.codigo_vendedor

CREATE OR REPLACE VIEW public.vw_dashboard_metricas AS
WITH meta_vendedor AS (
  -- Buscar meta do vendedor da analise_rfm
  SELECT 
    c.cod_vendedor,
    SUM(rfm.meta_ano_atual) as meta_total_ano,
    -- Assumindo distribuição uniforme da meta anual em 12 meses
    ROUND(SUM(rfm.meta_ano_atual) / 12, 2) as meta_mes
  FROM tabela_clientes c
  JOIN (
    SELECT DISTINCT ON (codigo_cliente) 
      codigo_cliente,
      meta_ano_atual
    FROM analise_rfm
    WHERE data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
    ORDER BY codigo_cliente, data_analise DESC
  ) rfm ON c.codigo_cliente = rfm.codigo_cliente
  WHERE c.cod_vendedor = (SELECT cod_vendedor FROM profiles WHERE id = auth.uid())
  GROUP BY c.cod_vendedor
)
SELECT 
  p.id as vendedor_id,
  COALESCE(vm.total_faturado_liquido, 0) as vendas_mes,
  COALESCE(vm.qtd_clientes_faturados, 0) as oticas_positivadas,
  COALESCE(mv.meta_mes, 0) as meta_mes,
  CASE 
    WHEN COALESCE(mv.meta_mes, 0) > 0 THEN 
      ROUND((COALESCE(vm.total_faturado_liquido, 0) / mv.meta_mes) * 100, 2)
    ELSE 0 
  END as percentual_atingimento
FROM profiles p
LEFT JOIN vendas_mes vm ON p.cod_vendedor = vm.codigo_vendedor
  AND EXTRACT(MONTH FROM vm.mes_referencia) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM vm.mes_referencia) = EXTRACT(YEAR FROM CURRENT_DATE)
LEFT JOIN meta_vendedor mv ON p.cod_vendedor = mv.cod_vendedor
WHERE p.id = auth.uid();

-- Garantir permissões
GRANT SELECT ON public.vw_dashboard_metricas TO authenticated;