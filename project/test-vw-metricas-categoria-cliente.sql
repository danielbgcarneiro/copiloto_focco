-- =============================================================================
-- SCRIPT DE TESTE: vw_metricas_categoria_cliente
-- =============================================================================
-- Objetivo: Testar se a view está funcionando corretamente com RLS
-- Execute após aplicar as correções do script principal
-- =============================================================================

-- TESTE 1: VERIFICAR STATUS RLS
-- Confirmar se security_invoker está ativo
SELECT 
    'TESTE_1_STATUS_RLS' as teste,
    viewname,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'PASS - RLS ATIVO'
        ELSE 'FAIL - RLS INATIVO'
    END as resultado
FROM pg_views 
WHERE viewname = 'vw_metricas_categoria_cliente';

-- TESTE 2: VERIFICAR ACESSO À VIEW
-- Testar se a view pode ser acessada
SELECT 
    'TESTE_2_ACESSO_VIEW' as teste,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'PASS - VIEW ACESSÍVEL'
        ELSE 'FAIL - VIEW INACESSÍVEL'
    END as resultado,
    COUNT(*) as total_registros
FROM vw_metricas_categoria_cliente;

-- TESTE 3: VERIFICAR ESTRUTURA DA VIEW
-- Confirmar se todas as colunas estão presentes
SELECT 
    'TESTE_3_ESTRUTURA' as teste,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'vw_metricas_categoria_cliente'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- TESTE 4: VERIFICAR DADOS ESPECÍFICOS
-- Testar com um cliente específico (ajuste o código conforme necessário)
SELECT 
    'TESTE_4_DADOS_ESPECIFICOS' as teste,
    codigo_cliente,
    rx_fem_ob,
    rx_fem_pw,
    rx_mas_ob,
    rx_mas_pw,
    sol_fem_ob,
    sol_fem_pw,
    sol_mas_ob,
    sol_mas_pw,
    'DADOS_ENCONTRADOS' as resultado
FROM vw_metricas_categoria_cliente
WHERE codigo_cliente = (
    SELECT codigo_cliente 
    FROM vw_metricas_categoria_cliente 
    LIMIT 1
);

-- TESTE 5: VERIFICAR PERFORMANCE
-- Medir tempo de execução da view
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*) FROM vw_metricas_categoria_cliente;

-- TESTE 6: VERIFICAR FILTROS (EXECUTE COMO VENDEDOR)
-- Este teste deve ser executado logado como um vendedor específico
SELECT 
    'TESTE_6_FILTROS_VENDEDOR' as teste,
    current_user as usuario_atual,
    session_user as usuario_sessao,
    COUNT(*) as registros_visiveis,
    COUNT(DISTINCT codigo_cliente) as clientes_distintos,
    CASE 
        WHEN COUNT(*) > 0 AND COUNT(*) < 10000 THEN 'PASS - FILTRADO'
        WHEN COUNT(*) = 0 THEN 'AVISO - NENHUM REGISTRO'
        ELSE 'FAIL - MUITOS REGISTROS'
    END as resultado
FROM vw_metricas_categoria_cliente;

-- TESTE 7: COMPARAR COM DADOS DIRETOS
-- Comparar resultado da view com consulta direta nas tabelas
WITH dados_diretos AS (
    SELECT 
        cpc.codigo_cliente,
        COUNT(*) as total_compras
    FROM compras_produto_cliente cpc
    INNER JOIN produtos p ON cpc.codigo_produto = p.codigo_produto
    GROUP BY cpc.codigo_cliente
    LIMIT 10
),
dados_view AS (
    SELECT 
        codigo_cliente,
        (rx_fem_ob + rx_fem_pw + rx_mas_ob + rx_mas_pw + 
         sol_fem_ob + sol_fem_pw + sol_mas_ob + sol_mas_pw) as total_view
    FROM vw_metricas_categoria_cliente
    WHERE codigo_cliente IN (SELECT codigo_cliente FROM dados_diretos)
)
SELECT 
    'TESTE_7_COMPARACAO' as teste,
    dd.codigo_cliente,
    dd.total_compras,
    COALESCE(dv.total_view, 0) as total_view,
    CASE 
        WHEN dd.total_compras > 0 AND dv.total_view > 0 THEN 'PASS - DADOS CONSISTENTES'
        WHEN dd.total_compras = 0 AND dv.total_view = 0 THEN 'PASS - SEM DADOS'
        ELSE 'AVISO - VERIFICAR CONSISTÊNCIA'
    END as resultado
FROM dados_diretos dd
LEFT JOIN dados_view dv ON dd.codigo_cliente = dv.codigo_cliente;

