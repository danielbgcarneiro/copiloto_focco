-- OPÇÕES PARA CALCULAR/DEFINIR METAS MENSAIS

-- OPÇÃO 1: Meta igual todos os meses (meta anual ÷ 12)
-- Baseado na analise_rfm atual
INSERT INTO metas_vendedores (cod_vendedor, ano, mes, meta_valor)
SELECT 
  c.cod_vendedor,
  2025 as ano,
  generate_series(1, 12) as mes,
  ROUND(SUM(rfm.meta_ano_atual) / 12) as meta_valor
FROM tabela_clientes c
JOIN (
  SELECT DISTINCT ON (codigo_cliente) 
    codigo_cliente, meta_ano_atual
  FROM analise_rfm
  WHERE data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
    AND meta_ano_atual > 0
) rfm ON c.codigo_cliente = rfm.codigo_cliente
WHERE c.cod_vendedor IS NOT NULL
GROUP BY c.cod_vendedor
ON CONFLICT (cod_vendedor, ano, mes) DO UPDATE SET meta_valor = EXCLUDED.meta_valor;

-- OPÇÃO 2: Meta progressiva (começa baixo, aumenta ao longo do ano)
-- Janeiro = 80% da média, Dezembro = 120% da média
WITH meta_base AS (
  SELECT 
    c.cod_vendedor,
    ROUND(SUM(rfm.meta_ano_atual) / 12) as meta_media
  FROM tabela_clientes c
  JOIN (
    SELECT DISTINCT ON (codigo_cliente) 
      codigo_cliente, meta_ano_atual
    FROM analise_rfm
    WHERE data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
      AND meta_ano_atual > 0
  ) rfm ON c.codigo_cliente = rfm.codigo_cliente
  WHERE c.cod_vendedor IS NOT NULL
  GROUP BY c.cod_vendedor
)
INSERT INTO metas_vendedores (cod_vendedor, ano, mes, meta_valor)
SELECT 
  mb.cod_vendedor,
  2025 as ano,
  mes_num,
  ROUND(mb.meta_media * (0.8 + (0.4 * (mes_num - 1) / 11))) as meta_valor
FROM meta_base mb
CROSS JOIN generate_series(1, 12) as mes_num
ON CONFLICT (cod_vendedor, ano, mes) DO UPDATE SET meta_valor = EXCLUDED.meta_valor;

-- OPÇÃO 3: Meta sazonal (maior em alguns meses)
-- Exemplo: Dezembro 150%, Janeiro 60%, outros meses 100%
WITH meta_base AS (
  SELECT 
    c.cod_vendedor,
    ROUND(SUM(rfm.meta_ano_atual) / 12) as meta_media
  FROM tabela_clientes c
  JOIN (
    SELECT DISTINCT ON (codigo_cliente) 
      codigo_cliente, meta_ano_atual
    FROM analise_rfm
    WHERE data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
      AND meta_ano_atual > 0
  ) rfm ON c.codigo_cliente = rfm.codigo_cliente
  WHERE c.cod_vendedor IS NOT NULL
  GROUP BY c.cod_vendedor
)
INSERT INTO metas_vendedores (cod_vendedor, ano, mes, meta_valor)
SELECT 
  mb.cod_vendedor,
  2025 as ano,
  mes_num,
  ROUND(mb.meta_media * 
    CASE mes_num
      WHEN 1 THEN 0.6   -- Janeiro: 60%
      WHEN 12 THEN 1.5  -- Dezembro: 150%
      ELSE 1.0          -- Outros: 100%
    END
  ) as meta_valor
FROM meta_base mb
CROSS JOIN generate_series(1, 12) as mes_num
ON CONFLICT (cod_vendedor, ano, mes) DO UPDATE SET meta_valor = EXCLUDED.meta_valor;

-- Verificar resultado de qualquer opção escolhida
SELECT 
  p.apelido,
  mv.mes,
  TO_CHAR(mv.meta_valor, 'FM999,999,999') as meta_formatada
FROM metas_vendedores mv
JOIN profiles p ON mv.cod_vendedor = p.cod_vendedor
WHERE mv.ano = 2025 AND mv.cod_vendedor = 16
ORDER BY mv.mes;