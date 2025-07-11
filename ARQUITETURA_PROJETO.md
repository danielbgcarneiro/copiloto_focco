# Arquitetura do Projeto - Copiloto Focco Brasil

## 📋 Resumo Executivo

Aplicação React + TypeScript para gestão de representantes, rotas e óticas da Focco Brasil, com foco em métricas de vendas, inadimplência e gestão de relacionamento com clientes.

## 🏗️ Arquitetura Frontend

### Estrutura de Pastas
```
src/
├── components/
│   ├── auth/
│   │   ├── Login.tsx              # Tela de login
│   │   └── ProtectedRoute.tsx     # Proteção de rotas
│   ├── dashboard/
│   │   └── Dashboard.tsx          # Dashboard principal
│   └── pages/
│       ├── Clientes.tsx           # Listagem de óticas/clientes
│       ├── DetalhesCliente.tsx    # Detalhes do cliente
│       ├── Cidades.tsx            # Gestão por cidades
│       ├── Inadimplentes.tsx      # Sistema de inadimplência
│       └── Rotas.tsx              # Gestão de rotas
├── contexts/
│   ├── AuthContext.tsx            # Contexto de autenticação
│   └── VendedorDataContext.tsx    # Contexto de dados do vendedor
├── lib/
│   └── supabase.ts                # Configuração Supabase
├── App.tsx                        # Componente principal
└── main.tsx                       # Entry point
```

### Fluxo de Dados
1. **Autenticação**: Login → AuthContext → ProtectedRoute
2. **Dados**: Supabase → VendedorDataContext → Componentes
3. **Navegação**: React Router → Componentes de página

### Tecnologias Utilizadas
- **React 18** + TypeScript
- **Vite** (build tool)
- **Tailwind CSS** (estilização)
- **React Router** (roteamento)
- **Supabase** (backend/database)
- **Lucide React** (ícones)

## 🎯 Funcionalidades Principais

### 1. Dashboard Executivo
- **Métricas**: Vendas do mês, óticas positivadas, atingimento de meta
- **Indicadores Críticos**: Óticas sem vendas há +90 dias
- **Rankings**: Top 10 cidades, Top 20 clientes, Rotas vs Meta

### 2. Sistema de Rotas
- **Gestão Completa**: Oportunidades, cidades e óticas por rota
- **Indicadores**: Quantidade de óticas sem vendas +90 dias
- **Busca Inteligente**: Filtro que ignora acentos

### 3. Gestão de Cidades
- **Métricas por Cidade**: Oportunidades, saldo de metas
- **Status das Lojas**: AT (Ativas), PEN (Pendentes), INA (Inativas)
- **Monitoramento**: Óticas sem vendas +90 dias por cidade

### 4. Gestão de Óticas/Clientes
- **Perfil Completo**: Status, oportunidades, limites, metas
- **DSV (Dias Sem Vendas)**: Indicador crítico em todas as telas
- **Filtros Avançados**: Bairro, valor de oportunidade, ordem alfabética

### 5. Sistema de Inadimplência
- **Dashboard Específico**: Total inadimplentes, valor total, clientes críticos
- **Classificação Automática**: Baseada em dias de atraso
- **Cálculo Dinâmico**: Dias de atraso calculados automaticamente

## 🗄️ Estrutura do Banco de Dados (Supabase)

### Estado Atual - Análise Necessária
**⚠️ IMPORTANTE**: Precisa ser mapeado para reorganização

#### Tabelas Identificadas no Código:
1. **Vendedores/Usuários**
   - Sistema de autenticação
   - Níveis de acesso (Representante, Gestor, Diretor)

2. **Dados de Vendas**
   - Métricas de performance
   - Histórico de vendas por cliente/rota

3. **Clientes/Óticas**
   - Informações básicas
   - Status (AT, PEN, INA)
   - Dias sem vendas (DSV)
   - Limites de crédito
   - Metas

4. **Rotas**
   - Vinculação vendedor-rota
   - Cidades por rota
   - Clientes por rota

5. **Inadimplência**
   - Dias de atraso
   - Valores em aberto
   - Classificação de risco

## 📊 Pontos de Integração Frontend-Backend

### Dados Necessários para Funcionalidades:

#### Dashboard:
- [ ] Vendas do mês atual
- [ ] Total de óticas positivadas
- [ ] Percentual de atingimento de meta
- [ ] Óticas sem vendas há +90 dias
- [ ] Ranking de cidades por vendas
- [ ] Ranking de clientes por meta
- [ ] Ranking de rotas (meta vs vendido)

#### Rotas:
- [ ] Lista de rotas por vendedor
- [ ] Oportunidades por rota
- [ ] Cidades por rota
- [ ] Óticas por rota
- [ ] Indicadores de performance

#### Cidades:
- [ ] Lista de cidades por vendedor/rota
- [ ] Soma de oportunidades por cidade
- [ ] Saldo de metas por cidade
- [ ] Status das lojas por cidade
- [ ] Óticas sem vendas +90 dias por cidade

#### Clientes/Óticas:
- [ ] Lista de clientes por filtros
- [ ] Dados completos do cliente
- [ ] Mix de produtos
- [ ] Histórico de vendas
- [ ] Limites de crédito
- [ ] Metas e performance

#### Inadimplentes:
- [ ] Lista de inadimplentes
- [ ] Valores em aberto
- [ ] Dias de atraso
- [ ] Classificação de risco
- [ ] Histórico de cobrança

## 🔧 Melhorias Necessárias

### 1. Estruturação do Banco de Dados
- [ ] Normalização das tabelas
- [ ] Definição de relacionamentos
- [ ] Índices para performance
- [ ] Constraints e validações

### 2. API/Queries Otimizadas
- [ ] Views para dados agregados
- [ ] Queries otimizadas para dashboards
- [ ] Paginação para listagens
- [ ] Cache de dados frequentes

### 3. Integração Frontend-Backend
- [ ] Hooks customizados para dados
- [ ] Loading states
- [ ] Error handling
- [ ] Refresh automático

## 🎨 Design System

### Paleta de Cores Focco Brasil:
- **Primary**: #127CA6 (Azul principal)
- **Secondary**: #32A69A (Verde secundário)
- **Accent**: #77F2E6 (Verde claro)
- **Neutral**: #648C88 (Cinza neutro)

### Componentes Responsivos:
- **Mobile**: Cards 2x2, navegação otimizada
- **Desktop**: Cards 4x1, tabelas completas
- **Busca**: Normalização automática (ignora acentos)

## 🚀 Próximos Passos

1. **Mapear Schema Atual do Supabase**
   - Exportar estrutura atual
   - Identificar gaps e problemas

2. **Redesenhar Banco de Dados**
   - Normalizar estrutura
   - Criar relacionamentos corretos
   - Otimizar para as funcionalidades

3. **Implementar Integrações**
   - APIs para cada funcionalidade
   - Hooks customizados
   - Estados de loading/error

4. **Otimizar Performance**
   - Queries otimizadas
   - Cache estratégico
   - Paginação eficiente

## 📋 Checklist para Claude.ai

### Contexto Atual:
- ✅ Frontend completo desenvolvido
- ✅ Funcionalidades mapeadas
- ❌ Banco de dados não estruturado
- ❌ Integração frontend-backend pendente

### Objetivo:
**Reorganizar o banco de dados Supabase para suportar todas as funcionalidades do frontend e implementar a integração completa.**

---

*Este documento serve como base para discussão com Claude.ai sobre a reestruturação do banco de dados e implementação das integrações necessárias.*