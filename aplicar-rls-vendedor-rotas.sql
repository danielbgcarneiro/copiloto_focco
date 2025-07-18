-- =====================================================
-- APLICAR RLS NA TABELA vendedor_rotas
-- =====================================================
-- Execute no Supabase SQL Editor

-- 1. Habilitar RLS na tabela vendedor_rotas
ALTER TABLE vendedor_rotas ENABLE ROW LEVEL SECURITY;

-- 2. Criar política para que vendedores vejam apenas suas próprias rotas
CREATE POLICY "vendedor_rotas_policy" ON vendedor_rotas
    FOR ALL
    USING (vendedor_id = auth.uid());

-- 3. Verificar se RLS foi aplicado corretamente
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE tablename = 'vendedor_rotas';

-- 4. Verificar políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'vendedor_rotas';

-- 5. Testar como misterclaudio
-- (Execute logado como misterclaudio1972@gmail.com)
SELECT 
    'TESTE_VENDEDOR_ROTAS' as teste,
    vendedor_id,
    rota,
    ativo,
    auth.uid() as current_user_id,
    CASE 
        WHEN vendedor_id = auth.uid() THEN 'CORRETO'
        ELSE 'PROBLEMA - DADOS DE OUTRO VENDEDOR'
    END as status_rls
FROM vendedor_rotas
WHERE ativo = true
ORDER BY rota;

-- 6. Contar rotas por vendedor
SELECT 
    'CONTAGEM_ROTAS' as info,
    COUNT(*) as total_rotas_ativas,
    STRING_AGG(rota, ', ') as rotas_lista
FROM vendedor_rotas 
WHERE ativo = true;