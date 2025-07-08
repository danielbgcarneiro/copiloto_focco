# Copiloto Focco Brasil

Uma aplicação moderna e completa para gestão de representantes, rotas e óticas da Focco Brasil, desenvolvida com React, TypeScript e Tailwind CSS.

## 🚀 Funcionalidades

- **Dashboard Executivo**: Métricas completas com indicadores de performance
- **Comparativo de Rotas**: Análise de oportunidades por rota
- **Top Clientes**: Rankings dos maiores clientes 2024 e 2025
- **Sistema de Alertas**: Monitoramento de clientes em risco
- **Gestão de Representantes**: Controle completo de representantes por região
- **Rotas Inteligentes**: Organização eficiente de rotas de vendas
- **Gestão de Óticas**: Cadastro e acompanhamento de óticas parceiras
- **Controle de Inadimplência**: Sistema completo para gestores
- **Autenticação Segura**: Sistema de login com níveis de acesso
- **Design Responsivo**: Interface otimizada para desktop e mobile

## 🛠️ Tecnologias

- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **Tailwind CSS** para estilização
- **React Router** para navegação
- **Supabase** para banco de dados
- **Lucide React** para ícones
- **GitHub Actions** para CI/CD

## 🔐 Sistema de Autenticação

A aplicação possui três níveis de acesso:
- **Representante**: Acesso aos próprios dados e rotas
- **Gestor**: Acesso à equipe e relatórios de inadimplência
- **Diretor**: Acesso completo a todos os dados

## 📱 Interface

A aplicação possui uma interface profissional e intuitiva, com:
- Navegação simplificada entre seções
- Dashboard com indicadores executivos
- Sistema de alertas em tempo real
- Filtros e busca avançada
- Indicadores visuais de status
- Design responsivo para todos os dispositivos

## 📊 Funcionalidades do Dashboard

- **Métricas Principais**: Vendas, óticas ativas, metas e alertas
- **Comparativo de Rotas**: Análise de oportunidades por região
- **Top 20 Clientes**: Rankings 2024 e 2025
- **Sistema de Alertas**:
  - 10 Clientes inativando
  - 10 Clientes próximos do 2º boleto atrasado

## 🎨 Design System

Utiliza a paleta de cores oficial da Focco Brasil:
- **Primary**: #127CA6 (Azul principal)
- **Secondary**: #32A69A (Verde secundário)
- **Accent**: #77F2E6 (Verde claro)
- **Neutral**: #648C88 (Cinza neutro)

## 🗄️ Banco de Dados

Integração com Supabase para:
- Autenticação de usuários
- Gestão de vendedores
- Controle de acesso por níveis
- Dados de vendas e clientes

## 🚀 Deploy

Este projeto está configurado para deploy automático no GitHub Pages e Netlify através do GitHub Actions.

### Como fazer o deploy:

1. **Crie um repositório no GitHub**
2. **Faça o push do código**
3. **Configure o GitHub Pages** (automático):
   - Vá em Settings > Pages
   - Selecione "GitHub Actions" como source
4. **O deploy será automático** a cada push na branch main

### Deploy no Netlify:

O projeto também está configurado para Netlify com:
- Headers de segurança otimizados
- Configurações de cache
- Redirecionamentos para SPA

## 📦 Instalação Local

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/copiloto-focco-brasil.git

# Entre no diretório
cd copiloto-focco-brasil

# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm run dev

# Build para produção
npm run build
```

## ⚙️ Configuração

1. **Configure as variáveis de ambiente**:
   - Copie `.env.example` para `.env`
   - Configure as credenciais do Supabase

2. **Configure o banco de dados**:
   - Crie um projeto no Supabase
   - Execute as migrações necessárias
   - Configure a tabela de vendedores

## 🔧 Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento
- `npm run build`: Gera build de produção
- `npm run preview`: Visualiza o build localmente
- `npm run lint`: Executa o linter

## 📄 Licença

© 2025 Focco Brasil. Todos os direitos reservados.