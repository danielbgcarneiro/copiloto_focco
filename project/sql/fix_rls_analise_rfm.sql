-- Corrigir políticas RLS da tabela analise_rfm
-- Problema: RLS está habilitado mas não há políticas, bloqueando todo acesso

-- POLÍTICA 1: Vendedores podem ver dados RFM dos seus próprios clientes
CREATE POLICY "Vendedores podem ver RFM dos seus clientes"
ON public.analise_rfm
FOR SELECT
TO authenticated
USING (
  -- Verificar se o codigo_cliente pertence ao vendedor logado
  EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.tabela_clientes tc ON tc.cod_vendedor = p.cod_vendedor
    WHERE p.id = auth.uid()
      AND tc.codigo_cliente = analise_rfm.codigo_cliente
  )
);

-- POLÍTICA 2: Gestores e Diretores podem ver todos os dados RFM
CREATE POLICY "Gestores e Diretores podem ver todos os dados RFM"
ON public.analise_rfm
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND cargo IN ('gestor', 'diretor')
  )
);

-- Comentário explicativo
COMMENT ON TABLE public.analise_rfm IS
'Análise RFM completa dos clientes.
RLS: Vendedores veem apenas seus clientes, Gestores/Diretores veem tudo.';
