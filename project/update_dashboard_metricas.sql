-- Atualizar a view vw_dashboard_metricas para usar as novas views
CREATE OR REPLACE VIEW public.vw_dashboard_metricas AS
WITH vendedor_profile AS (
  -- Buscar o vendedor baseado no auth.uid()
  SELECT 
    p.id as vendedor_uuid,
    p.cod_vendedor as codigo_vendedor,
    p.apelido as nome_vendedor
  FROM profiles p
  WHERE p.id = auth.uid()
),
metricas_mes_atual AS (
  -- Buscar métricas do mês atual da view vendas_mes
  SELECT 
    vm.codigo_vendedor,
    vm.total_faturado_liquido as vendas_mes,
    vm.qtd_clientes_faturados as oticas_positivadas,
    EXTRACT(MONTH FROM vm.mes_referencia) as mes,
    EXTRACT(YEAR FROM vm.mes_referencia) as ano
  FROM vendas_mes vm
  INNER JOIN vendedor_profile vp ON vm.codigo_vendedor = vp.codigo_vendedor
  WHERE 
    EXTRACT(MONTH FROM vm.mes_referencia) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM vm.mes_referencia) = EXTRACT(YEAR FROM CURRENT_DATE)
),
metas_vendedor AS (
  -- Buscar meta do vendedor para o mês atual
  SELECT
    mr.vendedor_uuid,
    SUM(mr.meta_valor) as meta_mes
  FROM metas_rotas mr
  WHERE 
    mr.vendedor_uuid = auth.uid()
    AND mr.ano = EXTRACT(YEAR FROM CURRENT_DATE)
    AND mr.mes = EXTRACT(MONTH FROM CURRENT_DATE)
  GROUP BY mr.vendedor_uuid
)
SELECT
  vp.vendedor_uuid as vendedor_id,
  COALESCE(mm.vendas_mes, 0) as vendas_mes,
  COALESCE(mm.oticas_positivadas, 0) as oticas_positivadas,
  COALESCE(mv.meta_mes, 0) as meta_mes,
  CASE 
    WHEN COALESCE(mv.meta_mes, 0) > 0 THEN 
      ROUND((COALESCE(mm.vendas_mes, 0) / mv.meta_mes) * 100, 2)
    ELSE 0 
  END as percentual_atingimento
FROM vendedor_profile vp
LEFT JOIN metricas_mes_atual mm ON vp.codigo_vendedor = mm.codigo_vendedor
LEFT JOIN metas_vendedor mv ON vp.vendedor_uuid = mv.vendedor_uuid;

-- Garantir permissões
GRANT SELECT ON public.vw_dashboard_metricas TO authenticated;

-- Criar índices para melhorar performance se não existirem
-- CREATE INDEX IF NOT EXISTS idx_vendas_mes_codigo_vendedor ON vendas_mes(codigo_vendedor);
-- CREATE INDEX IF NOT EXISTS idx_vendas_mes_mes_referencia ON vendas_mes(mes_referencia);
-- CREATE INDEX IF NOT EXISTS idx_profiles_codigo_vendedor ON profiles(codigo_vendedor);