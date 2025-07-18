# Copiloto Focco Brasil

Uma aplicação moderna e completa para gestão de representantes, rotas e óticas da Focco Brasil, desenvolvida com React, TypeScript e Tailwind CSS.

## ✅ Status do Projeto

**CONCLUÍDO**: Sistema frontend 100% implementado com dados reais e autenticação funcionando.

- ✅ **Frontend Completo**: Todas as páginas implementadas com dados reais
- ✅ **Autenticação**: Sistema RLS funcionando perfeitamente
- ✅ **Debug Avançado**: Sistema completo de logging e identificação de problemas
- ⚠️ **Pendência Backend**: RPC `get_cliente_detalhes` precisa ser corrigida para retornar quantidades de compras

## 🚀 Funcionalidades

### Dashboard Executivo
- **Métricas de Performance**: Vendas do mês, óticas positivadas, atingimento de meta
- **Indicador Crítico**: Óticas sem vendas há mais de 90 dias
- **Top 10 Cidades**: Ranking por valor de vendas com indicadores visuais
- **Top 20 Clientes**: Lista ordenável por rota e percentual de meta
- **Ranking de Rotas**: Gráfico comparativo de meta vs vendido com percentuais

### Sistema de Rotas
- **Gestão Completa**: Visualização de oportunidades, cidades e óticas por rota
- **Indicadores**: Quantidade de óticas sem vendas por mais de 90 dias
- **Busca Inteligente**: Filtro que ignora acentos e caracteres especiais

### Gestão de Cidades
- **Métricas por Cidade**: Soma de oportunidades, saldo de metas
- **Status das Lojas**: Indicadores AT (Ativas), PEN (Pendentes), INA (Inativas)
- **Monitoramento**: Óticas sem vendas há mais de 90 dias por cidade

### Gestão de Óticas/Clientes
- **Perfil Completo**: Status, oportunidades, limites de crédito, metas
- **DSV (Dias Sem Vendas)**: Indicador crítico visível em todas as telas
- **Filtros Avançados**: Por bairro, valor de oportunidade (maior/menor), ordem alfabética
- **Detalhes Completos**: Mix de produtos, dados financeiros 2024/2025

### Sistema de Inadimplência
- **Dashboard Específico**: Total de inadimplentes, valor total, clientes críticos
- **Classificação Automática**: Baseada em dias de atraso (Baixo, Médio, Alto, Crítico)
- **Cálculo Dinâmico**: Dias de atraso calculados automaticamente
- **Ações Diretas**: Botões para ligação e WhatsApp

### Funcionalidades Gerais
- **Autenticação Segura**: Sistema de login com contextos de usuário
- **Design Responsivo**: Interface otimizada para desktop e mobile (2x2 em mobile, 4x1 em desktop)
- **Busca Normalizada**: Ignora acentos e caracteres especiais em todas as buscas
- **Lógica Singular/Plural**: Exibe "ótica" ou "óticas" conforme quantidade

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

## 📱 Interface Responsiva

### Layout Mobile-First
- **Cards de Métricas**: 2x2 em mobile, 4x1 em desktop
- **Navegação**: Header fixo com breadcrumbs
- **Botões de Ação**: Otimizados para toque
- **Textos**: Tamanhos ajustados para evitar quebras

### Funcionalidades UX
- **Busca Inteligente**: Normalização automática de texto
- **Ordenação Visual**: Setas indicativas sempre visíveis
- **Status Coloridos**: Sistema de cores por criticidade
- **Feedback Visual**: Estados hover e transições suaves

## 📊 Estrutura da Aplicação

### Páginas Principais
1. **Dashboard**: Visão executiva completa com métricas e rankings
2. **Rotas**: Gestão de rotas de vendas com indicadores por rota
3. **Cidades**: Métricas por cidade com status das lojas
4. **Clientes/Óticas**: Gestão completa de óticas parceiras
5. **Detalhes do Cliente**: Perfil detalhado com mix de produtos
6. **Inadimplentes**: Sistema especializado para gestão de inadimplência

### Indicadores Críticos
- **DSV (Dias Sem Vendas)**: Presente em clientes e detalhes
- **Sem Vendas +90d**: Indicador em dashboard, rotas e cidades
- **Classificação de Risco**: Automática baseada em dias de atraso
- **Status Dinâmico**: Cálculo em tempo real de dias de atraso

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