# Arquitetura do Sistema Copiloto Focco Brasil

## 📋 Visão Geral do Projeto

O Copiloto Focco Brasil é uma aplicação web moderna para gestão de representantes, rotas e óticas da Focco Brasil. O sistema foi desenvolvido com foco em performance, segurança e usabilidade, utilizando React, TypeScript e Supabase. Recentemente foi expandido com um módulo executivo completo para análises avançadas.

## 🏗️ Arquitetura Técnica

### Frontend (React + TypeScript)
- **Framework**: React 18 com TypeScript
- **Build Tool**: Vite
- **Roteamento**: React Router
- **Estilização**: Tailwind CSS
- **Ícones**: Lucide React
- **Estado Global**: Context API
- **Gráficos**: Recharts para visualizações interativas
- **Otimização**: React.memo, useMemo, useCallback

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
│   ├── auth/
│   │   ├── Login.tsx               # Sistema de autenticação
│   │   └── ProtectedRoute.tsx      # Proteção de rotas
│   ├── dashboard/
│   │   └── Dashboard.tsx           # Dashboard representante
│   └── pages/
│       ├── Cidades.tsx             # Gestão de cidades
│       ├── Clientes.tsx            # Lista de clientes
│       ├── DetalhesCliente.tsx     # Detalhes do cliente
│       ├── Inadimplentes.tsx       # Gestão de inadimplência
│       ├── Rotas.tsx               # Gestão de rotas (representante)
│       ├── DashboardGestao.tsx     # Dashboard executivo (NOVO)
│       ├── PagAcumuladoAno.tsx     # Análise anual (NOVO)
│       ├── DashboardRotas.tsx      # Dashboard rotas executivo (NOVO)
│       ├── TopClientes.tsx         # Top clientes executivo (NOVO)
│       └── MetasPorCliente.tsx     # Metas por cliente executivo (NOVO)
├── contexts/
│   ├── AuthContext.tsx             # Contexto de autenticação
│   └── VendedorDataContext.tsx     # Contexto de dados do vendedor
├── lib/
│   ├── queries/
│   │   ├── cliente.ts              # Queries específicas de cliente
│   │   └── rotas.ts                # Queries de rotas
│   ├── utils/
│   │   └── userHelpers.ts          # Utilitários para usuários
│   └── supabase.ts                 # Configuração e funções do Supabase
├── App.tsx                         # Componente principal com roteamento
└── main.tsx                        # Ponto de entrada
```

## 🎯 Módulos do Sistema

### 📊 Módulo Representante
**Páginas principais para uso operacional:**
- **Dashboard**: Métricas pessoais e rankings
- **Rotas**: Gestão de rotas atribuídas
- **Cidades**: Análise por cidade
- **Clientes**: Gestão de óticas
- **Inadimplentes**: Controle de cobrança

### 🎯 Módulo Gestão Executiva (NOVO)
**Exclusivo para diretores - Análises avançadas:**

#### DashboardGestao
- Métricas executivas consolidadas
- Performance semanal com gráficos interativos
- Ranking de vendedores mensal e semanal
- Navegação rápida para módulos especializados

#### PagAcumuladoAno
- Performance anual por mês com acordeões
- Comparativo de clientes únicos 2024 vs 2025
- Análise de cobertura de cidades
- Drill-down por vendedor

#### DashboardRotas
- Top rotas com filtros por vendedor
- Top 30 cidades ordenáveis
- Tabelas com ordenação dinâmica
- Filtros múltiplos inteligentes

#### TopClientes
- Potencial vs Realizado anual
- Top 30 clientes comparativo
- Filtros separados (vendedor + rota)
- Sistema de ranking visual

#### MetasPorCliente (NOVO)
- Visão detalhada de metas por cliente
- Classificação por perfil (Ouro, Prata, Bronze)
- Filtros por vendedor e cidade com busca inteligente
- Tabelas ordenáveis com totais dinâmicos
- Sistema de cores por perfil (amarelo, cinza, laranja)

## 🗄️ Modelo de Dados

### Tabelas Principais

#### 1. profiles
- **Função**: Perfis de usuários do sistema
- **Campos**: id, cod_vendedor, nome_completo, apelido, cargo, status
- **RLS**: Usuários só acessam próprio perfil
- **Níveis**: representante, gestor, diretor

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
- **Exceção**: Diretores têm acesso completo no módulo gestão

### Autenticação
- **Método**: Supabase Auth com email/senha
- **Persistência**: Session mantida automaticamente
- **Tokens**: Refresh automático de tokens de acesso
- **Proteção**: ProtectedRoute component para rotas privadas

### Níveis de Acesso
1. **Representante**: Acesso às próprias rotas e clientes
2. **Gestor**: Acesso à equipe e relatórios
3. **Diretor**: Acesso completo + Módulo Gestão Executiva

## 🔄 Fluxo de Dados

### 1. Autenticação
```
Login → Supabase Auth → Profile → Context → Dashboard/DashboardGestao
```

### 2. Carregamento de Dados
```
Component → useEffect → Query Function → Supabase → RLS Filter → Component State
```

### 3. Busca de Cliente
```
DetalhesCliente → getClienteDetalhes → Multiple Queries → Data Consolidation → UI
```

### 4. Filtros Executivos (NOVO)
```
Filter Change → useMemo → Data Processing → Table Update → Visual Feedback
```

## 📊 Performance e Otimização

### Estratégias Implementadas
- **Lazy Loading**: Componentes carregados sob demanda
- **Memoização**: Context e componentes otimizados para evitar re-renders
- **Debounce**: Busca com delay para reduzir requests
- **Caching**: Session e dados mantidos em contexto
- **React.memo**: Componentes puros memoizados
- **useMemo**: Cálculos pesados otimizados (filtros, totais)
- **useCallback**: Funções de filtro memoizadas

### Queries Otimizadas
- **Joins Eficientes**: Views pré-compiladas no banco
- **Filtros Early**: RLS aplicado no nível do banco
- **Select Específico**: Apenas campos necessários retornados
- **Memory Optimization**: Dados mockados com memo para reduzir processamento

### Otimizações Específicas do Módulo Gestão
- **Dados Mockados Memoizados**: useMemo para vendedores, rotas, clientes
- **Filtros Inteligentes**: Recálculo automático apenas quando necessário
- **Tabelas Virtualizadas**: Scroll horizontal otimizado para mobile
- **Acordeões Performáticos**: Renderização sob demanda

## 🧪 Debugging e Monitoramento

### Sistema de Logs
- **Console Logs**: Estruturados com emojis para identificação
- **Error Handling**: Captura detalhada de erros com contexto
- **Session Tracking**: Monitoramento de estado de autenticação
- **Performance Logs**: Tempo de carregamento de componentes

### Ferramentas de Debug
- **Temporary Tests**: Logs temporários para identificação de problemas
- **Query Interceptors**: Análise de requests/responses
- **State Inspection**: Debug de estados dos componentes
- **Filter Debug**: Logs de filtros aplicados no módulo gestão

## 🎨 Sistema de Design

### Componentes Reutilizáveis
- **Cards Interativos**: Com gradientes e hover effects
- **Tabelas Responsivas**: Ordenação e filtros padronizados
- **Dropdowns**: Seleção múltipla com checkboxes
- **Acordeões**: Expansão de dados detalhados
- **Breadcrumbs**: Navegação entre módulos

### Padrões de UX
- **Loading States**: Spinners e feedback visual
- **Empty States**: Mensagens contextuais
- **Error States**: Tratamento de erros amigável
- **Mobile First**: Design responsivo prioritário

## 🚨 Problemas Conhecidos e Soluções

### ✅ Resolvidos
1. **Operador || vs ??**: Corrigido para nullish coalescing
2. **SERVICE_ROLE vs ANON_KEY**: Migrado para ANON_KEY respeitando RLS
3. **Dados Mockados**: Removidos de páginas operacionais, otimizados no módulo gestão
4. **Error 406**: Identificado como problema de RPC no backend
5. **Indicador de Urgência**: Implementado alerta visual para clientes com meta <50%
6. **Classificação por Estrelas**: Exibição de rating do cliente na página de detalhes
7. **Performance Issues**: Otimizações com memo implementadas
8. **Navigation Issues**: Sistema de breadcrumbs unificado

### ⚠️ Pendências
1. **RPC get_cliente_detalhes**: Backend precisa retornar qtd_compras_2024/2025
2. **Títulos Inadimplentes**: Integração com sistema financeiro
3. **Cache Strategy**: Implementar cache mais robusto
4. **Real Data Integration**: Conectar módulo gestão com dados reais do banco

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
- `npm run lint`: Análise de código

### Deploy Automático
- **GitHub Actions**: CI/CD configurado
- **Targets**: GitHub Pages e Netlify
- **Trigger**: Push para branch main
- **Optimization**: Bundle splitting e tree shaking

## 📈 Métricas e KPIs

### Indicadores Implementados
- **DSV (Dias Sem Vendas)**: Cálculo automático por cliente
- **Percentual de Meta**: Atingimento em tempo real
- **Mix de Produtos**: Distribuição por categoria
- **Status Financeiro**: Classificação automática
- **Indicador de Urgência**: Alerta visual para clientes com meta <50%
- **Rating por Estrelas**: Classificação de 1-5 estrelas baseada na análise RFM

### Dashboards
- **Representante**: Visão operacional individual
- **Executivo**: Métricas consolidadas da empresa
- **Comparativo**: Análises anuais e evolutivas
- **Financeiro**: Inadimplência e cobrança

### Análises Avançadas (Módulo Gestão)
- **Performance Temporal**: Análise mês a mês
- **Ranking Dinâmico**: Top performers com filtros
- **Comparativos**: 2024 vs 2025 automatizados
- **Drill-down**: Detalhamento por vendedor/rota

## 🔮 Roadmap Técnico

### Próximas Implementações
1. **Real Data Integration**: Conectar módulo gestão com banco real
2. **Advanced Filters**: Filtros por período, região, produto
3. **Export Functions**: Relatórios em PDF/Excel
4. **Push Notifications**: Alertas em tempo real
5. **Mobile App**: React Native compartilhando codebase

### Melhorias de Performance
1. **Query Optimization**: Índices e particionamento
2. **CDN Integration**: Assets estáticos otimizados
3. **Bundle Splitting**: Carregamento progressivo otimizado
4. **Service Worker**: Cache inteligente para PWA

### Funcionalidades Avançadas
1. **Machine Learning**: Previsões de vendas
2. **Offline Mode**: PWA com sync quando online
3. **Advanced Analytics**: Dashboards de BI
4. **API Integration**: Integração com ERPs externos

## 📊 Arquitetura de Componentes

### Hierarquia de Componentes
```
App
├── ProtectedRoute
├── AuthProvider
└── UserDataProvider
    ├── Dashboard (Representante)
    └── DashboardGestao (Diretor)
        ├── PagAcumuladoAno
        ├── DashboardRotas
        └── TopClientes
