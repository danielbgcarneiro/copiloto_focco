-- Investigar origem das metas no sistema

-- 1. Verificar estrutura da tabela analise_rfm
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'analise_rfm' 
  AND table_schema = 'public'
  AND column_name LIKE '%meta%'
ORDER BY ordinal_position;

-- 2. Verificar dados recentes da analise_rfm com metas
SELECT 
  codigo_cliente,
  data_analise,
  meta_ano_atual,
  valor_ano_atual,
  created_at,
  updated_at
FROM analise_rfm 
WHERE meta_ano_atual > 0
  AND data_analise = (SELECT MAX(data_analise) FROM analise_rfm)
ORDER BY meta_ano_atual DESC
LIMIT 10;

-- 3. Verificar se existe tabela específica de metas
SELECT 
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%meta%'
ORDER BY table_name;

-- 4. Verificar se existe tabela metas_rotas (mencionada no código)
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'metas_rotas' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Ver dados da tabela metas_rotas se existir
SELECT * FROM metas_rotas LIMIT 10;

-- 6. Verificar histórico de quando as metas foram inseridas/atualizadas
SELECT 
  data_analise,
  COUNT(*) as total_clientes,
  MIN(meta_ano_atual) as menor_meta,
  MAX(meta_ano_atual) as maior_meta,
  AVG(meta_ano_atual) as meta_media,
  MIN(created_at) as primeira_criacao,
  MAX(updated_at) as ultima_atualizacao
FROM analise_rfm 
WHERE meta_ano_atual > 0
GROUP BY data_analise
ORDER BY data_analise DESC
LIMIT 5;

-- 7. Verificar se há alguma view ou função que calcula as metas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND (routine_name LIKE '%meta%' OR routine_definition LIKE '%meta%')
ORDER BY routine_name;