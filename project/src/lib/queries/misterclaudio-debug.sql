-- Queries de diagnóstico para o usuário misterclaudio1972@gmail.com
-- Execute estas queries diretamente no Supabase SQL Editor

-- 1. Verificar dados do perfil
SELECT 
  id, 
  email, 
  nome_completo, 
  cargo, 
  cod_vendedor, 
  ativo,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'misterclaudio1972@gmail.com';

-- 2. Verificar rotas atribuídas na tabela vendedor_rotas
SELECT 
  vr.vendedor_id,
  vr.rota,
  vr.ativo,
  vr.created_at,
  vr.updated_at,
  p.email,
  p.nome_completo
FROM vendedor_rotas vr
JOIN profiles p ON p.id = vr.vendedor_id
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'misterclaudio1972@gmail.com';

-- 3. Verificar rotas no rotas_estado para o cod_vendedor
SELECT 
  re.rota,
  re.nome_cidade,
  re.codigo_ibge_cidade,
  re.cod_vendedor,
  COUNT(*) as count_cidades
FROM rotas_estado re
JOIN profiles p ON p.cod_vendedor = re.cod_vendedor
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'misterclaudio1972@gmail.com'
GROUP BY re.rota, re.nome_cidade, re.codigo_ibge_cidade, re.cod_vendedor;

-- 4. Verificar clientes que deveriam ser visíveis baseado no RLS
SELECT 
  tc.codigo_cliente,
  tc.nome_fantasia,
  tc.cidade,
  tc.codigo_ibge_cidade,
  re.rota,
  vr.ativo as rota_ativa
FROM tabela_clientes tc
JOIN rotas_estado re ON re.codigo_ibge_cidade = tc.codigo_ibge_cidade
JOIN vendedor_rotas vr ON vr.rota = re.rota
JOIN profiles p ON p.id = vr.vendedor_id
WHERE p.email = 'misterclaudio1972@gmail.com'
  AND vr.ativo = true
LIMIT 10;

-- 5. Verificar dados nas views principais
SELECT 'vw_dashboard_metricas' as view_name, COUNT(*) as registros
FROM vw_dashboard_metricas
UNION ALL
SELECT 'vw_ranking_rotas' as view_name, COUNT(*) as registros
FROM vw_ranking_rotas
UNION ALL
SELECT 'vw_top10_cidades' as view_name, COUNT(*) as registros
FROM vw_top10_cidades
UNION ALL
SELECT 'vw_metricas_por_rota' as view_name, COUNT(*) as registros
FROM vw_metricas_por_rota
UNION ALL
SELECT 'vw_clientes_completo' as view_name, COUNT(*) as registros
FROM vw_clientes_completo;

-- 6. Verificar se há inconsistências entre vendedor_rotas e rotas_estado
SELECT 
  'vendedor_rotas' as tabela,
  vr.rota,
  COUNT(*) as count
FROM vendedor_rotas vr
JOIN profiles p ON p.id = vr.vendedor_id
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'misterclaudio1972@gmail.com'
  AND vr.ativo = true
GROUP BY vr.rota

UNION ALL

SELECT 
  'rotas_estado' as tabela,
  re.rota,
  COUNT(*) as count
FROM rotas_estado re
JOIN profiles p ON p.cod_vendedor = re.cod_vendedor
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'misterclaudio1972@gmail.com'
GROUP BY re.rota;

-- 7. Verificar se o usuário está sendo reconhecido corretamente
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_user_email,
  p.nome_completo,
  p.cargo,
  p.cod_vendedor
FROM profiles p
WHERE p.id = auth.uid();

-- 8. Simular a query do dashboard para esse usuário específico
WITH usuario_atual AS (
  SELECT id, cod_vendedor, cargo
  FROM profiles 
  WHERE email = 'misterclaudio1972@gmail.com'
)
SELECT 
  rr.rota,
  rr.nome_rota,
  rr.qtd_oticas,
  rr.vendido_2025,
  rr.meta_2025,
  rr.percentual_meta,
  rr.ranking,
  ua.cargo as user_cargo,
  ua.cod_vendedor as user_cod_vendedor
FROM vw_ranking_rotas rr
CROSS JOIN usuario_atual ua
-- Esta query deve retornar dados se o RLS estiver funcionando corretamente
LIMIT 10;