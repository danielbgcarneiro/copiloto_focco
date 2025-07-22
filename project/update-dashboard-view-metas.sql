-- =============================================================================
-- ATUALIZAÇÃO DA VIEW vw_dashboard_metricas PARA USAR NOVA TABELA metas_vendedores
-- =============================================================================
-- Este script atualiza a view do dashboard para buscar metas da nova tabela
-- ao invés de usar valores hardcoded
-- =============================================================================

-- PASSO 1: Verificar definição atual da view
SELECT 
    'DEFINICAO_ATUAL' as info,
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'vw_dashboard_metricas' 
  AND schemaname = 'public';

-- PASSO 2: Verificar se a nova tabela metas_vendedores existe
SELECT 
    'VERIFICAR_TABELA' as info,
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'metas_vendedores'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- PASSO 3: Testar query da nova tabela metas_vendedores
SELECT 
    'TESTE_NOVA_TABELA' as teste,
    cod_vendedor,
    ano,
    mes,
    meta_valor
FROM public.metas_vendedores
LIMIT 5;

-- PASSO 4: Backup da view atual (se existir)
-- Salvar a definição atual antes de modificar
SELECT 
    'BACKUP_VIEW' as backup,
    'CREATE VIEW vw_dashboard_metricas AS ' || definition as backup_completo
FROM pg_views 
WHERE viewname = 'vw_dashboard_metricas' 
  AND schemaname = 'public';

-- PASSO 5: Proposta de nova view vw_dashboard_metricas
-- Esta será a nova definição que usa a tabela metas_vendedores

/*
CREATE OR REPLACE VIEW vw_dashboard_metricas AS
WITH vendedor_meta AS (
    -- Buscar meta do vendedor para o mês/ano atual
    SELECT 
        p.id as vendedor_id,
        COALESCE(mv.meta_valor, 0) as meta_mes
    FROM profiles p
    LEFT JOIN metas_vendedores mv ON (
        mv.cod_vendedor = p.codigo_vendedor::bigint
        AND mv.ano = EXTRACT(YEAR FROM CURRENT_DATE)
        AND mv.mes = EXTRACT(MONTH FROM CURRENT_DATE)
    )
    WHERE p.cargo = 'vendedor'
),
vendas_mes_atual AS (
    -- Calcular vendas do mês atual por vendedor
    -- NOTA: Substituir pela query real que calcula vendas_mes
    SELECT 
        vendedor_uuid as vendedor_id,
        SUM(valor_vendas) as vendas_mes,
        COUNT(DISTINCT codigo_cliente) as oticas_positivadas
    FROM vw_vendas_completo  -- ou a tabela/view correta
    WHERE EXTRACT(YEAR FROM data_venda) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM data_venda) = EXTRACT(MONTH FROM CURRENT_DATE)
    GROUP BY vendedor_uuid
)
SELECT 
    vm.vendedor_id,
    COALESCE(vma.vendas_mes, 0) as vendas_mes,
    COALESCE(vma.oticas_positivadas, 0) as oticas_positivadas,
    vm.meta_mes,
    CASE 
        WHEN vm.meta_mes > 0 
        THEN ROUND((COALESCE(vma.vendas_mes, 0) / vm.meta_mes * 100), 2)
        ELSE 0 
    END as percentual_atingimento
FROM vendedor_meta vm
LEFT JOIN vendas_mes_atual vma ON vm.vendedor_id = vma.vendedor_id;
*/

-- PASSO 6: Verificar se perfils tem codigo_vendedor
SELECT 
    'VERIFICAR_PROFILES' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
  AND column_name LIKE '%vendedor%'
ORDER BY ordinal_position;

-- PASSO 7: Testar join entre profiles e metas_vendedores
SELECT 
    'TESTE_JOIN' as teste,
    p.id as vendedor_id,
    p.codigo_vendedor,
    mv.cod_vendedor,
    mv.meta_valor,
    mv.ano,
    mv.mes
FROM profiles p
LEFT JOIN metas_vendedores mv ON (
    mv.cod_vendedor = p.codigo_vendedor::bigint
    AND mv.ano = EXTRACT(YEAR FROM CURRENT_DATE)
    AND mv.mes = EXTRACT(MONTH FROM CURRENT_DATE)
)
WHERE p.cargo = 'vendedor'
LIMIT 5;

-- PASSO 8: Verificar views relacionadas às vendas
SELECT 
    'VIEWS_VENDAS' as info,
    viewname
FROM pg_views 
WHERE schemaname = 'public'
  AND (viewname ILIKE '%venda%' OR viewname ILIKE '%cliente%')
ORDER BY viewname;

-- =============================================================================
-- INSTRUÇÕES DE EXECUÇÃO
-- =============================================================================
/*
PARA EXECUTAR ESTA ATUALIZAÇÃO:

1. Execute os passos 1-8 para verificar a estrutura atual
2. Anote a definição atual da view (PASSO 1) como backup
3. Identifique a view/tabela correta para vendas (PASSO 8)
4. Ajuste a query do PASSO 5 conforme necessário
5. Execute CREATE OR REPLACE VIEW com a nova definição
6. Teste o dashboard para verificar se funciona

CAMPOS ESPERADOS PELA APLICAÇÃO:
- vendedor_id (UUID)
- vendas_mes (numeric)
- oticas_positivadas (integer)
- meta_mes (numeric) ← AGORA VEM DA TABELA metas_vendedores
- percentual_atingimento (numeric)

TROUBLESHOOTING:
- Se faltar campo codigo_vendedor em profiles, adicione-o
- Se a view de vendas for diferente, ajuste o FROM
- Se os tipos não baterem, use CAST apropriado
*/

-- PASSO 9: Verificar se a view tem security_invoker ativo
SELECT 
    'SECURITY_SETTINGS' as info,
    viewname,
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'RLS_ATIVO'
        ELSE 'RLS_INATIVO'
    END as rls_status
FROM pg_views 
WHERE viewname = 'vw_dashboard_metricas'
  AND schemaname = 'public';

-- PASSO 10: Aplicar security_invoker se necessário (após criar a view)
-- ALTER VIEW vw_dashboard_metricas SET (security_invoker = true);