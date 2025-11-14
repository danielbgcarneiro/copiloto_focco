CREATE OR REPLACE FUNCTION get_pedidos_agrupados_por_cliente(p_vendedor_id text, p_mes integer, p_ano integer)
RETURNS TABLE(data_criacao date, codigo_cliente integer, fantasia text, valor_total numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT
    '2025-01-01'::date as data_criacao,
    123 as codigo_cliente,
    'CLIENTE TESTE' as fantasia,
    999.99 as valor_total;
END;
$$ LANGUAGE plpgsql;
