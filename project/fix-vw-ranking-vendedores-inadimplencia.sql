-- Modificar vw_ranking_vendedores para incluir total de inadimplência por vendedor
-- Baseado nas views vw_inadimplentes e vw_ranking_vendedores existentes

CREATE OR REPLACE VIEW vw_ranking_vendedores AS
SELECT 
    rv.vendedor_uuid,
    rv.nome_vendedor,
    rv.apelido_vendedor,
    rv.total_clientes,
    rv.vendas_2025,
    rv.meta_2025,
    rv.percentual_meta,
    rv.media_vendas_cliente,
    rv.clientes_sem_vendas_90d,
    rv.posicao_ranking,
    -- Nova coluna: total de inadimplência por vendedor
    COALESCE(inadimplencia.valor_total_inadimplencia, 0) AS valor_total_inadimplencia
FROM (
    -- Query original da vw_ranking_vendedores
    SELECT 
        re.vendedor_uuid,
        p.nome as nome_vendedor,
        p.apelido as apelido_vendedor,
        COUNT(DISTINCT c.codigo_cliente) as total_clientes,
        COALESCE(SUM(v.valor_venda), 0) as vendas_2025,
        COALESCE(SUM(cm.meta_2025), 0) as meta_2025,
        CASE 
            WHEN COALESCE(SUM(cm.meta_2025), 0) > 0 
            THEN (COALESCE(SUM(v.valor_venda), 0) / COALESCE(SUM(cm.meta_2025), 0)) * 100
            ELSE 0
        END as percentual_meta,
        CASE 
            WHEN COUNT(DISTINCT c.codigo_cliente) > 0 
            THEN COALESCE(SUM(v.valor_venda), 0) / COUNT(DISTINCT c.codigo_cliente)
            ELSE 0
        END as media_vendas_cliente,
        COUNT(DISTINCT CASE 
            WHEN v.valor_venda IS NULL OR v.valor_venda = 0 
            THEN c.codigo_cliente 
        END) as clientes_sem_vendas_90d,
        RANK() OVER (ORDER BY COALESCE(SUM(v.valor_venda), 0) DESC) as posicao_ranking
    FROM rotas_estado re
    JOIN profiles p ON re.vendedor_uuid = p.id
    LEFT JOIN clientes c ON c.vendedor_uuid = re.vendedor_uuid
    LEFT JOIN vendas v ON v.codigo_cliente = c.codigo_cliente 
        AND EXTRACT(YEAR FROM v.data_venda) = 2025
    LEFT JOIN cliente_metas cm ON cm.codigo_cliente = c.codigo_cliente
    WHERE re.estado = 'CE'
    GROUP BY re.vendedor_uuid, p.nome, p.apelido
) rv
LEFT JOIN (
    -- Subquery para calcular total de inadimplência por vendedor
    SELECT 
        c.vendedor_uuid,
        SUM(tv.valor_titulo) as valor_total_inadimplencia
    FROM clientes c
    JOIN titulos_vencidos tv ON tv.codigo_cliente = c.codigo_cliente
    WHERE tv.data_vencimento < CURRENT_DATE
    GROUP BY c.vendedor_uuid
) inadimplencia ON inadimplencia.vendedor_uuid = rv.vendedor_uuid
ORDER BY rv.vendas_2025 DESC;

-- Comentário: Esta modificação adiciona a coluna valor_total_inadimplencia 
-- mantendo toda a estrutura original da view