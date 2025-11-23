CREATE OR REPLACE FUNCTION get_percentual_meta_anual(ano_param integer)
RETURNS TABLE(
    total_vendas_ano numeric,
    total_metas_ano numeric,
    percentual_anual numeric
) AS $$
DECLARE
    vendas_ano numeric;
    metas_ano numeric;
    current_vendedor_id int;
BEGIN
    -- Obter o cod_vendedor do usuário logado a partir do seu UID de autenticação.
    SELECT cod_vendedor INTO current_vendedor_id
    FROM public.profiles
    WHERE id = auth.uid();

    -- Se não for encontrado um vendedor para o usuário logado, retorna zero para evitar erros.
    IF current_vendedor_id IS NULL THEN
        RETURN QUERY SELECT 0::numeric, 0::numeric, 0::numeric;
        RETURN;
    END IF;

    -- Calcula o total de vendas do ano
    SELECT
        COALESCE(SUM(total_vendas), 0)
    INTO
        vendas_ano
    FROM vendas_mes
    WHERE EXTRACT(YEAR FROM mes_referencia) = ano_param AND codigo_vendedor = current_vendedor_id;

    -- Calcula o total de metas do ano, filtrando pelo 'cod_vendedor'.
    SELECT COALESCE(SUM(meta_valor), 0)
    INTO metas_ano
    FROM metas_vendedores
    WHERE ano = ano_param AND cod_vendedor = current_vendedor_id;

    -- Retorna os valores com o percentual calculado e arredondado.
    RETURN QUERY
    SELECT
        vendas_ano,
        metas_ano,
        CASE
            WHEN metas_ano > 0 THEN ROUND((vendas_ano / metas_ano) * 100, 2)
            ELSE 0
        END;
END;
$$ LANGUAGE plpgsql;
