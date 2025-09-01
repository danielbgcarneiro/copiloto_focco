-- Atualizar a view vw_ranking_rotas para usar as novas views
CREATE OR REPLACE VIEW public.vw_ranking_rotas AS
WITH vendedor_profile AS (
  -- Buscar o vendedor baseado no auth.uid()
  SELECT 
    p.id as vendedor_uuid,
    p.cod_vendedor as codigo_vendedor,
    p.apelido as nome_vendedor
  FROM profiles p
  WHERE p.id = auth.uid()
),
vendas_por_rota_mes AS (
  -- Buscar vendas por rota usando a nova view
  SELECT
    re.rota,
    re.vendedor_uuid,
    COUNT(DISTINCT tc.codigo_cliente) as qtd_oticas,
    COALESCE(SUM(
      CASE 
        WHEN EXTRACT(YEAR FROM vpde.data_competencia) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND EXTRACT(MONTH FROM vpde.data_competencia) = EXTRACT(MONTH FROM CURRENT_DATE)
        THEN vpde.valor_faturado - COALESCE(vpde.valor_devolvido, 0)
        ELSE 0
      END
    ), 0) as vendido_mes_atual,
    COALESCE(SUM(
      CASE 
        WHEN EXTRACT(YEAR FROM vpde.data_competencia) = EXTRACT(YEAR FROM CURRENT_DATE)
        THEN vpde.valor_faturado - COALESCE(vpde.valor_devolvido, 0)
        ELSE 0
      END
    ), 0) as vendido_2025
  FROM rotas_estado re
  INNER JOIN tabela_clientes tc ON tc.codigo_ibge_cidade = re.codigo_ibge_cidade
  LEFT JOIN vendas_pedidos_com_data_emissao vpde ON tc.codigo_cliente = vpde.codigo_cliente
    AND vpde.codigo_vendedor = (SELECT codigo_vendedor FROM vendedor_profile)
  WHERE re.vendedor_uuid = auth.uid()
  GROUP BY re.rota, re.vendedor_uuid
),
metas_por_rota AS (
  -- Buscar metas por rota
  SELECT
    rota,
    vendedor_uuid,
    SUM(CASE 
      WHEN mes = EXTRACT(MONTH FROM CURRENT_DATE) 
      THEN meta_valor 
      ELSE 0 
    END) as meta_mes,
    SUM(meta_valor) as meta_2025
  FROM metas_rotas
  WHERE 
    ano = EXTRACT(YEAR FROM CURRENT_DATE)
    AND vendedor_uuid = auth.uid()
  GROUP BY rota, vendedor_uuid
)
SELECT
  vpr.rota,
  vpr.rota as nome_rota,
  vpr.vendedor_uuid,
  vpr.qtd_oticas,
  vpr.vendido_2025,
  COALESCE(mpr.meta_2025, 0) as meta_2025,
  CASE 
    WHEN COALESCE(mpr.meta_2025, 0) > 0 THEN 
      ROUND((vpr.vendido_2025 / mpr.meta_2025) * 100, 2)
    ELSE 0 
  END as percentual_meta,
  RANK() OVER (
    PARTITION BY vpr.vendedor_uuid 
    ORDER BY 
      CASE 
        WHEN COALESCE(mpr.meta_2025, 0) > 0 THEN 
          vpr.vendido_2025 / mpr.meta_2025
        ELSE 0 
      END DESC
  ) as ranking
FROM vendas_por_rota_mes vpr
LEFT JOIN metas_por_rota mpr ON vpr.rota = mpr.rota AND vpr.vendedor_uuid = mpr.vendedor_uuid
ORDER BY vpr.vendedor_uuid, percentual_meta DESC;

-- Garantir permissões
GRANT SELECT ON public.vw_ranking_rotas TO authenticated;