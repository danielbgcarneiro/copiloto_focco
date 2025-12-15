# Documentação Técnica - Copiloto Focco Brasil

## 1. Visão Geral do Projeto

Bem-vindo ao Copiloto Focco Brasil.

Esta é uma aplicação web moderna de página única (SPA) desenvolvida para a equipe de vendas da Focco Brasil. O sistema oferece dashboards e ferramentas para gestão de representantes, rotas de vendas, clientes (óticas), metas e performance financeira.

O projeto inclui dois módulos principais:
1.  **Módulo Representante**: Ferramentas operacionais para o dia a dia dos vendedores.
2.  **Módulo Gestão Executiva**: Dashboards e relatórios analíticos para a diretoria, com visões consolidadas e análises avançadas de performance.

O objetivo é centralizar dados, otimizar a rotina de vendas e fornecer insights estratégicos para a tomada de decisão.

## 2. Stack de Tecnologias

A aplicação é construída sobre uma stack moderna e robusta:

- **Frontend**:
  - **Framework**: React 18 com TypeScript
  - **Build Tool**: Vite
  - **Roteamento**: React Router 6
  - **Estilização**: Tailwind CSS
  - **Estado Global**: React Context API
  - **Gráficos**: Recharts
  - **Ícones**: Lucide React

- **Backend & Banco de Dados**:
  - **Plataforma**: Supabase
  - **Banco de Dados**: PostgreSQL
  - **Autenticação**: Supabase Auth (Email/Senha)
  - **API**: Geração automática de API REST e Funções RPC (Remote Procedure Call)
  - **Segurança**: Row Level Security (RLS) para controle de acesso a nível de banco de dados.

- **DevOps**:
  - **CI/CD**: GitHub Actions para deploy automatizado.

## 3. Setup do Ambiente Local

Siga os passos abaixo para configurar o projeto em sua máquina.

**Pré-requisitos**:
- Node.js (versão 18 ou superior)
- npm ou yarn

**Passos:**

1.  **Clonar o Repositório**:
    ```bash
    git clone https://github.com/seu-usuario/copiloto-focco-brasil.git
    cd copiloto-focco-brasil
    ```

2.  **Instalar Dependências**:
    ```bash
    npm install
    ```

3.  **Configurar Variáveis de Ambiente**:
    - Copie o arquivo de exemplo `.env.example` e renomeie-o para `.env`.
    - Preencha as variáveis com as credenciais do seu projeto Supabase. Você pode encontrá-las em *Project Settings > API* no seu dashboard Supabase.
      ```env
      VITE_SUPABASE_URL=sua_url_supabase
      VITE_SUPABASE_ANON_KEY=sua_chave_anonima
      ```
    - **Importante**: Use a chave `ANON_KEY`, não a `SERVICE_ROLE_KEY`. A aplicação foi projetada para que a segurança RLS funcione com a chave anônima, que assume as permissões do usuário logado.

4.  **Rodar o Projeto**:
    ```bash
    npm run dev
    ```
    A aplicação estará disponível em `http://localhost:5173` (ou outra porta, se a 5173 estiver em uso).

## 4. Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento com hot-reload.
- `npm run build`: Compila e otimiza a aplicação para produção.
- `npm run preview`: Serve o build de produção localmente para testes.
- `npm run lint`: Executa o ESLint para análise estática do código.

## 5. Arquitetura Geral

### Frontend
A aplicação é uma SPA (Single-Page Application) gerenciada pelo Vite. O `main.tsx` é o ponto de entrada, onde o React é renderizado. O `App.tsx` configura os provedores de contexto globais e o roteador principal (`React Router`), que direciona o usuário para as diferentes páginas da aplicação.

### Backend (Supabase)
O Supabase serve como o "Backend as a Service". Não há um servidor de aplicação tradicional (Node.js, etc.). Toda a lógica de negócio e acesso a dados é feita de duas formas:
1.  **Queries Diretas**: O frontend, através do cliente Supabase.js, faz requisições diretas às tabelas e views do banco de dados.
2.  **Funções RPC**: Para lógicas mais complexas, são utilizadas Funções PostgreSQL que são expostas como endpoints de API pelo Supabase.

