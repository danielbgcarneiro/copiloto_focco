# Arquitetura — Módulo Agenda

> **Versão:** 1.0.0 | **Data:** 2026-05-28 | **Agente:** @architect (Aria)
> **Status:** Documentação atual (brownfield mapping)

---

## 1. Visão Geral

O módulo Agenda é o núcleo operacional do Copiloto para vendedores de campo. Ele resolve o problema de organização de visitas comerciais, fornecendo três capacidades principais:

1. **Planejamento** — O vendedor agenda visitas para clientes de sua carteira, assistido por sugestões inteligentes baseadas em score RFM + DSV.
2. **Execução** — O vendedor registra o resultado da visita no campo (vendeu / não vendeu / ausente), capturando observações e motivos.
3. **Gestão** — Gestores e diretores acompanham KPIs de atividade, cobertura, forecast e qualidade de toda a equipe.

### Princípio de Design

> A agenda não é um calendário. É um sistema de priorização de clientes em campo, orientado por dados RFM e DSV, com feedback loop via registro de visitas.

---

## 2. Mapa de Arquitetura

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CAMADA DE APRESENTAÇÃO                        │
│                                                                        │
│  /agenda                    /gestao/agenda      /gestao/agenda/:id    │
│  Agenda.tsx (936 ln)        GestaoAgenda.tsx    GestaoAgendaVendedor  │
│  └─ Visão pessoal           └─ KPI da equipe    └─ Drilldown vendedor │
│     (dia/semana/mês)           (100 ln)            (372 ln)           │
└─────────────────────────────┬────────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────────┐
│                       CAMADA DE COMPONENTES                            │
│                         (molecules/)                                   │
│                                                                        │
│  AgendaTotalizacaoCard   AgendamentoCard      AgendarVisitaSheet       │
│  └─ Tabela agendamentos  └─ Card com alertas  └─ Calendário + valor   │
│     + totais financeiros    visuais DSV                                │
│                                                                        │
│  SugestoesAgendaSheet    RegistrarVisitaSheet  VendedorAgendaCard     │
│  └─ Hierarquia           └─ Wizard resultado   └─ KPI card gestor     │
│     rota→cidade→cliente     3 passos                                   │
└─────────────────────────────┬────────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────────┐
│                         CAMADA DE ESTADO                               │
│                           (hooks/)                                     │
│                                                                        │
│  useAgenda(vendedorId)              useGestaoAgenda(periodo)          │
│  └─ Cache semanal/mensal            └─ KPIs equipe + detalhes         │
│     Prefetch -1/atual/+1 semana        fetchKpis() / fetchKpisDetalhados│
│     Offline-first (localStorage)                                       │
│                                                                        │
│  useSugestoesAgenda(vendedorId)     useVisitas(codigoCliente)         │
│  └─ Score RFM+DSV                   └─ CRUD visitas + agendamentos    │
│     Hierarquia rota→cidade                                             │
│                                                                        │
│  useConfiguracoes()                                                    │
│  └─ Thresholds DB-driven                                              │
└─────────────────────────────┬────────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────────┐
│                        CAMADA DE UTILITÁRIOS                           │
│                           (utils/)                                     │
│                                                                        │
│  agendaUtils.ts                     alertasAgenda.ts                  │
│  └─ calcularSugestaoData()          └─ getDsvAlertLevel()             │
│  └─ verificarForecastAtipico()      └─ hasAgendamentosSemResultado()  │
│  └─ calcularMetaSemana()            └─ isForecastEmRisco()            │
│  └─ diasUteisRestantesMes()         └─ isCoberturaAgendaBaixa()       │
│  └─ diasUteisSemanaAtual()                                             │
│                                                                        │
│  scoreCliente.ts                                                       │
│  └─ calcularScoreCliente(rfm, maxOp, pesos)                           │
│  └─ ordenarPorScore()                                                  │
└─────────────────────────────┬────────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────────┐
│                     CAMADA DE DADOS (Supabase)                         │
│                                                                        │
│  agendamentos ←──────────────────────────→ visitas                    │
│  (128 registros)    FK bidirecional        (222 registros)            │
│       │                                         │                      │
│       └──────── tabela_clientes ────────────────┘                     │
│                                                                        │
│  motivos_nao_venda   configuracoes_agenda   rotas_estado              │
│  (10 registros)      (6 registros)          (5.570 registros)         │
│                                                                        │
│  vendedor_rotas      analise_rfm            profiles                  │
│  (65 registros)      (leitura only)         (leitura only)            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Rotas e Controle de Acesso

