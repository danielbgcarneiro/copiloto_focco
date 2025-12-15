-- Script para verificar e corrigir TODAS as views que usam analise_rfm
-- Após mudança de estrutura (remoção de 'estrelas' e mudança de 'perfil')

-- 1. Corrigir vw_rotas_unificada
DROP VIEW IF EXISTS public.vw_rotas_unificada CASCADE;

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

-- 2. Verificar se vw_clientes_completo precisa de atualização
-- (Se ela usa campos de analise_rfm, pode precisar ser recriada)

-- 3. Adicionar comentários
COMMENT ON VIEW public.vw_rotas_unificada IS
'View de rotas com métricas. Atualizada para nova estrutura analise_rfm (sem estrelas, perfil: Ouro/Prata/Bronze).';

-- 4. Criar índices se necessário
CREATE INDEX IF NOT EXISTS idx_analise_rfm_codigo_cliente
  ON public.analise_rfm(codigo_cliente);

CREATE INDEX IF NOT EXISTS idx_analise_rfm_perfil
  ON public.analise_rfm(perfil)
  WHERE perfil IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analise_rfm_classificacao
  ON public.analise_rfm(classificacao_final);
