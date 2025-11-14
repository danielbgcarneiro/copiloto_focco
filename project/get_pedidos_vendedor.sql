CREATE OR REPLACE FUNCTION get_pedidos_por_vendedor(mes_filtro INT, ano_filtro INT)
RETURNS TABLE (
  data_criacao DATE,
  codigo_cliente INT,
  fantasia TEXT,
  valor_faturado NUMERIC,
  valor_aberto NUMERIC
) AS $$
DECLARE
  vendedor_real_name TEXT;
BEGIN
  -- Etapa 1: Obter o nome real do vendedor a partir da coluna 'vendedor' do perfil.
  SELECT vendedor INTO vendedor_real_name
  FROM public.profiles
  WHERE id = auth.uid();

  -- Se nenhum nome for encontrado para o usuário logado, interrompe a execução.
  IF vendedor_real_name IS NULL THEN
    RETURN;
  END IF;

  -- Etapa 2: Executar a consulta principal, comparando o nome real do vendedor.
  RETURN QUERY
  SELECT
    pvm.data_criacao,
    pvm.codigo_cliente,
    pvm.fantasia,
    pvm.valor_faturado,
    pvm.valor_aberto
  FROM
    public.pedidos_vendas_mes AS pvm
  WHERE
    pvm.vendedor = vendedor_real_name AND
    EXTRACT(YEAR FROM pvm.data_criacao) = ano_filtro AND
    EXTRACT(MONTH FROM pvm.data_criacao) = mes_filtro;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;