| Rota | Componente | Cargo permitido | Autenticação |
|------|-----------|-----------------|--------------|
| `/agenda` | `Agenda.tsx` | `vendedor`, `gestor`, `diretor` | `auth.uid()` = vendedorId |
| `/gestao/agenda` | `GestaoAgenda.tsx` | `gestor`, `diretor` | Verificado por ProtectedRoute |
| `/gestao/agenda/vendedor/:vendedorId` | `GestaoAgendaVendedor.tsx` | `gestor`, `diretor` | Verificado por ProtectedRoute |

> **Nota de segurança:** A proteção de rota é feita via `ProtectedRoute` (frontend) e reforçada pelas políticas RLS no banco. O frontend **não deve** ser a única barreira — o RLS garante que mesmo requests diretos ao Supabase respeitem as permissões.

---

## 4. Componentes em Detalhe

### 4.1 Pages

#### `Agenda.tsx` — Visão Pessoal do Vendedor (936 linhas)

**Responsabilidade:** Tela principal do vendedor para gerenciar sua agenda diária, semanal e mensal.

**Modos de visualização:**
- **Dia** — Lista detalhada de agendamentos com cidade, DSV, valor previsto e resultado
- **Semana** — Grade 7×N via `SemanaGrid`, dots coloridos por perfil RFM
- **Mês** — Calendário mensal via `MesGrid`, dots para dias com agendamentos

**Estados principais:**

| Estado | Tipo | Propósito |
|--------|------|-----------|
| `view` | `'dia' \| 'semana' \| 'mes'` | Modo de visualização ativo |
| `selectedDate` | `Date` | Dia selecionado (centro da navegação) |
| `weekStart` | `Date` | Domingo da semana atual (sincronizado com selectedDate) |
| `viewMonth` | `{year, month}` | Mês exibido na view mensal |
| `agsDia` | `AgendamentoDiaDetalhado[]` | Agendamentos do dia selecionado (load-on-demand) |
| `refreshKey` | `number` | Trigger para re-fetch após operações |
| `metaMes, realizadoMes` | `number` | Forecast do mês para `AgendaTotalizacaoCard` |

**Interações de gestos:**
- Swipe horizontal (diferença > 50px) navega entre dias
- Eventos `touchstart`/`touchend` no container principal

**Sheets gerenciados:**
- `BuscarClienteSheet` — Busca cliente para agendar
- `SugestoesAgendaSheet` — Sugestões hierárquicas
- `RegistrarVisitaSheet` — Registro de resultado de visita

---

#### `GestaoAgenda.tsx` — Dashboard de Equipe (100 linhas)

**Responsabilidade:** Visão agregada dos KPIs de agenda de todos os vendedores da equipe.

**Decisão de design:** Componente intencionalmente pequeno — toda lógica delegada a `useGestaoAgenda(periodo)`. Segue o princípio de separação de responsabilidades.

**Conteúdo:**
- `ResumoEquipeCard` — KPIs totais (visitas, forecast, pendentes)
- Lista de `VendedorAgendaCard` ordenada por `visitasRealizadas DESC`
- Seletor de período (semana/mês)

---

#### `GestaoAgendaVendedor.tsx` — Drilldown por Vendedor (372 linhas)

**Responsabilidade:** Análise detalhada de um vendedor específico em 4 abas.

**Tabs:**

| Tab | Conteúdo | Dados |
|-----|----------|-------|
| `resumo` | KPI cards: Atividade, Forecast, Qualidade | Métricas calculadas |
| `agenda` | `AgendaTotalizacaoCard` (read-only) | Agendamentos do período |
| `cobertura` | Clientes visitados vs não visitados | `clientesNaoVisitados` |
| `visitas` | Últimas 10 visitas com resultado + badges | `ultimasVisitas` |

