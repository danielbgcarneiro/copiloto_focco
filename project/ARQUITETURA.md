# Arquitetura do Sistema Copiloto Focco Brasil

## 📋 Visão Geral do Projeto

O Copiloto Focco Brasil é uma aplicação web moderna para gestão de representantes, rotas e óticas da Focco Brasil. O sistema foi desenvolvido com foco em performance, segurança e usabilidade, utilizando React, TypeScript e Supabase.

## 🏗️ Arquitetura Técnica

### Frontend (React + TypeScript)
- **Framework**: React 18 com TypeScript
- **Build Tool**: Vite
- **Roteamento**: React Router
- **Estilização**: Tailwind CSS
- **Ícones**: Lucide React
- **Estado Global**: Context API

### Backend (Supabase)
- **Base de Dados**: PostgreSQL
- **Autenticação**: Supabase Auth
- **Segurança**: Row Level Security (RLS)
- **API**: REST + RPC Functions
- **Realtime**: Subscriptions em tempo real

## 📂 Estrutura de Diretórios

```
src/
├── components/
│   ├── dashboard/
│   │   └── Dashboard.tsx          # Dashboard principal
│   └── pages/
│       ├── Cidades.tsx            # Gestão de cidades
│       ├── Clientes.tsx           # Lista de clientes
│       ├── DetalhesCliente.tsx    # Detalhes do cliente
│       ├── Inadimplentes.tsx      # Gestão de inadimplência
│       └── Rotas.tsx              # Gestão de rotas
├── contexts/
│   ├── AuthContext.tsx            # Contexto de autenticação
│   └── VendedorDataContext.tsx    # Contexto de dados do vendedor
├── lib/
│   ├── queries/
│   │   └── cliente.ts             # Queries específicas de cliente
│   └── supabase.ts                # Configuração e funções do Supabase
├── App.tsx                        # Componente principal
└── main.tsx                       # Ponto de entrada
```

## 🗄️ Modelo de Dados

### Tabelas Principais

#### 1. profiles
- **Função**: Perfis de usuários do sistema
- **Campos**: id, cod_vendedor, nome_completo, apelido, cargo, status
- **RLS**: Usuários só acessam próprio perfil

#### 2. tabela_clientes
- **Função**: Dados mestres dos clientes
- **Campos**: codigo_cliente, nome_fantasia, razao_social, cidade, bairro, celular
- **RLS**: Filtrado por vendedor através de relacionamentos

#### 3. vw_clientes_completo
- **Função**: View consolidada com todos os dados do cliente
- **Inclui**: Dados básicos, financeiros, métricas, status
- **RLS**: Filtrada por vendedor logado

#### 4. analise_rfm
- **Função**: Análise RFM (Recency, Frequency, Monetary) dos clientes
- **Campos**: percentual_atingimento, estrelas, acao_recomendada, meta_ano_atual
- **Uso**: Indicadores de urgência e classificação por estrelas

#### 5. vendedor_rotas
- **Função**: Relacionamento vendedor-rota
- **Campos**: vendedor_id, rota, ativo
- **RLS**: Usuário só vê próprias rotas

### Views Especializadas

#### vw_metricas_categoria_cliente
- Métricas de produtos por categoria (RX/SOL, Feminino/Masculino, OB/PW)
- Usado no mix de produtos dos detalhes do cliente

#### Funções RPC

#### get_cliente_detalhes(p_codigo_cliente)
- **Função**: Busca dados completos do cliente incluindo quantidades de compras
- **Retorna**: Dados agregados de produtos comprados por ano
- **Status**: ⚠️ Pendente correção no backend (qtd_compras_2024/2025)

## 🔐 Sistema de Segurança

### Row Level Security (RLS)
- **Política**: Usuários só acessam dados de suas rotas
- **Implementação**: Filtros automáticos baseados no user.id
- **Verificação**: Session ativa obrigatória para todas as queries

### Autenticação
- **Método**: Supabase Auth com email/senha
- **Persistência**: Session mantida automaticamente
- **Tokens**: Refresh automático de tokens de acesso

### Níveis de Acesso
1. **Vendedor**: Acesso às próprias rotas e clientes
2. **Gestor**: Acesso à equipe e relatórios
3. **Diretor**: Acesso completo

