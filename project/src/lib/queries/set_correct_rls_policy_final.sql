-- Remove a política existente, se houver
DROP POLICY IF EXISTS "vendedor_acessa_proprios_pedidos" ON pedidos_vendas_mes;

-- Adiciona a política correta
CREATE POLICY "vendedor_acessa_proprios_pedidos"
ON pedidos_vendas_mes FOR SELECT
TO authenticated
USING (
  vendedor = (
    SELECT
      cod_vendedor::text
    FROM
      public.profiles
    WHERE
      id = auth.uid()
  )
);
