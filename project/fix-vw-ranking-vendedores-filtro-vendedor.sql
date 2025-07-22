-- =============================================================================
-- FIX: Corrigir vw_ranking_vendedores para contar apenas clientes do vendedor
-- =============================================================================
-- Problema: A view estava contando TODOS os clientes das cidades nas rotas do vendedor
-- Solução: Adicionar filtro por cod_vendedor na junção com tabela_clientes

DROP VIEW IF EXISTS public.vw_ranking_vendedores CASCADE;

CREATE OR REPLACE VIEW public.vw_ranking_vendedores AS
SELECT
  p.id AS vendedor_uuid,
  p.cod_vendedor,
  p.nome_completo,
  p.apelido,
  COUNT(DISTINCT c.codigo_cliente) AS total_clientes,
  COUNT(
    DISTINCT CASE
      WHEN r.dias_sem_comprar > 90 THEN c.codigo_cliente
      ELSE NULL::integer
    END
  ) AS "+90d",
  COALESCE(SUM(r.valor_ano_atual), 0::numeric) AS vendas_ano,
  COALESCE(
    (
      SELECT
        SUM(mv.meta_valor) AS sum
      FROM
        metas_vendedores mv
      WHERE
        mv.cod_vendedor = p.cod_vendedor
        AND mv.ano = 2025
    ),
    0::numeric
  ) AS meta_ano,
  CASE
    WHEN COALESCE(
      (
        SELECT
          SUM(mv.meta_valor) AS sum
        FROM
          metas_vendedores mv
        WHERE
          mv.cod_vendedor = p.cod_vendedor
          AND mv.ano = 2025
      ),
      0::numeric
    ) > 0::numeric THEN ROUND(
      COALESCE(SUM(r.valor_ano_atual), 0::numeric) / (
        (
          SELECT
            SUM(mv.meta_valor) AS sum
          FROM
            metas_vendedores mv
          WHERE
            mv.cod_vendedor = p.cod_vendedor
            AND mv.ano = 2025
        )
      ) * 100::numeric,
      2
    )
    ELSE 0::numeric
  END AS percentual_meta,
  COALESCE(
    (
      SELECT
        SUM(tvd.valor_saldo) AS sum
      FROM
        vw_titulos_vencidos_detalhado tvd
      WHERE
        tvd.vendedor_uuid = p.id
    ),
    0::numeric
  ) AS total_inadimplencia
FROM
  profiles p
  LEFT JOIN rotas_estado re ON re.vendedor_uuid = p.id
  LEFT JOIN tabela_clientes c ON c.codigo_ibge_cidade = re.codigo_ibge_cidade
    AND c.cod_vendedor = p.cod_vendedor  -- CORREÇÃO: Filtrar apenas clientes do vendedor
    AND (c.situacao <> ALL (ARRAY['I'::text, 'B'::text]))
  LEFT JOIN analise_rfm r ON r.codigo_cliente = c.codigo_cliente
WHERE
  p.cargo = 'vendedor'::text
  AND p.status = 'ativo'::text
GROUP BY
  p.id,
  p.cod_vendedor,
  p.nome_completo,
  p.apelido
ORDER BY
  (
    CASE
      WHEN COALESCE(
        (
          SELECT
            SUM(mv.meta_valor) AS sum
          FROM
            metas_vendedores mv
          WHERE
            mv.cod_vendedor = p.cod_vendedor
            AND mv.ano = 2025
        ),
        0::numeric
      ) > 0::numeric THEN ROUND(
        COALESCE(SUM(r.valor_ano_atual), 0::numeric) / (
          (
            SELECT
              SUM(mv.meta_valor) AS sum
            FROM
              metas_vendedores mv
            WHERE
              mv.cod_vendedor = p.cod_vendedor
              AND mv.ano = 2025
          )
        ) * 100::numeric,
        2
      )
      ELSE 0::numeric
    END
  ) DESC;

-- Garantir permissões
GRANT SELECT ON public.vw_ranking_vendedores TO authenticated;

-- Comentário explicativo
COMMENT ON VIEW public.vw_ranking_vendedores IS 'View de ranking de vendedores com métricas de vendas, metas e inadimplência. CORRIGIDO: Agora filtra corretamente apenas clientes do vendedor.';

-- =============================================================================
-- VERIFICAÇÃO: Query para validar a correção
-- =============================================================================
-- Execute esta query para verificar se os números estão corretos agora:
/*
SELECT 
    apelido,
    total_clientes,
    "+90d" as clientes_sem_vendas_90d,
    ROUND(("+90d"::numeric / NULLIF(total_clientes, 0) * 100), 1) as percentual_sem_vendas
FROM vw_ranking_vendedores
WHERE apelido IN ('Misterclaudio', 'Rodrigo', 'Heleno')
ORDER BY apelido;
*/