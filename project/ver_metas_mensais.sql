-- Ver todas as metas mensais armazenadas

-- 1. Ver todas as metas por vendedor e mês
SELECT 
  p.apelido as vendedor,
  mv.cod_vendedor,
  mv.ano,
  mv.mes,
  CASE mv.mes
    WHEN 1 THEN 'Janeiro'
    WHEN 2 THEN 'Fevereiro' 
    WHEN 3 THEN 'Março'
    WHEN 4 THEN 'Abril'
    WHEN 5 THEN 'Maio'
    WHEN 6 THEN 'Junho'
    WHEN 7 THEN 'Julho'
    WHEN 8 THEN 'Agosto'
    WHEN 9 THEN 'Setembro'
    WHEN 10 THEN 'Outubro'
    WHEN 11 THEN 'Novembro'
    WHEN 12 THEN 'Dezembro'
  END as mes_nome,
  mv.meta_valor,
  TO_CHAR(mv.meta_valor, 'FM999,999,999') as meta_formatada
FROM metas_vendedores mv
JOIN profiles p ON mv.cod_vendedor = p.cod_vendedor
WHERE mv.ano = 2025
ORDER BY mv.cod_vendedor, mv.mes;

-- 2. Ver apenas o mês atual (agosto/2025)
SELECT 
  p.apelido as vendedor,
  mv.cod_vendedor,
  mv.meta_valor,
  'R$ ' || TO_CHAR(mv.meta_valor, 'FM999,999,999') as meta_formatada
FROM metas_vendedores mv
JOIN profiles p ON mv.cod_vendedor = p.cod_vendedor
WHERE mv.ano = EXTRACT(YEAR FROM CURRENT_DATE)
  AND mv.mes = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY mv.cod_vendedor;

-- 3. Verificar se existem metas cadastradas
SELECT 
  COUNT(*) as total_metas_cadastradas,
  COUNT(DISTINCT cod_vendedor) as vendedores_com_meta,
  MIN(ano) as ano_inicial,
  MAX(ano) as ano_final
FROM metas_vendedores;

-- 4. Ver estrutura completa da tabela
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'metas_vendedores'
  AND table_schema = 'public'
ORDER BY ordinal_position;