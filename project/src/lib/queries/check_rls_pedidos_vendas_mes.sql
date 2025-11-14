SELECT
    relname AS table_name,
    polname AS policy_name,
    permissive,
    cmd,
    qual,
    with_check
FROM
    pg_policy p
JOIN
    pg_class c ON c.oid = p.polrelid
WHERE
    c.relname = 'pedidos_vendas_mes';