**Funcionalidade especial — Inativação de cliente:**
- Quando `motivo_canonico === 'ENCERROU_ATIVIDADES'` em uma visita, um drawer aparece
- Gestor confirma inativação → `UPDATE visitas SET cliente_inativado=true, inativado_em=NOW()`
- Operação é controlada por `visitasInativadas` (estado local com cache de IDs já inativados)

---

### 4.2 Molecules

#### `AgendaTotalizacaoCard.tsx` — Tabela com Totais Financeiros

**Props principais:**
```typescript
interface AgendaTotalizacaoCardProps {
  items: AgendaTotalizacaoItem[]   // Lista de agendamentos enriquecidos
  metaMes: number
  realizadoMes: number
  hoje?: Date
  showClienteTable?: boolean
  onRegistrar?: (id: string) => void
  onClienteClick?: (codigoCliente: number) => void
}
```

**Lógica de totais (bloco inferior):**
- **Previsão do Vendedor** = `sum(items.valor_previsto)`
- **Soma Oportunidade** = `sum(items.oportunidade)` (previsao_pedido RFM)
- **Meta Clientes** = `sum(items.meta_ano_atual)`
- **Meta Semana** = `calcularMetaSemana(metaMes, realizadoMes, hoje)` — dinâmica
- **Saldo Mês** = `max(metaMes - realizadoMes, 0)`

---

#### `AgendamentoCard.tsx` — Card com Alertas Visuais

**Sistema de alertas (borda esquerda colorida):**
- `vermelho` → DSV > `prazo_alerta_vermelho_dias` (default 90d)
- `amarelo` → DSV > `prazo_alerta_amarelo_dias` (default 60d)
- `normal` → sem borda

**Badges adicionais:**
- `"Sem previsão"` (azul) → `valor_previsto` null/0 e visita ≤ 3 dias de hoje
- `"Visita em atraso"` → `status='pendente'` e `data_agendada < hoje`
- `"X dias sem comprar"` → Badge colorido conforme DSV threshold

---

#### `AgendarVisitaSheet.tsx` — Agendar/Editar Visita

**Fluxo:**
1. Calendário navegável (sem datas passadas)
2. Sugestão automática via `calcularSugestaoData()` — clique aplica data
3. Input de valor previsto com verificação de forecast atípico (> 2× média histórica)
4. Validação: data > hoje (modo criação) / data passada = somente leitura (modo edição)

---

#### `SugestoesAgendaSheet.tsx` — Sugestões Hierárquicas (439 linhas)

**Navegação em 3 passos:**

```
rotas (lista expansível)
  └─ cidades (ao expandir rota)
       └─ clientes (ao selecionar cidade)
            └─ confirmar (ao clicar "+ Agendar")
```

**Critério de entrada:** Aparece automaticamente quando `agendamentosThisWeek < 5`

**Destaques por cliente:**
- Badge `"Agendado"` se já tem agendamento pendente esta semana
- DSV colorido (vermelho/amarelo) 
- Barra visual de score (0–100%)

**Proteção contra duplicata:**
- Verifica se já existe `agendamentos` com mesmo `(codigo_cliente, data_agendada, status='pendente')`
- Se sim → Exibe aviso e permite forçar insert

---

### 4.3 Hooks

#### `useAgenda(vendedorId)` — Cache de Agendamentos

**Estratégia de cache:**
```
Primeira carga
  ↓
prefetchAroundDate(selectedDate)
  ├─ fetchWeek(semana anterior)
  ├─ fetchWeek(semana atual)
  └─ fetchWeek(próxima semana)
         ↓
   fetchedWeeks Set (useRef) — evita re-fetch
         ↓
   localStorage key: 'copiloto_agenda_cache'
   TTL: 30 minutos
         ↓
   Invalidação manual: invalidateWeek(date)
   (chamada após criar agendamento ou registrar visita)
```