A segurança é o pilar desta arquitetura. Como o frontend tem acesso direto ao banco, o controle de acesso é totalmente delegado às políticas de **Row Level Security (RLS)** do PostgreSQL.

### Estado Global
O estado global da aplicação é gerenciado através da **Context API** do React, com dois provedores principais:
- `AuthContext`: Armazena o estado da sessão do usuário (logado ou não), seus dados de perfil (`id`, `cargo`, etc.) e o status de carregamento.
- `VendedorDataContext`: Armazena dados específicos do vendedor logado, como listas de clientes e rotas, para evitar recarregamentos desnecessários entre páginas.

## 6. Estrutura de Diretórios Chave

```
src/
├── components/   # Componentes reutilizáveis (UI) e páginas principais
│   ├── auth/     # Lógica de login, proteção de rotas e redirecionamento
│   │   ├── Login.tsx           # Sistema de autenticação
│   │   ├── ProtectedRoute.tsx  # Proteção de rotas por cargo
│   │   └── HomeRedirect.tsx    # Redirecionamento baseado em cargo
│   ├── dashboard/ # Componentes do dashboard
│   │   ├── Dashboard.tsx       # Dashboard do representante
│   │   └── TabelaPerfil.tsx    # Tabela de perfil de clientes
│   └── pages/    # As páginas que representam cada tela da aplicação
│       ├── Cidades.tsx          # Gestão de cidades
│       ├── Clientes.tsx         # Lista de clientes
│       ├── DetalhesCliente.tsx  # Detalhes do cliente
│       ├── Inadimplentes.tsx    # Gestão de inadimplência
│       ├── Rotas.tsx            # Gestão de rotas
│       ├── PedidosVendedor.tsx  # Visualização de pedidos por período
│       ├── DashboardGestao.tsx  # Dashboard executivo
│       ├── PagAcumuladoAno.tsx  # Análise anual
│       ├── DashboardRotas.tsx   # Dashboard rotas executivo
│       ├── TopClientes.tsx      # Top clientes executivo
│       └── MetasPorCliente.tsx  # Metas por cliente executivo
├── contexts/     # Provedores de Contexto para estado global
│   ├── AuthContext.tsx          # Contexto de autenticação
│   └── VendedorDataContext.tsx  # Contexto de dados do vendedor
├── lib/
│   ├── queries/  # Centraliza todas as funções que buscam dados no Supabase
│   │   ├── cidades.ts           # Queries de cidades
│   │   ├── cliente.ts           # Queries específicas de cliente
│   │   ├── clientes.ts          # Queries de lista de clientes
│   │   ├── dashboard.ts         # Queries do dashboard
│   │   ├── debug.ts             # Funções de debug
│   │   ├── inadimplentes.ts     # Queries de inadimplentes
│   │   ├── rotas.ts             # Queries de rotas
│   │   └── vendedores.ts        # Queries de vendedores
│   ├── utils/    # Funções utilitárias
│   └── supabase.ts # Configuração do cliente Supabase e funções de autenticação
├── styles/       # CSS global e de base
├── types/        # Definições de tipos TypeScript globais
├── utils/        # Utilitários gerais
└── App.tsx       # Componente raiz com o setup de rotas e contextos
```

## 7. Fluxo de Dados e Autenticação

### Autenticação e Níveis de Acesso
O processo de autenticação ocorre em duas etapas e define o nível de acesso do usuário:

1.  **Autenticação**: O usuário faz login com email e senha. O `Supabase Auth` valida as credenciais e retorna uma sessão com um `user.id`.
2.  **Autorização**: Com o `user.id`, a aplicação busca na tabela `profiles` o perfil correspondente. O campo `cargo` ('vendedor', 'gestor', 'diretor') deste perfil determina o nível de acesso.

O componente `ProtectedRoute.tsx` utiliza o `AuthContext` para verificar se o usuário está logado e se seu `cargo` permite o acesso à rota solicitada, redirecionando-o caso contrário.

