-- Script para corrigir a view vw_metricas_por_rota
-- Corrige o problema de contagem duplicada e adiciona profile_id para RLS

DROP VIEW IF EXISTS vw_metricas_por_rota CASCADE;

CREATE OR REPLACE VIEW vw_metricas_por_rota AS
SELECT 
    re.rota,
    p.id AS profile_id,  -- UUID do profile para facilitar RLS
    COUNT(DISTINCT re.cidade) AS total_cidades,
    COUNT(DISTINCT c.codigo_cliente) AS total_clientes,
    COALESCE(SUM(DISTINCT r.previsao_pedido), 0::numeric) AS soma_oportunidades,
    COUNT(DISTINCT CASE 
        WHEN r.dias_sem_comprar > 90 THEN c.codigo_cliente 
        ELSE NULL 
    END) AS clientes_sem_venda_90d,
    MAX(p.nome_completo) AS vendedor_responsavel
FROM rotas_estado re
LEFT JOIN tabela_clientes c ON c.codigo_ibge_cidade = re.codigo_ibge_cidade
LEFT JOIN analise_rfm r ON c.codigo_cliente = r.codigo_cliente
LEFT JOIN profiles p ON p.cod_vendedor = re.cod_vendedor
WHERE re.rota IS NOT NULL
GROUP BY re.rota, p.id;

-- Garantir que a view tenha as permissões corretas
GRANT SELECT ON vw_metricas_por_rota TO authenticated;

-- Aplicar RLS na view (se necessário)
ALTER VIEW vw_metricas_por_rota SET (security_invoker = true);

-- Comentário explicativo
COMMENT ON VIEW vw_metricas_por_rota IS 'View com métricas agregadas por rota. Inclui profile_id para facilitar RLS. Corrigido problema de contagem duplicada em clientes_sem_venda_90d.';

-- Query de teste para verificar os resultados
-- SELECT 
--     rota,
--     total_clientes,
--     clientes_sem_venda_90d,
--     CASE 
--         WHEN clientes_sem_venda_90d > total_clientes THEN 'ERRO: Inconsistência detectada!'
--         ELSE 'OK'
--     END as validacao
-- FROM vw_metricas_por_rota
-- ORDER BY rota;