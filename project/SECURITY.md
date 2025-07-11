# Segurança - Copiloto Focco Brasil

## 🔐 Configuração de Variáveis de Ambiente

### Arquivo .env
- **NUNCA** commite o arquivo `.env` no repositório
- Use o arquivo `.env.example` como referência
- Mantenha suas credenciais sempre seguras

### Configuração do Supabase
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Configure suas credenciais reais
VITE_SUPABASE_URL=https://krisjvemfpnkmduebqdr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyaXNqdmVtZnBua21kdWVicWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NTQ5MTMsImV4cCI6MjA2MzQzMDkxM30.jktcXSfSQfcfXUPTDuvu75GuUscMhpsYnvhfloRUf4I
```

## 🛡️ Boas Práticas de Segurança

### Chaves API
- Use apenas chaves **anônimas** (anon key) no frontend
- Chaves de serviço devem ficar APENAS no backend
- Nunca exponha service_role keys no código cliente

### Banco de Dados
- Configure RLS (Row Level Security) no Supabase
- Use políticas de acesso granulares
- Valide sempre os dados de entrada

### Autenticação
- Sempre validar tokens no backend
- Implementar timeout de sessão
- Usar HTTPS em produção

## 🔍 Verificações de Segurança

### Antes de fazer deploy:
1. Verifique se `.env` está no `.gitignore`
2. Confirme que não há chaves hardcoded no código
3. Teste as políticas de RLS no Supabase
4. Valide os níveis de acesso por tipo de usuário

## 📞 Contato para Questões de Segurança

Em caso de vulnerabilidades, entre em contato com a equipe de TI da Focco Brasil.