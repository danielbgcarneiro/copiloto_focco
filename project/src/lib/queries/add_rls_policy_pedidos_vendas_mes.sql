CREATE POLICY "vendedor_acessa_proprios_pedidos"
ON pedidos_vendas_mes FOR SELECT
TO authenticated
USING (vendedor = auth.uid());
