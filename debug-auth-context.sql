-- Script para debugar contexto de autenticação e RLS
-- Execute no Supabase SQL Editor

-- 1. Criar função para verificar contexto atual
CREATE OR REPLACE FUNCTION get_current_user_info()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'auth_uid', auth.uid(),
        'auth_email', auth.email(),
        'auth_role', auth.role(),
        'current_user', current_user,
        'session_user', session_user,
        'current_timestamp', current_timestamp,
        'has_profile', EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid()),
        'profile_data', (
            SELECT json_build_object(
                'id', id,
                'cod_vendedor', cod_vendedor,
                'nome_completo', nome_completo,
                'cargo', cargo,
                'status', status
            )
            FROM profiles 
            WHERE id = auth.uid()
        ),
        'vendedor_rotas_count', (
            SELECT COUNT(*) 
            FROM vendedor_rotas 
            WHERE vendedor_id = auth.uid() AND ativo = true
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- 2. Testar a função
SELECT get_current_user_info();

-- 3. Verificar RLS policies das tabelas principais
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasroles as has_roles
FROM pg_tables 
WHERE tablename IN ('tabela_clientes', 'vendedor_rotas', 'rotas_estado')
  AND schemaname = 'public';

-- 4. Verificar políticas RLS específicas
SELECT 
    policyname,
    tablename,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('tabela_clientes', 'vendedor_rotas', 'rotas_estado')
ORDER BY tablename, policyname;

-- 5. Testar RLS manualmente para o usuário misterclaudio
-- IMPORTANTE: Execute isso como misterclaudio1972@gmail.com

-- Verificar quantos registros cada tabela retorna
SELECT 'vendedor_rotas' as tabela, COUNT(*) as total FROM vendedor_rotas WHERE ativo = true
UNION ALL
SELECT 'tabela_clientes' as tabela, COUNT(*) as total FROM tabela_clientes  
UNION ALL
SELECT 'vw_metricas_por_rota' as tabela, COUNT(*) as total FROM vw_metricas_por_rota
UNION ALL
SELECT 'vw_cidades_completo' as tabela, COUNT(*) as total FROM vw_cidades_completo
UNION ALL
SELECT 'vw_clientes_completo' as tabela, COUNT(*) as total FROM vw_clientes_completo;

-- 6. Verificar se auth.uid() está funcionando
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_user_email,
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid()) as has_profile;

-- 7. Debug específico para misterclaudio
SELECT 
    'Dados do perfil' as info,
    p.*
FROM profiles p
WHERE p.id = '09f316d7-eeac-4828-85a0-ad1b891f8460'

UNION ALL

SELECT 
    'Rotas atribuídas' as info,
    vr.rota,
    vr.ativo::text,
    vr.created_at::text,
    null as cod_vendedor,
    null as nome_completo,
    null as cargo,
    null as status
FROM vendedor_rotas vr
WHERE vr.vendedor_id = '09f316d7-eeac-4828-85a0-ad1b891f8460'
  AND vr.ativo = true;