**Busca detalhada (load-on-demand):**
- `getAgendamentosDia(data, vendedorId)` — Função assíncrona fora do hook
- Faz 4 queries separadas → Join manual em memória
- Ordena resultado: `pendentes(DSV↓) + realizados(DSV↓)`

**Offline handling:**
- Detecta `navigator.onLine` via event listeners
- Serve dados do localStorage se offline
- Flag `isOffline` exposta para a UI exibir banner

---

#### `useGestaoAgenda(periodo)` — KPIs de Gestão

**Dois sub-hooks:**

1. `useGestaoAgenda(periodo: 'semana'|'mes')` — Lista de vendedores com KPIs resumidos
   - Queries bulk (um SELECT por tipo de dado para toda a equipe)
   - Agrega em memória por `vendedor_id`

2. `useKpisDetalhadosVendedor(vendedorId, periodo)` — Detalhes de um vendedor
   - 7 queries em `Promise.all()` (paralelas)
   - Calcula: atividade, forecast, qualidade, cobertura, últimas visitas

**KPIs calculados (detalhado):**

| Indicador | Fórmula |
|-----------|---------|
| `taxaCumprimento` | `(totalVisitas / visitasAgendadas) × 100` |
| `taxaConversao` | `(count(resultado='vendeu') / totalVisitas) × 100` |
| `forecastAccuracy` | `realizadoTotal / forecastTotal` |
| `atingimentoMeta` | `(realizadoTotal / meta) × 100` |
| `mediaVisitasPorSemana` | `totalVisitas / semanas_no_período` |
| `pctCobertura` | `(clientesVisitados / totalClientesCarteira) × 100` |
| `pctComObservacao` | `(visitas_com_obs / totalVisitas) × 100` |

---

#### `useSugestoesAgenda(vendedorId)` — Score de Prioridade

**7 queries em sequência:**
1. `profiles` → cod_vendedor
2. `configuracoes_agenda` → pesos de score
3. `tabela_clientes` + `analise_rfm` (left join) → Carteira completa
4. `agendamentos` pendentes da semana
5. `visitas` → Última visita por cliente
6. `vendedor_rotas` → Rotas ativas
7. `rotas_estado` → Mapeamento `codigo_ibge_cidade → rota`

**Algoritmo de score:**
```
oportunidade_norm = min(previsao_pedido / max_oportunidade_carteira, 1.0)
dsv_norm          = min(dias_sem_comprar / 90, 1.0)
bonus_historico   = 1.0 (última visita = 'vendeu')
                  | 0.5 (outro resultado)
                  | 0.0 (sem visita registrada)

score = (oportunidade_norm × peso_oportunidade)
      + (dsv_norm          × peso_dsv)
      + (bonus_historico   × peso_historico)
```

**Pesos padrão (configuráveis via `configuracoes_agenda`):**
- `oportunidade`: 0.5
- `dsv`: 0.3
- `historico`: 0.2

**Dois outputs:**
- `sugestoes[]` — Top 20 planos por score (DSV > prazo_amarelo, sem agendamento)
- `rotasSugestoes[]` — Top 2 rotas → top 10 cidades → top 20 clientes (previsao_pedido > 0)

---

#### `useVisitas(codigoCliente)` — CRUD de Visitas e Agendamentos

**Operações expostas:**

| Função | Operação DB | Efeito secundário |
|--------|------------|-------------------|
| `registrarVisita(params)` | INSERT visitas | UPDATE agendamentos SET status='realizado', visita_id=id |
| `criarAgendamento(params)` | INSERT agendamentos | — |
| `editarAgendamento(id, params)` | UPDATE agendamentos (partial) | — |
| `cancelarAgendamento(id)` | UPDATE agendamentos SET status='cancelado' | — |
| `carregarMotivos()` | SELECT motivos_nao_venda WHERE ativo=true | — |

**Snapshots RFM salvos em visitas (para auditoria futura):**
- `rfm_perfil_snapshot` — Perfil no momento da visita
- `rfm_oportunidade_snapshot` — Oportunidade no momento
- `rfm_dsv_snapshot` — DSV no momento

