-- Remove a política existente
DROP POLICY IF EXISTS "vendedor_acessa_proprios_pedidos" ON pedidos_vendas_mes;

-- Adiciona a política simples
CREATE POLICY "vendedor_acessa_proprios_pedidos"
ON pedidos_vendas_mes FOR SELECT
TO authenticated
USING (vendedor = auth.uid()::text);