### Fluxo de Dados Seguro (RLS)
1.  Um componente precisa exibir uma lista de clientes.
2.  Ele chama uma função do diretório `src/lib/queries/` (ex: `getClientes()`).
3.  A função `getClientes()` usa o cliente Supabase para fazer um `select` na tabela (ou view) de clientes.
4.  O Supabase recebe a requisição. Como ela foi feita com a `ANON_KEY`, a sessão do usuário é identificada.
5.  O PostgreSQL ativa a política de RLS na tabela de clientes, que filtra os resultados, retornando **apenas os clientes associados ao `cod_vendedor` do usuário logado**.
6.  O frontend recebe apenas os dados que o usuário tem permissão para ver e os renderiza.

## 8. Modelo de Dados e Backend

O coração da lógica de negócio reside no banco de dados PostgreSQL do Supabase.

- **Tabelas Principais**:
  - `profiles`: Armazena os dados dos usuários da aplicação, incluindo seu `cargo`. Relaciona-se com `auth.users` via UUID.
  - `tabela_clientes`: Contém os dados mestres dos clientes (óticas).
  - `analise_rfm`: Análise RFM (Recency, Frequency, Monetary) completa dos clientes, incluindo:
    - **Scores individuais**: score_r, score_f, score_m (1-5 cada)
    - **Score final**: soma dos scores (3-15)
    - **Classificação**: A-E baseada no score final
    - **Perfil**: 'Ouro', 'Prata' ou 'Bronze' (valores textuais)
    - **Indicadores**: potencial_crescimento, tendencia, alerta_risco
    - **Métricas**: quantidade e valor de compras por ano, metas e percentual de atingimento
    - **RLS**: Vendedores veem apenas dados RFM dos seus clientes; Gestores/Diretores têm acesso total
    - **Observação**: Sistema de estrelas (1-5) foi removido; valores numéricos de perfil (30, 10, 5) foram substituídos por textuais

- **Views (Visões)**:
  - Views como `vw_clientes_completo` são usadas para desnormalizar e consolidar dados de múltiplas tabelas, simplificando as queries do frontend.
  - **Importante**: As views que precisam respeitar RLS devem ser criadas com a opção `security_invoker = true`. Isso faz com que a view seja executada com as permissões do usuário que a chama, e não do seu criador.

- **Funções RPC**:
  - Para lógicas que não podem ser expressas em um simples `SELECT`, como a busca de detalhes agregados de um cliente, são usadas funções em `pl/pgsql` que podem ser chamadas pelo frontend como se fossem uma API.
  - **get_pedidos_por_vendedor(mes_filtro, ano_filtro)**: Retorna pedidos filtrados por período para o vendedor logado. Usada na página "Meus Pedidos".

## 9. Diretrizes e Boas Práticas

- **Performance**: A performance do frontend é uma prioridade. Utilize `React.memo` em componentes que não devem re-renderizar desnecessariamente. Para cálculos computacionalmente caros ou para memoizar objetos/arrays, use `useMemo`. Para funções passadas como props, use `useCallback`.
- **Centralização de Queries**: Toda a comunicação com o Supabase deve ser abstraída em funções dentro do diretório `src/lib/queries/`. Componentes não devem chamar o `supabase.from(...)` diretamente.
- **Estilo de Código**: O projeto é configurado com ESLint para garantir um padrão de código consistente. Rode `npm run lint` para verificar seu código antes de commitar.
- **Tipagem**: Seja explícito com os tipos. Defina interfaces e tipos no diretório `src/types/` ou localmente quando apropriado.

## 10. Deploy
O deploy é automatizado via **GitHub Actions**. Qualquer push na branch `main` irá acionar um workflow que executa o `build` do projeto e o envia para as plataformas configuradas (ex: Vercel, Netlify, GitHub Pages).

## 11. Documentação Adicional

Esta documentação fornece uma visão geral completa para começar. Para um mergulho profundo em detalhes de implementação, schema do banco, políticas de RLS e decisões arquitetônicas, consulte o arquivo [ARQUITETURA.md](ARQUITETURA.md).