---

#### `useConfiguracoes()` — Configurações DB-Driven

**Leitura única** (executa 1× no mount, sem re-fetch).

**Chaves lidas:**

| Chave | Default | Tipo | Editável por |
|-------|---------|------|--------------|
| `prazo_alerta_amarelo_dias` | 60 | número | Gestor, Diretor |
| `prazo_alerta_vermelho_dias` | 90 | número | Gestor, Diretor |
| `threshold_forecast_risco_pct` | 40 | número | Gestor, Diretor |
| `score_peso_oportunidade` | 0.5 | número | Diretor |
| `score_peso_dsv` | 0.3 | número | Diretor |
| `score_peso_historico` | 0.2 | número | Diretor |

---

### 4.4 Utils

#### `agendaUtils.ts`

| Função | Descrição | Fonte de dados |
|--------|-----------|----------------|
| `calcularSugestaoData(codigoCliente)` | Sugere próxima data de visita. Prioridade: média de intervalo das últimas 3 vendas → frequência anual RFM → fallback 45d | visitas + analise_rfm |
| `verificarForecastAtipico(codigo, valor)` | Retorna `{atipico, mediaHistorica}` se valor > 2× média das últimas 5 vendas | visitas |
| `diasUteisRestantesMes(hoje)` | Conta dias úteis até fim do mês (excl. feriados hardcoded) | — |
| `diasUteisSemanaAtual(hoje)` | Conta dias úteis até domingo OU fim do mês (o menor) | — |
| `calcularMetaSemana(metaMes, realizadoMes, hoje)` | Distribui saldo do mês pelos dias úteis restantes | — |

**Feriados hardcoded (2026–2030):**
```
Fixos: 01-01, 04-21, 05-01, 09-07, 10-12, 11-02, 11-15, 11-20, 12-25
Páscoa: 2026-04-03, 2027-03-26, 2028-04-14, 2029-04-06, 2030-04-19
```

#### `alertasAgenda.ts`

| Função | Retorno | Lógica |
|--------|---------|--------|
| `getDsvAlertLevel(dsv, amarelo, vermelho)` | `'normal' \| 'amarelo' \| 'vermelho'` | Comparação com thresholds |
| `hasAgendamentosSemResultado(cache, hoje)` | `number` | Count de pendentes com data < hoje no cache |
| `isForecastEmRisco(realizado, meta, threshold, diaSemana)` | `boolean` | `realizado < meta × threshold% AND diaSemana >= 4` |
| `isCoberturaAgendaBaixa(oportunidade, meta)` | `boolean` | `oportunidade < meta × 0.5` |

---

## 5. Fluxos de Dados Críticos

### 5.1 Fluxo de Agendamento (Vendedor cria agendamento)

```
Vendedor toca FAB  →  BuscarClienteSheet abre
       ↓
Busca cliente (tabela_clientes) por nome/código
       ↓
Seleciona cliente  →  AgendarVisitaSheet abre
       ↓
calcularSugestaoData() → Sugestão de data
       ↓
Vendedor escolhe data + valor previsto (opcional)
       ↓
verificarForecastAtipico() → Warning se valor > 2× média
       ↓
useVisitas.criarAgendamento()
  → INSERT agendamentos (status='pendente')
       ↓
useAgenda.invalidateWeek(data)
  → Remove da fetchedWeeks Set
       ↓
Prefetch re-executa → Cache atualizado → UI atualiza
```

### 5.2 Fluxo de Registro de Visita

```
Vendedor toca "Registrar resultado"  →  RegistrarVisitaSheet abre
       ↓
Passo 1: Seleciona resultado (vendeu/não vendeu/ausente)
       ↓
Passo 2: Formulário contextual
  vendeu      → Input valor realizado + observações
  não vendeu  → Dropdown motivos + observações
  ausente     → Observações
       ↓
useVisitas.registrarVisita(params)
  → INSERT visitas (com rfm_*_snapshot)
  → UPDATE agendamentos SET status='realizado', visita_id=data.id
       ↓
Passo 3 (se sem agendamento futuro):
  calcularSugestaoData() → Sugestão próxima visita
  Botão "Agendar próxima visita"
       ↓
useAgenda.invalidateWeek() → Re-fetch → UI atualiza
```