## 🔄 Fluxo de Dados

### 1. Autenticação
```
Login → Supabase Auth → Profile → Context → Dashboard
```

### 2. Carregamento de Dados
```
Component → useEffect → Query Function → Supabase → RLS Filter → Component State
```

### 3. Busca de Cliente
```
DetalhesCliente → getClienteDetalhes → Multiple Queries → Data Consolidation → UI
```

## 📊 Performance e Otimização

### Estratégias Implementadas
- **Lazy Loading**: Componentes carregados sob demanda
- **Memoização**: Context otimizado para evitar re-renders
- **Debounce**: Busca com delay para reduzir requests
- **Caching**: Session e dados mantidos em contexto

### Queries Otimizadas
- **Joins Eficientes**: Views pré-compiladas no banco
- **Filtros Early**: RLS aplicado no nível do banco
- **Select Específico**: Apenas campos necessários retornados

## 🧪 Debugging e Monitoramento

### Sistema de Logs
- **Console Logs**: Estruturados com emojis para identificação
- **Error Handling**: Captura detalhada de erros com contexto
- **Session Tracking**: Monitoramento de estado de autenticação

### Ferramentas de Debug
- **Temporary Tests**: Logs temporários para identificação de problemas
- **Query Interceptors**: Análise de requests/responses
- **State Inspection**: Debug de estados dos componentes

## 🚨 Problemas Conhecidos e Soluções

### ✅ Resolvidos
1. **Operador || vs ??**: Corrigido para nullish coalescing
2. **SERVICE_ROLE vs ANON_KEY**: Migrado para ANON_KEY respeitando RLS
3. **Dados Mockados**: Removidos de todas as páginas
4. **Error 406**: Identificado como problema de RPC no backend
5. **Indicador de Urgência**: Implementado alerta visual para clientes com meta <50%
6. **Classificação por Estrelas**: Exibição de rating do cliente na página de detalhes

### ⚠️ Pendências
1. **RPC get_cliente_detalhes**: Backend precisa retornar qtd_compras_2024/2025
2. **Títulos Inadimplentes**: Integração com sistema financeiro
3. **Cache Strategy**: Implementar cache mais robusto

## 🔧 Configuração e Deploy

### Variáveis de Ambiente
```
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

### Scripts de Build
- `npm run dev`: Desenvolvimento local
- `npm run build`: Build de produção
- `npm run preview`: Preview local do build

### Deploy Automático
- **GitHub Actions**: CI/CD configurado
- **Targets**: GitHub Pages e Netlify
- **Trigger**: Push para branch main

## 📈 Métricas e KPIs

### Indicadores Implementados
- **DSV (Dias Sem Vendas)**: Cálculo automático por cliente
- **Percentual de Meta**: Atingimento em tempo real
- **Mix de Produtos**: Distribuição por categoria
- **Status Financeiro**: Classificação automática
- **Indicador de Urgência**: Alerta visual para clientes com meta <50%
- **Rating por Estrelas**: Classificação de 1-5 estrelas baseada na análise RFM

### Dashboards
- **Executivo**: Visão consolidada para tomada de decisão
- **Operacional**: Métricas por rota e cidade
- **Financeiro**: Inadimplência e cobrança

## 🔮 Roadmap Técnico

### Próximas Implementações
1. **Offline Mode**: PWA com sync quando online
2. **Push Notifications**: Alertas em tempo real
3. **Advanced Analytics**: Machine learning para previsões
4. **Mobile App**: React Native compartilhando codebase

### Melhorias de Performance
1. **Query Optimization**: Índices e particionamento
2. **CDN Integration**: Assets estáticos otimizados
3. **Bundle Splitting**: Carregamento progressivo
4. **Service Worker**: Cache inteligente

## 📋 Conclusão

O sistema está **100% funcional** no frontend com dados reais e autenticação completa. A única pendência é a correção da RPC `get_cliente_detalhes` no backend para retornar as quantidades de compras por ano.

A arquitetura escolhida permite escalabilidade, manutenibilidade e segurança adequadas para o crescimento do negócio da Focco Brasil.