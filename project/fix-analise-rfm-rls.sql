-- Drop da política atual que pode estar com problema
DROP POLICY IF EXISTS "Vendedores veem RFM de seus clientes" ON public.analise_rfm;

-- Criar nova política simples baseada em vendedor_uuid como as outras views
CREATE POLICY "rfm_vendedor_access" ON public.analise_rfm
FOR ALL
TO public
USING (
  -- Permitir acesso se for diretor
  (auth.uid() IN (
    SELECT profiles.id 
    FROM profiles 
    WHERE profiles.cargo = 'diretor'
  ))
  OR
  -- Permitir acesso se o cliente pertence ao vendedor
  (EXISTS (
    SELECT 1 
    FROM vw_clientes_completo vc
    WHERE vc.codigo_cliente = analise_rfm.codigo_cliente 
    AND vc.vendedor_uuid = auth.uid()
  ))
);

-- Verificar se RLS está habilitado
ALTER TABLE public.analise_rfm ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- POLÍTICA PARA vw_metricas_categoria_cliente
-- ===================================================

-- Drop política existente se houver
DROP POLICY IF EXISTS "metricas_categoria_vendedor_access" ON public.vw_metricas_categoria_cliente;

-- Criar política para view de métricas de categoria
CREATE POLICY "metricas_categoria_vendedor_access" ON public.vw_metricas_categoria_cliente
FOR ALL
TO public
USING (
  -- Permitir acesso se for diretor
  (auth.uid() IN (
    SELECT profiles.id 
    FROM profiles 
    WHERE profiles.cargo = 'diretor'
  ))
  OR
  -- Permitir acesso se o cliente pertence ao vendedor
  (EXISTS (
    SELECT 1 
    FROM vw_clientes_completo vc
    WHERE vc.codigo_cliente = vw_metricas_categoria_cliente.codigo_cliente 
    AND vc.vendedor_uuid = auth.uid()
  ))
);

-- Habilitar RLS na view (se for uma view materializada)
-- ALTER VIEW public.vw_metricas_categoria_cliente ENABLE ROW LEVEL SECURITY;

-- Testar as políticas (opcional - comentar se não quiser executar)
-- SELECT 
--   ar.codigo_cliente,
--   ar.qtd_compras_2024,
--   ar.qtd_compras_2025
-- FROM analise_rfm ar 
-- WHERE ar.codigo_cliente = 100476
-- LIMIT 1;

-- SELECT 
--   mc.codigo_cliente,
--   mc.rx_fem_ob,
--   mc.rx_fem_pw
-- FROM vw_metricas_categoria_cliente mc 
-- WHERE mc.codigo_cliente = 100476
-- LIMIT 1;