# Segurança - Copiloto Focco Brasil

**Desenvolvedor**: Daniel Carneiro
**Copyright**: © 2025 Daniel Carneiro. Todos os direitos reservados.

## 🔐 Configuração de Variáveis de Ambiente

### Arquivo .env
- **NUNCA** commite o arquivo `.env` no repositório
- Use o arquivo `.env.example` como referência
- Mantenha suas credenciais sempre seguras

### Configuração do Supabase
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Configure suas credenciais reais no arquivo .env
# IMPORTANTE: Nunca commite o arquivo .env com credenciais reais
VITE_SUPABASE_URL=sua_url_do_supabase_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

**AVISO CRÍTICO**: As credenciais devem ser únicas para cada ambiente e NUNCA devem ser commitadas no repositório.

## 🛡️ Boas Práticas de Segurança

### Chaves API
- Use apenas chaves **anônimas** (anon key) no frontend
- Chaves de serviço devem ficar APENAS no backend
- Nunca exponha service_role keys no código cliente

### Banco de Dados
- **Row Level Security (RLS)**: Todas as tabelas críticas devem ter políticas RLS ativas
- **Políticas Granulares**: Use políticas específicas por cargo (vendedor, gestor, diretor)
- **Views com security_invoker**: Configure views com `security_invoker = true` para respeitar RLS
- **Validação de Entrada**: Sempre valide e sanitize dados antes de inserir no banco
- **Prepared Statements**: Use queries parametrizadas para prevenir SQL injection
- **Princípio do Menor Privilégio**: Usuários só devem acessar dados necessários para sua função

### Autenticação e Sessão
- **Tokens JWT**: Validar tokens em cada requisição sensível
- **Timeout de Sessão**: Implementar expiração automática de sessões inativas
- **HTTPS Obrigatório**: Usar HTTPS em produção para proteger dados em trânsito
- **Refresh Tokens**: Implementar renovação automática de tokens
- **Logout Seguro**: Limpar completamente sessão e cache no logout
- **Proteção de Rotas**: Usar ProtectedRoute para verificar autenticação e cargo

### Cache e Armazenamento Local
- **Dados Sensíveis**: Nunca armazene senhas ou tokens de acesso no LocalStorage
- **Cache TTL**: Implemente expiração automática de cache (ex: 30 minutos)
- **Limpeza ao Logout**: Remover todos os dados em cache ao fazer logout
- **Dados Públicos Apenas**: Cache LocalStorage deve conter apenas dados não sensíveis
- **Validação de Cache**: Sempre validar integridade dos dados do cache antes de usar

## 🔍 Verificações de Segurança

### Antes de fazer deploy:
1. ✅ Verifique se `.env` está no `.gitignore`
2. ✅ Confirme que não há chaves hardcoded no código
3. ✅ Teste as políticas de RLS no Supabase
4. ✅ Valide os níveis de acesso por tipo de usuário
5. ✅ Revise todas as queries para prevenir SQL injection
6. ✅ Teste autenticação e autorização em todos os endpoints
7. ✅ Verifique se cache não contém dados sensíveis
8. ✅ Confirme que HTTPS está ativo em produção
9. ✅ Teste logout e limpeza de sessão/cache

### Auditoria Regular:
1. **Logs de Acesso**: Monitore tentativas de acesso não autorizado
2. **Revisão de Políticas RLS**: Revisar políticas a cada atualização significativa
3. **Atualização de Dependências**: Manter bibliotecas atualizadas para correções de segurança
4. **Testes de Penetração**: Realizar testes periódicos de segurança

## 🔒 Proteções Implementadas

### Row Level Security (RLS)
O projeto implementa RLS nas seguintes tabelas:
- **profiles**: Usuários só acessam próprio perfil
- **tabela_clientes**: Filtrada por vendedor através de relacionamentos
- **vw_clientes_completo**: Filtrada por vendedor logado
- **analise_rfm**: Vendedores veem apenas RFM dos seus clientes; Gestores/Diretores têm acesso total
- **vendedor_rotas**: Usuário só vê próprias rotas

### Controle de Acesso por Cargo
- **Representante**: Acesso limitado aos próprios clientes e rotas
- **Gestor**: Acesso à equipe e relatórios de inadimplência
- **Diretor**: Acesso completo + Dashboard Gestão exclusivo

### Proteção de Rotas no Frontend
Todas as rotas protegidas usam o componente `ProtectedRoute` que:
- Verifica se o usuário está autenticado
- Valida o cargo do usuário
- Redireciona para login se não autenticado
- Redireciona para dashboard se não autorizado

### Sanitização de Dados
- **Busca Normalizada**: Remove acentos e caracteres especiais
- **Validação de Input**: Campos validados antes de envio
- **Queries Parametrizadas**: Uso do Supabase client que previne SQL injection

## 🚨 Vulnerabilidades Conhecidas e Mitigações

### Cache LocalStorage
- **Risco**: Dados podem ser acessados por outros scripts na mesma origem
- **Mitigação**: Armazenar apenas dados não sensíveis (análises RFM, sem tokens ou senhas)
- **TTL**: Cache expira automaticamente após 30 minutos

### Carregamento de Grandes Volumes
- **Risco**: Possível negação de serviço ao carregar muitos dados
- **Mitigação**: Paginação em lotes de 1000 registros com feedback visual

## 📋 Checklist de Segurança para Desenvolvedores

### Ao adicionar novas funcionalidades:
- [ ] Implementar políticas RLS para novas tabelas
- [ ] Adicionar validação de entrada em todos os formulários
- [ ] Usar ProtectedRoute para novas rotas privadas
- [ ] Testar acesso com diferentes cargos
- [ ] Não armazenar dados sensíveis em cache
- [ ] Implementar tratamento de erros sem expor informações sensíveis
- [ ] Verificar que queries usam o cliente Supabase (não SQL direto)
- [ ] Adicionar logs apropriados para auditoria

### Ao fazer deploy:
- [ ] Rodar `npm run lint` para verificar código
- [ ] Testar autenticação em produção
- [ ] Verificar que variáveis de ambiente estão configuradas
- [ ] Confirmar que HTTPS está ativo
- [ ] Testar políticas RLS em produção

## 📞 Contato para Questões de Segurança

Em caso de vulnerabilidades ou questões de segurança, entre em contato com o desenvolvedor Daniel Carneiro.

**Processo de Relato de Vulnerabilidades**:
1. Não divulgue publicamente a vulnerabilidade
2. Entre em contato com o desenvolvedor (Daniel Carneiro)
3. Forneça detalhes técnicos completos
4. Aguarde confirmação e plano de correção

## 📚 Recursos Adicionais

- [Documentação Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://react.dev/learn/security)
- [TypeScript Security](https://github.com/typescript-eslint/typescript-eslint/blob/main/docs/linting/SECURITY.md)

---

**Sistema desenvolvido por Daniel Carneiro**
© 2025 Daniel Carneiro. Todos os direitos reservados.