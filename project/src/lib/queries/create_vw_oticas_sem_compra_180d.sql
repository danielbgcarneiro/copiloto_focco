CREATE OR REPLACE VIEW public.vw_oticas_sem_compra_180d AS
SELECT
    tc.codigo_cliente,
    tc.cod_vendedor,
    p.id AS vendedor_uuid,
    CASE
        WHEN NOT EXISTS (
            SELECT 1
            FROM vendas_mes vm
            WHERE vm.codigo_cliente = tc.codigo_cliente
              AND vm.mes_referencia >= (CURRENT_DATE - INTERVAL '180 days')
        ) THEN true
        ELSE false
    END AS sem_venda_180d,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM vendas_mes vm
            WHERE vm.codigo_cliente = tc.codigo_cliente
              AND EXTRACT(YEAR FROM vm.mes_referencia) = EXTRACT(YEAR FROM CURRENT_DATE)
        ) THEN 'SIM'
        ELSE 'NÃO'
    END AS compra_ano_corrente
FROM
    tabela_clientes tc
JOIN
    profiles p ON tc.cod_vendedor = p.cod_vendedor;