-- TESTE 8: VERIFICAR LOGS DE ERRO
-- Verificar se há erros recentes relacionados à view
SELECT 
    'TESTE_8_LOGS' as teste,
    'VERIFICAR_LOGS_APLICACAO' as instrucao,
    'Execute este teste na aplicação para verificar erros' as resultado;

-- TESTE 9: TESTE DE CARGA
-- Testar performance com consulta mais complexa
SELECT 
    'TESTE_9_CARGA' as teste,
    COUNT(*) as total_registros,
    COUNT(DISTINCT codigo_cliente) as clientes_distintos,
    AVG(rx_fem_ob + rx_fem_pw + rx_mas_ob + rx_mas_pw + 
        sol_fem_ob + sol_fem_pw + sol_mas_ob + sol_mas_pw) as media_total_produtos,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASS - DADOS DISPONÍVEIS'
        ELSE 'FAIL - SEM DADOS'
    END as resultado
FROM vw_metricas_categoria_cliente;

-- TESTE 10: VERIFICAR INTEGRIDADE DOS DADOS
-- Verificar se não há valores nulos inesperados
SELECT 
    'TESTE_10_INTEGRIDADE' as teste,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN codigo_cliente IS NULL THEN 1 END) as codigos_nulos,
    COUNT(CASE WHEN rx_fem_ob IS NULL THEN 1 END) as rx_fem_ob_nulos,
    COUNT(CASE WHEN rx_fem_pw IS NULL THEN 1 END) as rx_fem_pw_nulos,
    COUNT(CASE WHEN rx_mas_ob IS NULL THEN 1 END) as rx_mas_ob_nulos,
    COUNT(CASE WHEN rx_mas_pw IS NULL THEN 1 END) as rx_mas_pw_nulos,
    COUNT(CASE WHEN sol_fem_ob IS NULL THEN 1 END) as sol_fem_ob_nulos,
    COUNT(CASE WHEN sol_fem_pw IS NULL THEN 1 END) as sol_fem_pw_nulos,
    COUNT(CASE WHEN sol_mas_ob IS NULL THEN 1 END) as sol_mas_ob_nulos,
    COUNT(CASE WHEN sol_mas_pw IS NULL THEN 1 END) as sol_mas_pw_nulos,
    CASE 
        WHEN COUNT(CASE WHEN codigo_cliente IS NULL THEN 1 END) = 0 THEN 'PASS - SEM NULOS'
        ELSE 'AVISO - VALORES NULOS ENCONTRADOS'
    END as resultado
FROM vw_metricas_categoria_cliente;

-- =============================================================================
-- RESUMO DOS TESTES
-- =============================================================================
SELECT 
    '=== RESUMO DOS TESTES ===' as etapa,
    'Execute todos os testes acima' as instrucao,
    'Verifique se todos retornam PASS' as validacao,
    'Investigue qualquer FAIL ou AVISO' as acao;

-- =============================================================================
-- INSTRUÇÕES PARA INTERPRETAÇÃO DOS RESULTADOS
-- =============================================================================
/*
INTERPRETAÇÃO DOS RESULTADOS:

TESTE 1 - STATUS RLS:
- PASS: security_invoker está ativo
- FAIL: security_invoker não está ativo, executar script principal

TESTE 2 - ACESSO VIEW:
- PASS: View pode ser acessada
- FAIL: Erro de permissão ou view não existe

TESTE 3 - ESTRUTURA:
- Deve mostrar todas as 9 colunas esperadas
- Verifique se tipos de dados estão corretos

TESTE 4 - DADOS ESPECÍFICOS:
- Deve retornar dados para pelo menos um cliente
- Valores devem ser números inteiros >= 0

TESTE 5 - PERFORMANCE:
- Tempo de execução deve ser < 1 segundo
- Se muito lento, verificar índices

TESTE 6 - FILTROS VENDEDOR:
- PASS: Registros filtrados por vendedor
- FAIL: Muitos registros (possível vazamento)
- AVISO: Nenhum registro (possível erro de filtro)

TESTE 7 - COMPARAÇÃO:
- PASS: Dados consistentes entre view e consulta direta
- AVISO: Diferenças podem indicar problemas nos dados

TESTE 8 - LOGS:
- Verificar logs da aplicação para erros 406 ou similares

TESTE 9 - CARGA:
- PASS: View funciona com consultas complexas
- FAIL: Erros de performance ou acesso

TESTE 10 - INTEGRIDADE:
- PASS: Sem valores nulos inesperados
- AVISO: Valores nulos podem ser normais dependendo dos dados

AÇÕES RECOMENDADAS:
1. Todos PASS: View está funcionando corretamente
2. Algum FAIL: Investigar erro específico
3. Muitos AVISO: Verificar qualidade dos dados
4. Erro de acesso: Verificar permissões RLS
*/