```

### Padrões de Estado
- **Global State**: AuthContext, UserDataContext
- **Local State**: useState para filtros e UI
- **Computed State**: useMemo para cálculos
- **Cached State**: useCallback para funções

## 📊 Schema do Banco de Dados

### Tabelas Principais - Estrutura

#### profiles
```sql
create table public.profiles (
  id uuid not null,                              -- UUID do usuário (FK auth.users)
  cod_vendedor integer null,                     -- Código único do vendedor
  nome_completo text not null,                   -- Nome completo
  apelido text null,                             -- Apelido/nome de exibição
  cargo text null,                               -- 'vendedor', 'gestor', 'diretor'
  status text null default 'ativo'::text,        -- Status do perfil
  vendedor_responsavel text null,                -- Referência ao gerente
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_cod_vendedor_key unique (cod_vendedor),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id)
);
```

**Notas importantes:**
- `cod_vendedor` é INTEGER (não `codigo_vendedor`)
- Relaciona com `tabela_clientes.cod_vendedor`

#### tabela_clientes
```sql
create table public.tabela_clientes (
  id serial not null,
  codigo_cliente integer null,                   -- Código único do cliente
  razao_social text null,
  nome_fantasia text null,
  cidade text null,
  estado text null,
  cod_vendedor integer null,                     -- FK para profiles.cod_vendedor
  -- ... outros campos financeiros e de contato
  constraint tabela_clientes_pkey primary key (id),
  constraint tabela_clientes_codigo_cliente_key unique (codigo_cliente)
);

