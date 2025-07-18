-- =============================================================================
-- SCRIPT DE EMERGÊNCIA: vw_metricas_categoria_cliente
-- =============================================================================
-- Use este script quando há problemas urgentes com a view
-- Execute comandos individualmente conforme necessário
-- =============================================================================

-- EMERGÊNCIA 1: APLICAR CORREÇÃO RÁPIDA
-- Execute se a view está vazando dados de outros vendedores
ALTER VIEW vw_metricas_categoria_cliente SET (security_invoker = true);

-- EMERGÊNCIA 2: VERIFICAR SE CORREÇÃO FOI APLICADA
SELECT 
    'VERIFICACAO_EMERGENCIA' as status,
    viewname,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'CORRIGIDO'
        ELSE 'AINDA_COM_PROBLEMA'
    END as resultado
FROM pg_views 
WHERE viewname = 'vw_metricas_categoria_cliente';

-- EMERGÊNCIA 3: TESTE RÁPIDO DE FUNCIONALIDADE
-- Verificar se view funciona após correção
SELECT 
    'TESTE_RAPIDO' as teste,
    COUNT(*) as total_registros,
    CASE 
        WHEN COUNT(*) > 0 THEN 'FUNCIONANDO'
        ELSE 'PROBLEMA_ACESSO'
    END as resultado
FROM vw_metricas_categoria_cliente
LIMIT 5;

-- EMERGÊNCIA 4: ROLLBACK RÁPIDO (se necessário)
-- Use apenas se a correção causou problemas
-- ALTER VIEW vw_metricas_categoria_cliente RESET (security_invoker);

-- EMERGÊNCIA 5: VERIFICAR DEFINIÇÃO DA VIEW
-- Para debug rápido da estrutura
SELECT 
    'DEFINICAO_VIEW' as info,
    viewname,
    LEFT(definition, 200) as definicao_parcial
FROM pg_views 
WHERE viewname = 'vw_metricas_categoria_cliente';

-- EMERGÊNCIA 6: VERIFICAR PERMISSÕES
-- Verificar se usuário atual tem acesso
SELECT 
    'PERMISSOES' as info,
    current_user as usuario_atual,
    session_user as usuario_sessao,
    has_table_privilege('vw_metricas_categoria_cliente', 'SELECT') as pode_ler;

-- EMERGÊNCIA 7: TESTAR COM CLIENTE ESPECÍFICO
-- Teste rápido com um cliente (ajuste o código)
SELECT 
    'TESTE_CLIENTE' as teste,
    codigo_cliente,
    rx_fem_ob,
    rx_fem_pw,
    'DADOS_OK' as resultado
FROM vw_metricas_categoria_cliente
WHERE codigo_cliente = (
    SELECT MIN(codigo_cliente) 
    FROM vw_metricas_categoria_cliente
)
LIMIT 1;

-- EMERGÊNCIA 8: COMPARAR COM OUTRAS VIEWS
-- Verificar se outras views têm o mesmo problema
SELECT 
    'COMPARACAO_VIEWS' as info,
    viewname,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'RLS_ATIVO'
        ELSE 'RLS_INATIVO'
    END as status_rls
FROM pg_views 
WHERE viewname IN (
    'vw_metricas_categoria_cliente',
    'vw_clientes_completo',
    'vw_dashboard_metricas',
    'vw_metricas_por_rota'
) AND schemaname = 'public'
ORDER BY viewname;

-- EMERGÊNCIA 9: APLICAR CORREÇÃO EM MASSA (se necessário)
-- Use apenas se várias views precisam de correção
/*
ALTER VIEW vw_metricas_categoria_cliente SET (security_invoker = true);
ALTER VIEW vw_clientes_completo SET (security_invoker = true);
ALTER VIEW vw_dashboard_metricas SET (security_invoker = true);
ALTER VIEW vw_metricas_por_rota SET (security_invoker = true);
*/

-- EMERGÊNCIA 10: VERIFICAR LOGS DE ERRO
-- Verificar se há erros no sistema
SELECT 
    'LOGS_SISTEMA' as info,
    'Verificar logs da aplicação' as instrucao,
    'Procurar por erros 406, 401, 403' as detalhe;

-- =============================================================================
-- CHECKLIST DE EMERGÊNCIA
-- =============================================================================
/*
CHECKLIST PARA SITUAÇÕES DE EMERGÊNCIA:

PROBLEMA: View retorna dados de todos os vendedores
SOLUÇÃO: Execute EMERGÊNCIA 1 (ALTER VIEW)
VERIFICAÇÃO: Execute EMERGÊNCIA 2 (verificar correção)

PROBLEMA: View não funciona após correção
SOLUÇÃO: Execute EMERGÊNCIA 4 (rollback)
INVESTIGAÇÃO: Execute EMERGÊNCIA 5 (verificar definição)

PROBLEMA: Erro de permissão
SOLUÇÃO: Execute EMERGÊNCIA 6 (verificar permissões)
ESCALAÇÃO: Contactar administrador do banco

PROBLEMA: Dados inconsistentes
SOLUÇÃO: Execute EMERGÊNCIA 7 (testar cliente específico)
INVESTIGAÇÃO: Execute EMERGÊNCIA 8 (comparar views)

PROBLEMA: Performance lenta
SOLUÇÃO: Execute EMERGÊNCIA 3 (teste rápido)
INVESTIGAÇÃO: Verificar índices e query plan

PROBLEMA: Múltiplas views com problema
SOLUÇÃO: Execute EMERGÊNCIA 9 (correção em massa)
CUIDADO: Testar cada view individualmente

CONTATOS DE EMERGÊNCIA:
- Administrador do banco: [inserir contato]
- Desenvolvedor responsável: [inserir contato]
- Suporte técnico: [inserir contato]

DOCUMENTAÇÃO:
- Backup da definição original da view
- Log de mudanças aplicadas
- Resultados dos testes de verificação
*/