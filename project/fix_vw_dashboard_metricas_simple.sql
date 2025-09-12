-- Versão simplificada da vw_dashboard_metricas para debug
CREATE OR REPLACE VIEW public.vw_dashboard_metricas AS
SELECT 
  p.id as vendedor_id,
  COALESCE(vm.total_faturado_liquido, 0) as vendas_mes,
  COALESCE(vm.qtd_clientes_faturados, 0) as oticas_positivadas,
  0 as meta_mes, -- Temporário, vamos corrigir depois
  0 as percentual_atingimento -- Temporário
FROM profiles p
LEFT JOIN vendas_mes vm ON p.cod_vendedor = vm.codigo_vendedor
  AND EXTRACT(MONTH FROM vm.mes_referencia) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM vm.mes_referencia) = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE p.id = auth.uid()
  AND p.cargo = 'vendedor';

-- Garantir permissões
GRANT SELECT ON public.vw_dashboard_metricas TO authenticated;