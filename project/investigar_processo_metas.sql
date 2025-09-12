-- Investigar processo de definição de metas

-- 8. Verificar se há alguma tabela de configuração de metas
SELECT 
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%config%' 
       OR table_name LIKE '%param%'
       OR table_name LIKE '%objetivo%'
       OR table_name LIKE '%alvo%')
ORDER BY table_name;

-- 9. Procurar por triggers ou funções que possam calcular metas automaticamente
SELECT 
  event_object_table,
  trigger_name,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND (action_statement LIKE '%meta%' OR trigger_name LIKE '%meta%')
ORDER BY event_object_table;

-- 10. Verificar se as metas são baseadas em histórico de vendas
SELECT 
  c.codigo_cliente,
  c.nome_fantasia,
  c.cod_vendedor,
  rfm.meta_ano_atual,
  rfm.valor_ano_atual,
  rfm.valor_ano_anterior,
  -- Verificar se meta é baseada no ano anterior
  CASE 
    WHEN rfm.valor_ano_anterior > 0 THEN 
      ROUND((rfm.meta_ano_atual / rfm.valor_ano_anterior) * 100, 2)
    ELSE 0
  END as percentual_crescimento_meta
FROM tabela_clientes c
JOIN analise_rfm rfm ON c.codigo_cliente = rfm.codigo_cliente
WHERE rfm.data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
  AND rfm.meta_ano_atual > 0
  AND rfm.valor_ano_anterior > 0
ORDER BY percentual_crescimento_meta DESC
LIMIT 10;

-- 11. Verificar padrões nas metas (se são números redondos, percentuais fixos, etc.)
SELECT 
  CASE 
    WHEN meta_ano_atual % 1000 = 0 THEN 'Múltiplo de 1000'
    WHEN meta_ano_atual % 100 = 0 THEN 'Múltiplo de 100'
    WHEN meta_ano_atual % 10 = 0 THEN 'Múltiplo de 10'
    ELSE 'Valor específico'
  END as tipo_meta,
  COUNT(*) as quantidade,
  MIN(meta_ano_atual) as menor_valor,
  MAX(meta_ano_atual) as maior_valor
FROM analise_rfm
WHERE data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
  AND meta_ano_atual > 0
GROUP BY 
  CASE 
    WHEN meta_ano_atual % 1000 = 0 THEN 'Múltiplo de 1000'
    WHEN meta_ano_atual % 100 = 0 THEN 'Múltiplo de 100'
    WHEN meta_ano_atual % 10 = 0 THEN 'Múltiplo de 10'
    ELSE 'Valor específico'
  END
ORDER BY quantidade DESC;