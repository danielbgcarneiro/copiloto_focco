CREATE OR REPLACE FUNCTION get_pedidos_agrupados_por_cliente(p_vendedor_id text, p_mes integer, p_ano integer)
RETURNS TABLE(data_criacao date, codigo_cliente integer, fantasia text, valor_total numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT
    MAX(p.data_criacao) as data_criacao,
    p.codigo_cliente,
    p.fantasia,
    SUM(p.valor_faturado + p.valor_aberto) as valor_total
  FROM
    pedidos_vendas_mes p
  WHERE
    p.vendedor = p_vendedor_id AND
    EXTRACT(MONTH FROM p.data_criacao) = p_mes AND
    EXTRACT(YEAR FROM p.data_criacao) = p_ano
  GROUP BY
    p.codigo_cliente,
    p.fantasia
  ORDER BY
    valor_total DESC;
END;
$$ LANGUAGE plpgsql;
