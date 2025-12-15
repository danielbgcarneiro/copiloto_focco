-- Verificar políticas RLS da tabela analise_rfm

-- 1. Verificar se RLS está habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'analise_rfm';

-- 2. Listar todas as políticas RLS da tabela
SELECT
  schemaname,
  tablename,
  policyname as nome_politica,
  permissive,
  roles,
  cmd as comando,
  qual as condicao_using,
  with_check as condicao_check
FROM pg_policies
WHERE tablename = 'analise_rfm'
ORDER BY policyname;

-- 3. Ver a definição completa da tabela incluindo RLS
SELECT pg_get_tabledef('public.analise_rfm'::regclass);
