# Correção da View vw_metricas_categoria_cliente

## Problema Identificado

A view `vw_metricas_categoria_cliente` está retornando dados de todos os vendedores, violando as regras de segurança RLS (Row Level Security). O problema principal é que a view não tem `security_invoker = true` configurado, fazendo com que ela execute com permissões do owner da view em vez do usuário atual.

## Arquivos Criados

1. **fix-vw-metricas-categoria-cliente-completo.sql** - Script principal de correção
2. **test-vw-metricas-categoria-cliente.sql** - Script de testes e validação
3. **emergency-fix-vw-metricas-categoria-cliente.sql** - Script de emergência
4. **README-vw-metricas-categoria-cliente.md** - Este arquivo de documentação

## Execução das Correções

### 1. Preparação

```bash
# Fazer backup do banco antes das alterações
# Ter acesso de administrador ao Supabase
# Anotar horário da execução para rollback se necessário
```

### 2. Execução Principal

Execute o script principal no Supabase SQL Editor:

```sql
-- Executar: fix-vw-metricas-categoria-cliente-completo.sql
-- Seguir a ordem dos comandos
-- Verificar cada resultado antes de prosseguir
```

### 3. Validação

Execute os testes para verificar se a correção funcionou:

```sql
-- Executar: test-vw-metricas-categoria-cliente.sql
-- Verificar se todos os testes retornam PASS
-- Investigar qualquer FAIL ou AVISO
```

### 4. Emergência

Se houver problemas urgentes, use o script de emergência:

```sql
-- Executar: emergency-fix-vw-metricas-categoria-cliente.sql
-- Executar apenas os comandos necessários
-- Seguir o checklist de emergência
```

## Resultados Esperados

### Antes da Correção
- View retorna dados de todos os vendedores
- Vazamento de informações sensíveis
- Violação das regras RLS

### Após a Correção
- View retorna apenas dados do vendedor logado
- RLS funcionando corretamente
- Segurança restabelecida

## Verificações Importantes

### 1. Status RLS
```sql
-- Deve retornar 'RLS ATIVO'
SELECT 
    CASE 
        WHEN definition ILIKE '%security_invoker = true%' THEN 'RLS ATIVO'
        ELSE 'RLS INATIVO'
    END as status
FROM pg_views 
WHERE viewname = 'vw_metricas_categoria_cliente';
```

### 2. Teste com Usuário Específico
```sql
-- Execute logado como vendedor
-- Deve retornar apenas dados do vendedor logado
SELECT COUNT(*) FROM vw_metricas_categoria_cliente;
```

### 3. Funcionalidade da Aplicação
- Testar página de detalhes do cliente
- Verificar se métricas por categoria aparecem
- Confirmar que não há erros 406

## Rollback (Se Necessário)

Se a correção causar problemas:

```sql
-- Remover security_invoker
ALTER VIEW vw_metricas_categoria_cliente RESET (security_invoker);

-- Verificar se rollback foi aplicado
SELECT 
    CASE 
        WHEN definition ILIKE '%security_invoker%' THEN 'AINDA TEM'
        ELSE 'REMOVIDO'
    END as security_invoker_status
FROM pg_views 
WHERE viewname = 'vw_metricas_categoria_cliente';
```

## Monitoramento Pós-Correção

### 1. Logs da Aplicação
- Verificar se há erros 406 ou similares
- Monitorar performance das consultas
- Confirmar que funcionalidade está normal

### 2. Testes de Usuário
- Testar com diferentes vendedores
- Verificar se cada um vê apenas seus dados
- Confirmar que métricas estão corretas

### 3. Performance
- Medir tempo de resposta da view
- Verificar se há impacto na performance
- Monitorar uso de recursos

## Solução de Problemas

### Problema: View não funciona após correção
**Causa**: Possível problema na definição da view ou permissões
**Solução**: 
1. Verificar definição da view
2. Testar permissões do usuário
3. Fazer rollback se necessário

### Problema: Dados inconsistentes
**Causa**: Possível problema nos dados base ou filtros
**Solução**:
1. Comparar com consulta direta nas tabelas
2. Verificar filtros da view
3. Validar dados de origem

### Problema: Performance lenta
**Causa**: RLS pode impactar performance
**Solução**:
1. Verificar índices nas tabelas base
2. Otimizar query da view se necessário
3. Monitorar query plan

### Problema: Erro de permissão
**Causa**: Usuário sem permissão para acessar view
**Solução**:
1. Verificar permissões do usuário
2. Verificar políticas RLS
3. Contactar administrador

## Contatos

- **Desenvolvedor**: Claude Code
- **Data da Correção**: 2025-07-18
- **Versão**: 1.0
- **Projeto**: Copiloto v3

## Histórico de Mudanças

| Data | Versão | Mudanças |
|------|--------|----------|
| 2025-07-18 | 1.0 | Criação inicial dos scripts de correção |

## Notas Técnicas

- `security_invoker = true` faz a view executar com permissões do usuário atual
- Isso garante que as políticas RLS sejam aplicadas corretamente
- Views sem security_invoker executam com permissões do owner
- Sempre testar com usuários reais após alterações de segurança

## Estrutura da View

A view `vw_metricas_categoria_cliente` contém as seguintes colunas:
- `codigo_cliente`: Código do cliente
- `rx_fem_ob`: Quantidade RX feminino OB
- `rx_fem_pw`: Quantidade RX feminino PW
- `rx_mas_ob`: Quantidade RX masculino OB
- `rx_mas_pw`: Quantidade RX masculino PW
- `sol_fem_ob`: Quantidade SOL feminino OB
- `sol_fem_pw`: Quantidade SOL feminino PW
- `sol_mas_ob`: Quantidade SOL masculino OB
- `sol_mas_pw`: Quantidade SOL masculino PW

## Dependências

A view utiliza as seguintes tabelas:
- `compras_produto_cliente`
- `produtos`
- Possivelmente outras tabelas relacionadas

## Segurança

Esta correção é **CRÍTICA** para a segurança do sistema, pois:
- Evita vazamento de dados entre vendedores
- Garante conformidade com políticas RLS
- Protege informações comerciais sensíveis
- Mantém integridade do sistema de permissões