### 5.3 Fluxo de Sugestões Hierárquicas

```
useAgenda detecta agendamentosThisWeek < 5
       ↓
Banner "Você tem poucas visitas agendadas" aparece
       ↓
Vendedor toca "Ver sugestões"  →  SugestoesAgendaSheet abre
       ↓
useSugestoesAgenda.carregar(weekStart)
  → 7 queries em sequência
  → calcularScoreCliente() para cada cliente da carteira
  → Gera: sugestoes[] + rotasSugestoes[]
       ↓
Navegação: rotas → clientes → confirmar
       ↓
INSERT agendamentos  →  onSuccess()  →  invalidateWeek()
```

---

## 6. Modelo de Permissões

### 6.1 Controle de Acesso por Cargo

| Operação | Vendedor | Gestor | Diretor |
|----------|----------|--------|---------|
| Ver própria agenda | ✅ | ✅ | ✅ |
| Criar agendamento | ✅ (próprio) | ❌ | ❌ |
| Registrar visita | ✅ (própria) | ❌ | ❌ |
| Ver KPIs da equipe | ❌ | ✅ | ✅ |
| Ver drilldown de vendedor | ❌ | ✅ | ✅ |
| Inativar cliente (via visita) | ❌ | ✅ | ✅ |
| Alterar configurações | ❌ | ✅ (editavel_gestor=true) | ✅ |
| Cadastrar motivos | ❌ | ✅ | ✅ |

### 6.2 RLS — Políticas de Banco de Dados

As políticas RLS garantem que mesmo requests diretos ao Supabase respeitem o controle de acesso. A função `get_user_cargo()` é central para todas as verificações de nível gestor/diretor.

**agendamentos:**
- SELECT: `vendedor_id = auth.uid()` OR `get_user_cargo() IN ('gestor','diretor')`
- INSERT: `vendedor_id = auth.uid()`
- UPDATE: `vendedor_id = auth.uid()` OR `get_user_cargo() IN ('gestor','diretor')`
- DELETE: ⚠️ **Sem política definida** (ver seção de gaps)

**visitas:**
- SELECT: `vendedor_id = auth.uid()` OR `get_user_cargo() IN ('gestor','diretor')`
- INSERT: `vendedor_id = auth.uid()`
- UPDATE: `vendedor_id = auth.uid()` OR `get_user_cargo() IN ('gestor','diretor')`
- DELETE: ⚠️ **Sem política definida**

---

## 7. Bugs e Gaps Identificados

### 🔴 Críticos

#### BUG-AG-001 — Índice duplicado em `agendamentos`
**Arquivo:** Banco de dados
**Problema:** `idx_agendamentos_pendentes` e `idx_agendamentos_vendedor_data` são idênticos — ambos em `(vendedor_id, data_agendada)`.
**Impacto:** Overhead de manutenção desnecessário a cada INSERT/UPDATE.
**Fix:**
```sql
DROP INDEX IF EXISTS idx_agendamentos_pendentes;
```

#### BUG-AG-002 — FK circular entre `agendamentos` e `visitas`
**Arquivo:** Banco de dados
**Problema:** `agendamentos.visita_id → visitas.id` E `visitas.agendamento_id → agendamentos.id`. Ambas as tabelas referenciam uma à outra, criando dependência circular.
**Impacto:** Requer duas operações para INSERT consistente (insert visita → update agendamento). Em transações, pode causar deadlock. O código atual lida com isso corretamente (insert visita primeiro, depois update agendamento), mas a estrutura é frágil.
**Fix:** Manter apenas `visitas.agendamento_id → agendamentos.id` (direção correta). Remover `agendamentos.visita_id` e obter a visita via `SELECT id FROM visitas WHERE agendamento_id = ?`.

