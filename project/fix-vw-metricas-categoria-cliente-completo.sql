-- =============================================================================
-- SCRIPT COMPLETO: Correção da View vw_metricas_categoria_cliente
-- =============================================================================
-- Objetivo: Corrigir problemas de RLS (Row Level Security) na view
-- Problema: View retorna dados de todos os vendedores (vazamento de dados)
-- Solução: Aplicar security_invoker e verificar filtros de segurança
-- =============================================================================

-- PASSO 1: VERIFICAÇÃO INICIAL
-- Verificar se a view existe e seu status atual
SELECT 
    'VERIFICACAO_INICIAL' as etapa,
    viewname,
    schemaname,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'SIM - RLS ATIVO'
        WHEN definition ILIKE '%security_invoker%' THEN 'PARCIAL - VERIFICAR'
        ELSE 'NAO - SEM RLS'
    END as status_rls,
    CASE 
        WHEN definition ILIKE '%vendedor%' OR definition ILIKE '%cod_vendedor%' THEN 'SIM - TEM FILTRO'
        ELSE 'NAO - SEM FILTRO'
    END as tem_filtro_vendedor
FROM pg_views 
WHERE viewname = 'vw_metricas_categoria_cliente' 
  AND schemaname = 'public';

-- PASSO 2: BACKUP DA DEFINIÇÃO ATUAL
-- Criar backup da definição atual para rollback se necessário
SELECT 
    'BACKUP_DEFINICAO' as etapa,
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'vw_metricas_categoria_cliente' 
  AND schemaname = 'public';

-- PASSO 3: APLICAR CORREÇÃO DE SEGURANÇA
-- Aplicar security_invoker = true para ativar RLS
ALTER VIEW vw_metricas_categoria_cliente SET (security_invoker = true);

-- PASSO 4: VERIFICAR SE A CORREÇÃO FOI APLICADA
SELECT 
    'VERIFICACAO_CORRECAO' as etapa,
    viewname,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'CORRIGIDO - RLS ATIVO'
        WHEN definition ILIKE '%security_invoker%' THEN 'PARCIAL - VERIFICAR'
        ELSE 'FALHA - SEM RLS'
    END as status_rls_apos_correcao
FROM pg_views 
WHERE viewname = 'vw_metricas_categoria_cliente' 
  AND schemaname = 'public';

-- PASSO 5: TESTE DE FUNCIONALIDADE
-- Testar se a view funciona corretamente com RLS
SELECT 
    'TESTE_FUNCIONALIDADE' as etapa,
    COUNT(*) as total_registros,
    COUNT(DISTINCT codigo_cliente) as clientes_distintos
FROM vw_metricas_categoria_cliente
LIMIT 5;

-- PASSO 6: VERIFICAR SE DADOS ESTÃO SENDO FILTRADOS CORRETAMENTE
-- Verificar se os dados estão sendo filtrados por vendedor
SELECT 
    'TESTE_FILTRAGEM' as etapa,
    'ANTES_LOGIN' as contexto,
    COUNT(*) as total_registros,
    MIN(codigo_cliente) as menor_codigo,
    MAX(codigo_cliente) as maior_codigo
FROM vw_metricas_categoria_cliente;

-- PASSO 7: INFORMAÇÕES ADICIONAIS SOBRE A VIEW
-- Obter informações detalhadas sobre a view
SELECT 
    'INFORMACOES_VIEW' as etapa,
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE viewname = 'vw_metricas_categoria_cliente' 
  AND schemaname = 'public';

-- PASSO 8: VERIFICAR DEPENDÊNCIAS
-- Verificar se existem outras views ou objetos que dependem desta view
SELECT 
    'DEPENDENCIAS' as etapa,
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE definition ILIKE '%vw_metricas_categoria_cliente%' 
  AND viewname != 'vw_metricas_categoria_cliente';

-- PASSO 9: TESTE DE ACESSO COM USUÁRIO ESPECÍFICO
-- (Execute este bloco logado como um vendedor específico)
/*
-- EXECUTE COMO VENDEDOR: misterclaudio1972@gmail.com
SELECT 
    'TESTE_VENDEDOR_ESPECIFICO' as etapa,
    current_user as usuario_atual,
    COUNT(*) as registros_visiveis,
    COUNT(DISTINCT codigo_cliente) as clientes_distintos,
    STRING_AGG(DISTINCT codigo_cliente::text, ', ') as codigos_clientes
FROM vw_metricas_categoria_cliente
LIMIT 10;
*/

-- PASSO 10: SCRIPT DE ROLLBACK (SE NECESSÁRIO)
-- Caso seja necessário desfazer a alteração
/*
-- ROLLBACK: Remover security_invoker (apenas se necessário)
ALTER VIEW vw_metricas_categoria_cliente RESET (security_invoker);
*/

-- =============================================================================
-- VERIFICAÇÃO FINAL COMPLETA
-- =============================================================================

-- Resumo final do status da view
SELECT 
    '=== RELATORIO FINAL ===' as etapa,
    viewname,
    schemaname,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN '✅ RLS ATIVO'
        WHEN definition ILIKE '%security_invoker%' THEN '⚠️ VERIFICAR'
        ELSE '❌ SEM RLS'
    END as status_final,
    CASE 
        WHEN definition ILIKE '%vendedor%' OR definition ILIKE '%cod_vendedor%' THEN '✅ TEM FILTRO'
        ELSE '⚠️ SEM FILTRO'
    END as filtro_vendedor,
    LENGTH(definition) as tamanho_definicao
FROM pg_views 
WHERE viewname = 'vw_metricas_categoria_cliente' 
  AND schemaname = 'public';

-- =============================================================================
-- INSTRUÇÕES DE USO
-- =============================================================================
/*
INSTRUÇÕES PARA EXECUÇÃO:

1. PREPARAÇÃO:
   - Faça backup do banco antes de executar
   - Execute no Supabase SQL Editor
   - Tenha permissões de administrador

2. EXECUÇÃO:
   - Execute os comandos em ordem
   - Verifique cada resultado antes de prosseguir
   - Anote os valores do BACKUP_DEFINICAO

3. VALIDAÇÃO:
   - Teste com usuário vendedor específico
   - Verifique se dados estão sendo filtrados
   - Confirme que aplicação funciona normalmente

4. ROLLBACK (se necessário):
   - Descomente e execute o comando ROLLBACK
   - Ou use o backup da definição original

5. MONITORAMENTO:
   - Monitore logs de erro da aplicação
   - Verifique performance após mudanças
   - Teste com diferentes usuários

NOTAS IMPORTANTES:
- security_invoker = true faz a view executar com permissões do usuário atual
- Isso garante que RLS seja respeitado
- Views sem security_invoker executam com permissões do owner
- Sempre teste com usuários reais após mudanças
*/