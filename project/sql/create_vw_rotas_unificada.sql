-- View unificada de rotas com métricas de vendas
-- Esta view consolida dados de rotas, vendedores e métricas de vendas

CREATE OR REPLACE VIEW public.vw_rotas_unificada
WITH (security_invoker = true) AS
SELECT
  vr.rota,
  vr.rota as nome_rota,
  vr.vendedor_id as vendedor_uuid,
  p.apelido as vendedor_apelido,
  COUNT(DISTINCT tc.codigo_cliente) as qtd_oticas,
  COUNT(DISTINCT tc.codigo_cliente) as total_oticas,
  COALESCE(SUM(CASE
    WHEN EXTRACT(YEAR FROM tc.data_ultima_venda) = EXTRACT(YEAR FROM CURRENT_DATE)
    THEN tc.valor_vendas_2025
    ELSE 0
  END), 0) as vendido_2025,
  COALESCE(SUM(ar.meta_ano_atual), 0) as meta_2025,
  CASE
    WHEN COALESCE(SUM(ar.meta_ano_atual), 0) > 0
    THEN ROUND((COALESCE(SUM(tc.valor_vendas_2025), 0) / SUM(ar.meta_ano_atual) * 100)::numeric, 2)
    ELSE 0
  END as percentual_meta,
  ROW_NUMBER() OVER (
    PARTITION BY vr.vendedor_id
    ORDER BY
      CASE
        WHEN COALESCE(SUM(ar.meta_ano_atual), 0) > 0
        THEN (COALESCE(SUM(tc.valor_vendas_2025), 0) / SUM(ar.meta_ano_atual) * 100)
        ELSE 0
      END DESC
  ) as ranking,
  CASE
    WHEN COALESCE(SUM(ar.meta_ano_atual), 0) = 0 THEN 'Sem Meta'
    WHEN (COALESCE(SUM(tc.valor_vendas_2025), 0) / SUM(ar.meta_ano_atual) * 100) >= 100 THEN 'Atingiu'
    WHEN (COALESCE(SUM(tc.valor_vendas_2025), 0) / SUM(ar.meta_ano_atual) * 100) >= 75 THEN 'Próximo'
    WHEN (COALESCE(SUM(tc.valor_vendas_2025), 0) / SUM(ar.meta_ano_atual) * 100) >= 50 THEN 'Médio'
    ELSE 'Baixo'
  END as faixa_atingimento
FROM
  public.vendedor_rotas vr
  INNER JOIN public.profiles p ON vr.vendedor_id = p.id
  LEFT JOIN public.tabela_clientes tc ON tc.rota = vr.rota
  LEFT JOIN public.analise_rfm ar ON ar.codigo_cliente = tc.codigo_cliente
WHERE
  vr.ativo = true
GROUP BY
  vr.rota,
  vr.vendedor_id,
  p.apelido;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_vw_rotas_vendedor_uuid
  ON public.vendedor_rotas(vendedor_id)
  WHERE ativo = true;

-- Comentário da view
COMMENT ON VIEW public.vw_rotas_unificada IS
'View unificada de rotas com métricas de vendas por vendedor.
Usa security_invoker=true para respeitar RLS do usuário logado.';