#### BUG-AG-003 — Sem políticas DELETE nas tabelas principais
**Arquivo:** Banco de dados — `agendamentos`, `visitas`, `configuracoes_agenda`
**Problema:** Nenhuma política RLS para DELETE. Se o Supabase tiver `force_rls` desabilitado para `service_role`, deleções podem ser feitas sem restrição via SDK admin.
**Impacto:** Risco de deleção não autorizada de dados.
**Fix:**
```sql
CREATE POLICY "agendamentos_delete" ON agendamentos
  FOR DELETE USING (vendedor_id = auth.uid());

CREATE POLICY "visitas_delete" ON visitas
  FOR DELETE USING (vendedor_id = auth.uid());
```

#### BUG-AG-004 — Sem CHECK constraint em campos enum
**Arquivo:** Banco de dados — `agendamentos.status`, `visitas.resultado`
**Problema:** Ambas as colunas são `text` sem validação. Um INSERT com valor inválido (ex: `resultado = 'comprou'`) seria aceito silenciosamente.
**Fix:**
```sql
ALTER TABLE agendamentos 
  ADD CONSTRAINT chk_status 
  CHECK (status IN ('pendente','realizado','cancelado','reagendado'));

ALTER TABLE visitas 
  ADD CONSTRAINT chk_resultado 
  CHECK (resultado IN ('vendeu','nao_vendeu','ausente','reagendou'));
```

---

### 🟠 Altos

#### BUG-AG-005 — useEffect da meta do mês sem dependências completas
**Arquivo:** `src/components/pages/Agenda.tsx` (linhas ~194-203)
**Problema:** O efeito que carrega `getForecastMes` não inclui o mês/ano atual nas dependências. Se o usuário deixar a app aberta pela virada do mês, os dados não atualizam.
**Fix:**
```typescript
const hoje = new Date()
useEffect(() => {
  if (!vendedorId) return
  const now = new Date()
  getForecastMes(now.getFullYear(), now.getMonth() + 1, vendedorId)
    .then(({ metaMes, realizadoMes }) => {
      setMetaMes(metaMes)
      setRealizadoMes(realizadoMes)
    })
}, [vendedorId, hoje.getFullYear(), hoje.getMonth()])
```

#### BUG-AG-006 — Error handling silencioso em getAgendamentosDia
**Arquivo:** `src/components/pages/Agenda.tsx` (linha ~189)
**Problema:** `.catch(() => setAgsDia([]))` — erro é silenciado, usuário não sabe que os dados falharam.
**Fix:** Exibir toast de erro ou banner de falha.
```typescript
.catch((err) => {
  console.error('Erro ao carregar agenda do dia:', err)
  setAgsDia([])
  toast.error('Não foi possível carregar a agenda. Tente novamente.')
})
```

#### BUG-AG-007 — Colunas analíticas em `visitas` não populadas pelo frontend
**Arquivo:** Banco de dados — `visitas` (colunas `dia_semana`, `semana_do_mes`, `mes_do_ano`, `num_visitas_90d`, `num_visitas_180d`, `num_visitas_360d`, `intervalo_desde_ultima_visita_dias`, `resultado_ultima_visita`, `motivo_ultima_nao_venda`)
**Problema:** O `useVisitas.registrarVisita()` não envia esses campos no INSERT. Se não há trigger no banco para populá-los, ficam NULL indefinidamente.
**Impacto:** Se futuras features usarem essas colunas (ex: relatórios de frequência), os dados históricos estão incompletos.
**Fix:** Verificar se existe trigger `trg_visitas_after_insert`. Se não existir, criar um:
```sql
-- Verificar:
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'visitas';
```

#### BUG-AG-008 — `rotas_estado.codigo_ibge_uf` como `double precision`
**Arquivo:** Banco de dados — `rotas_estado`
**Problema:** Código IBGE de UF é um número inteiro (ex: 35 = SP), mas foi definido como `double precision`. Pode causar comparações incorretas (35.0 ≠ 35) e é semanticamente incorreto.
**Fix:**
```sql
ALTER TABLE rotas_estado 
  ALTER COLUMN codigo_ibge_uf TYPE integer USING codigo_ibge_uf::integer;
```

