-- Script para corrigir a view vw_rotas_unificada após mudanças na tabela analise_rfm
-- Removendo referências a 'estrelas' e atualizando para usar novos campos

-- Primeiro, vamos dropar a view existente
DROP VIEW IF EXISTS public.vw_rotas_unificada CASCADE;

-- Recriar a view sem referências aos campos removidos
CREATE OR REPLACE VIEW public.vw_rotas_unificada
WITH (security_invoker = true) AS
SELECT
  vr.rota,
  vr.rota as nome_rota,
  vr.vendedor_id as vendedor_uuid,
  p.apelido as vendedor_apelido,
  COUNT(DISTINCT tc.codigo_cliente) as qtd_oticas,
  COUNT(DISTINCT tc.codigo_cliente) as total_oticas,
  COALESCE(SUM(ar.valor_ano_atual), 0) as vendido_2025,
  COALESCE(SUM(ar.meta_ano_atual), 0) as meta_2025,
  CASE
    WHEN COALESCE(SUM(ar.meta_ano_atual), 0) > 0
    THEN ROUND((COALESCE(SUM(ar.valor_ano_atual), 0) / SUM(ar.meta_ano_atual) * 100)::numeric, 2)
    ELSE 0
  END as percentual_meta,
  ROW_NUMBER() OVER (
    PARTITION BY vr.vendedor_id
    ORDER BY
      CASE
        WHEN COALESCE(SUM(ar.meta_ano_atual), 0) > 0
        THEN (COALESCE(SUM(ar.valor_ano_atual), 0) / SUM(ar.meta_ano_atual) * 100)
        ELSE 0
      END DESC
  ) as ranking,
  COUNT(DISTINCT tc.cidade) as total_cidades,
  COUNT(DISTINCT tc.cidade) as qtd_cidades,
  COUNT(DISTINCT CASE WHEN COALESCE(ar.dias_sem_comprar, 0) >= 90 THEN tc.codigo_cliente END) as clientes_sem_venda_90d,
  COUNT(DISTINCT CASE WHEN COALESCE(ar.dias_sem_comprar, 0) >= 90 THEN tc.codigo_cliente END) as oticas_sem_vendas_90d,
  COALESCE(SUM(ar.previsao_pedido), 0) as soma_oportunidades,
  CASE
    WHEN COALESCE(SUM(ar.meta_ano_atual), 0) = 0 THEN 'Sem Meta'
    WHEN (COALESCE(SUM(ar.valor_ano_atual), 0) / NULLIF(SUM(ar.meta_ano_atual), 0) * 100) >= 100 THEN 'Atingiu'
    WHEN (COALESCE(SUM(ar.valor_ano_atual), 0) / NULLIF(SUM(ar.meta_ano_atual), 0) * 100) >= 75 THEN 'Próximo'
    WHEN (COALESCE(SUM(ar.valor_ano_atual), 0) / NULLIF(SUM(ar.meta_ano_atual), 0) * 100) >= 50 THEN 'Médio'
    ELSE 'Baixo'
  END as faixa_atingimento
FROM
  public.vendedor_rotas vr
  INNER JOIN public.profiles p ON vr.vendedor_id = p.id
  LEFT JOIN public.tabela_clientes tc ON tc.rota = vr.rota AND tc.cod_vendedor = p.cod_vendedor
  LEFT JOIN public.analise_rfm ar ON ar.codigo_cliente = tc.codigo_cliente
WHERE
  vr.ativo = true
GROUP BY
  vr.rota,
  vr.vendedor_id,
  p.apelido;

-- Comentário da view
COMMENT ON VIEW public.vw_rotas_unificada IS
'View unificada de rotas com métricas de vendas por vendedor.
Atualizada para usar nova estrutura da tabela analise_rfm (sem estrelas).
Usa security_invoker=true para respeitar RLS do usuário logado.';