create index idx_clientes_cod_vendedor on public.tabela_clientes using btree (cod_vendedor);
```

#### analise_rfm
```sql
create table public.analise_rfm (
  id serial not null,
  codigo_cliente integer not null,               -- FK tabela_clientes.codigo_cliente
  perfil text not null,                          -- '30' (ouro), '10' (prata), '5' (bronze)
  meta_ano_atual numeric null,
  valor_ano_atual numeric null,
  percentual_atingimento numeric null,
  estrelas integer null,                         -- Rating 1-5 estrelas
  acao_recomendada text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint analise_rfm_pkey primary key (id)
);
```

**Valores do perfil:** Strings '30', '10', '5' (não números)

### Views Especializadas

#### vw_clientes_completo
View consolidada com dados completos dos clientes, incluindo métricas financeiras e status. Usa `security_invoker = true` para respeitar RLS.

#### vw_metricas_categoria_cliente
Métricas de produtos por categoria (RX/SOL, Feminino/Masculino, OB/PW). **IMPORTANTE:** Configurada com `security_invoker = true` para garantir que RLS seja aplicado corretamente.

**Correção aplicada:**
```sql
ALTER VIEW vw_metricas_categoria_cliente SET (security_invoker = true);
```

Esta correção garante que a view execute com permissões do usuário atual, não do owner, respeitando as políticas RLS.

### Fluxo de Relacionamento
```
auth.users (id: UUID)
    ↓
profiles (id: UUID, cod_vendedor: INTEGER)
    ↓
tabela_clientes (cod_vendedor: INTEGER, codigo_cliente: INTEGER)
    ↓
analise_rfm (codigo_cliente: INTEGER, perfil: TEXT)
```

## 📋 Conclusão

O sistema está **100% funcional** no frontend com dados reais no módulo representante e dados mockados otimizados no módulo gestão executiva. A arquitetura foi expandida para suportar análises avançadas mantendo performance e usabilidade.

### Status Atual
- ✅ **Módulo Representante**: Completo com dados reais
- ✅ **Módulo Gestão**: Completo com dados mockados otimizados
- ✅ **Autenticação**: Totalmente funcional com RLS
- ✅ **Performance**: Otimizada com memo e lazy loading
- ✅ **Views RLS**: Corrigidas com security_invoker
- ⚠️ **Backend Integration**: Pendente para módulo gestão

A arquitetura escolhida permite escalabilidade, manutenibilidade e segurança adequadas para o crescimento do negócio da Focco Brasil, agora com capacidades executivas avançadas para tomada de decisão estratégica.

---

## 📚 Documentação Adicional

Para informações sobre configuração de segurança e variáveis de ambiente, consulte o arquivo `SECURITY.md` na raiz do projeto.