#### BUG-AG-009 — `vendedor_rotas.vendedor_id` é nullable
**Arquivo:** Banco de dados — `vendedor_rotas`
**Problema:** A coluna `vendedor_id` (FK para `profiles`) permite NULL, o que não faz sentido semântico — toda rota precisa pertencer a um vendedor.
**Fix:**
```sql
ALTER TABLE vendedor_rotas 
  ALTER COLUMN vendedor_id SET NOT NULL;
```

---

### 🟡 Médios

#### PERF-AG-001 — Missing index em `visitas(codigo_cliente, data_visita)`
**Arquivo:** Banco de dados
**Problema:** `calcularSugestaoData()` e `verificarForecastAtipico()` fazem queries filtrando por `codigo_cliente` e ordenando por `data_visita`. Sem índice composto, essas queries fazem full scan.
**Fix:**
```sql
CREATE INDEX idx_visitas_cliente_data 
  ON visitas(codigo_cliente, data_visita DESC);
```

#### PERF-AG-002 — Políticas RLS redundantes em `rotas_estado` e `vendedor_rotas`
**Arquivo:** Banco de dados
**Problema:** `rotas_estado` tem 3 políticas SELECT (rotas_estado_select, rotas_estado_admin, vendedor_acessa_rotas_atribuidas) com overlapping. `vendedor_rotas` tem 2 políticas SELECT sobrepostas.
**Impacto:** Cada query avalia todas as políticas antes de decidir acesso. Pode impactar performance em tabelas grandes.
**Fix:** Consolidar as políticas SELECT em uma única por tabela.

#### CODE-AG-001 — Feriados hardcoded até 2030
**Arquivo:** `src/utils/agendaUtils.ts` (linhas ~115-135)
**Problema:** A lista de feriados de Páscoa está hardcoded para 2026–2030. Em 2030, a função de meta semanal deixará de ser precisa.
**Fix recomendado:** Mover feriados para `configuracoes_agenda` ou calcular Páscoa algoritmicamente.

---

## 8. Dependências Externas do Módulo

| Dependência | Tipo | Uso |
|-------------|------|-----|
| `analise_rfm` | Tabela (leitura) | perfil, previsao_pedido, dias_sem_comprar, meta_ano_atual |
| `tabela_clientes` | Tabela (leitura) | razao_social, nome_fantasia, cidade, cod_vendedor |
| `metas_vendedores` | Tabela (leitura) | meta_valor (mensal por vendedor) |
| `vendas_mes` | Tabela (leitura) | total_vendas (realizado mensal) |
| `vendas_semanais` | Tabela (leitura) | valor_faturado (realizado semanal) |
| `profiles` | Tabela (leitura) | cod_vendedor, nome_completo, cargo |
| `get_user_cargo()` | Função RPC | Verificação de cargo nas políticas RLS |

---

## 9. Considerações para Mudanças Futuras

### 9.1 Separação de Responsabilidades
- Os tipos TypeScript (`Visita`, `Agendamento`, `AgendamentoDia`, etc.) estão definidos dentro dos hooks, não em um arquivo de tipos centralizado. Ao adicionar features, mover para `src/types/agenda.ts`.

### 9.2 Performance ao Escalar
- `useGestaoAgenda` faz queries bulk de toda a equipe. Com > 50 vendedores, considerar paginação ou Views materializadas no banco.
- O JOIN manual em memória em `fetchWeek` é adequado para o volume atual (~20 agendamentos/semana por vendedor), mas pode ser substituído por uma RPC se performance degradar.

### 9.3 Offline-First
- O módulo já tem uma estratégia de cache (localStorage, 30min TTL). Para suporte offline mais robusto, considerar Service Worker + IndexedDB (substituindo localStorage).

### 9.4 Auditoria de Visitas
- Os campos `rfm_*_snapshot` em `visitas` formam a base de uma trilha de auditoria. Ao evoluir, considerar uma tabela `visitas_audit` dedicada.

---

*Documentado por @architect (Aria) | Synkra AIOS v1.0.0*
*Baseado em mapeamento de @analyst (Atlas) — 2026-05-28*
