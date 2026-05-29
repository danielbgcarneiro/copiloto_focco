# Story FEAT-AG-010 — Frontend: Fluxo de Planejamento de Rota em Lote (H7+H6)

## Status
Draft

## Executor Assignment
```
executor: "@dev"
quality_gate: "@qa"
quality_gate_tools: [browser-test, typescript-check, mobile-simulation]
depends_on: ["FEAT-AG-009"]
```

## Story
**As a** vendedor do Copiloto,  
**I want** planejar toda uma rota de uma vez, organizando os clientes cidade por cidade em dias específicos, com sugestão automática de dias extras quando o período selecionado não é suficiente,  
**so that** eu consiga preparar minha semana (ou mais) de visitas em poucos minutos, com muito menos cliques do que agendar um a um.

---

## Acceptance Criteria

1. O FAB `+` da tela Agenda exibe segunda opção "Planejar Rota" ao ser tocado
2. O fluxo inicia com seleção de rota e período (data início + data fim)
3. O vendedor percorre as cidades da rota uma a uma, podendo: selecionar o dia para aquela cidade, desmarcar clientes individuais, pular a cidade inteira
4. Clientes adimplentes (situacao A, E, S, V) entram automaticamente; P e B têm toggle manual para inclusão
5. Ao final da paginação, tela de overflow mostra clientes ainda sem data e sugere extensão do período
6. O vendedor pode aceitar a sugestão, escolher outras datas, ou salvar fila para retomar depois
7. Ao confirmar, os agendamentos são criados em lote com `valor_previsto` = `analise_rfm.previsao_pedido`
8. Dias com plano confirmado exibem indicador visual de rota no `SemanaGrid` existente
9. Plano pendente (com clientes na fila) exibe badge "X pendentes" no calendário
10. Clientes que já têm agendamento pendente na semana selecionada são automaticamente pulados com aviso
11. TypeScript sem erros; fluxo completo testado no browser mobile (viewport 390px)

---

## 🤖 CodeRabbit Integration

### Story Type Analysis
- **Primary Type**: Frontend — Feature, Mobile UX
- **Secondary Type(s)**: Integration (banco → agendamentos em lote)
- **Complexity**: High (multi-step flow, novo hook, batch creation, integração com SemanaGrid)

### Specialized Agent Assignment
**Primary Agents:**
- @dev: Implementa hook, componentes e integração
- @ux-design-expert: Valida UX mobile do fluxo (paginação, overflow, feedback visual)

**Supporting Agents:**
- @qa: Testa fluxo completo no browser com viewport mobile

### Quality Gate Tasks
- [ ] Pre-execution: Confirmar FEAT-AG-009 aplicado (tabelas existem)
- [ ] Pre-execution: Mapear todos os pontos de toque com `useAgenda` (não quebrar hooks existentes)
- [ ] Post-execution: Testar criação de 10+ agendamentos em lote
- [ ] Post-execution: Verificar que agendamentos aparecem corretamente no SemanaGrid após criação
- [ ] Post-execution: Simular overflow — período menor que número de cidades

### Self-Healing Configuration
- **Primary Agent**: @dev (check mode)
- **Severity Filter**: HIGH+
- **Predicted Behavior**: Erro no batch INSERT → falhas individuais logadas, agendamentos bem-sucedidos persistem (`Promise.allSettled` — tolerante a falhas parciais, sem rollback global)

### CodeRabbit Focus Areas
**Primary Focus:**
- Confirmar que falhas parciais no batch são exibidas ao usuário (ex.: "28 de 31 agendamentos criados — 3 falharam")
- Confirmar que o indicador visual no SemanaGrid não quebra a renderização existente

**Secondary Focus:**
- Verificar acessibilidade do fluxo multi-step em viewport 390px
- Confirmar que `useAgenda.invalidateWeek` é chamado após criação em lote

---

## Tasks / Subtasks

- [ ] **Task 1 — Hook `usePlanejamentoRota`** (AC: 2, 3, 4, 7, 10)

  Criar `src/hooks/usePlanejamentoRota.ts`:

  ```typescript
  // Interfaces principais
  export interface PlanoRota {
    id: string
    vendedor_id: string
    rota: string
    data_inicio: string
    data_fim: string | null
    status: 'rascunho' | 'confirmado' | 'em_andamento' | 'concluido'
  }

  export interface PlanoCliente {
    id: string
    planejamento_id: string
    codigo_cliente: number
    cidade: string | null
    data_prevista: string | null   // null = na fila
    status: 'pendente' | 'agendado' | 'pulado'
    agendamento_id: string | null
  }

  export interface ClientePlano {
    codigo_cliente: number
    razao_social: string
    nome_fantasia: string | null
    situacao: string             // A, E, S, V, P, B
    previsao_pedido: number | null
    perfil_rfm: string | null
    dsv: number | null
    cidade: string | null
    jaAgendado: boolean          // tem agendamento pendente na semana
  }

  export interface CidadePlano {
    cidade: string
    clientes: ClientePlano[]
  }
  ```

  **Funções do hook:**
  - `carregarRotas()` — busca `vendedor_rotas` ativas do vendedor logado
  - `carregarClientesPorCidade(rota)` — busca clientes da rota via `rotas_estado` + `tabela_clientes` + `analise_rfm`, agrupados por cidade, excluindo I e C, marcando os já agendados na semana
  - `criarPlano(rota, dataInicio, dataFim?)` — INSERT em `planejamentos_rota` com status `'rascunho'`, retorna `PlanoRota`
  - `adicionarClientes(planejamentoId, clientes[])` — INSERT em lote em `planejamento_clientes`
  - `atribuirDataCidade(planejamentoId, cidade, data)` — UPDATE `planejamento_clientes` SET `data_prevista = data` WHERE `cidade = cidade AND status = 'pendente'`
  - `confirmarPlano(planejamentoId)` — transação: para cada `planejamento_clientes` com `data_prevista != NULL`, cria `agendamento` e atualiza `agendamento_id` + `status = 'agendado'`; atualiza `planejamentos_rota.status = 'confirmado'`
  - `buscarPlanoAtivo(vendedorId)` — retorna planos com status != `'concluido'` para exibir badge pendentes

  **Regra de adimplência:**
  ```typescript
  const SITUACAO_AUTO = ['A', 'E', 'S', 'V']
  const SITUACAO_MANUAL = ['P', 'B']
  const SITUACAO_EXCLUIDA = ['I', 'C']
  ```

- [ ] **Task 2 — Componente `PlanejarRotaSheet`** (AC: 1, 2, 11)

  Criar `src/components/molecules/PlanejarRotaSheet.tsx`.

  Este componente orquestra os 3 steps do fluxo. Não é um sheet único — usa o padrão de "step atual" com animação de transição entre telas.

  ```
  Step 0: RotaSelector     — selecionar rota + período
  Step 1: CidadePaginator  — percorrer cidade por cidade
  Step 2: OverflowScreen   — clientes sem data + sugestão
  Step 3: ConfirmScreen    — resumo final antes de criar
  ```

  **Integração com Agenda.tsx:**
  - Adicionar state `showPlanejarRota` e componente no JSX
  - Expandir FAB existente com segunda opção (ícone `Route` do lucide)
  - Ao confirmar o plano: chamar `invalidateWeek(selectedDate)` de `useAgenda` para forçar re-fetch

- [ ] **Task 3 — Step 0: Seleção de Rota e Período** (AC: 2)

  ```
  ┌──────────────────────────────────┐
  │  Planejar Rota              ✕   │
  │                                  │
  │  Rota                            │
  │  [ Selecionar rota...       ▼ ] │
  │                                  │
  │  Período                         │
  │  [ 25/05/2026 ] até [ 29/05 ]   │
  │                                  │
  │  47 clientes adimplentes         │
  │  em 8 cidades                    │
  │                                  │
  │  [ Iniciar planejamento → ]      │
  └──────────────────────────────────┘
  ```

  - Dropdown de rotas do vendedor
  - Date range picker (dois inputs de data)
  - Ao selecionar rota: mostrar contagem de clientes adimplentes (query imediata)
  - Botão desabilitado até rota + data início serem selecionados

- [ ] **Task 4 — Step 1: Paginação por Cidade** (AC: 3, 4, 10)

  ```
  ┌──────────────────────────────────┐
  │ ← Rota A  ●●○○○○○○  3 de 8      │
  │                                  │
  │  Curitiba — 12 clientes          │
  │                                  │
  │  Dia desta cidade                │
  │  [Seg 25][Ter 26][Qua 27]        │
  │  [Qui 28][Sex 29][+ Outro]       │
  │                                  │
  │  ✓ Ótica Central    DSV 45d     │
  │  ✓ Ótica Paulista   DSV 38d     │
  │  ✓ Ótica Norte      DSV 72d ⚠️  │
  │  ─ ─ ─ ─ ─ ─ Inadimplentes ─ ─│
  │  ○ Ótica Sul   P  (toque p/incl)│
  │                                  │
  │  [Pular cidade] [Próxima →]     │
  └──────────────────────────────────┘
  ```

  **Regras:**
  - Dias exibidos são os do período selecionado no Step 0
  - "Outro" abre date-picker livre para datas fora do período
  - Selecionar o dia é obrigatório para avançar (ou "Pular cidade")
  - "Pular cidade" → todos os clientes da cidade entram na fila de pendentes
  - Adimplentes: checkbox marcado por padrão (pode desmarcar)
  - Inadimplentes: toggle desmarcado por padrão, visível mas separado por divisor
  - Clientes já agendados na semana: exibidos com badge "Já agendado" e excluídos do batch (AC 10)
  - Progress bar superior: bolinhas preenchidas = cidades concluídas

- [ ] **Task 5 — Step 2: Tela de Overflow** (AC: 5, 6)

  Exibida se qualquer cidade foi pulada OU se algum cliente ficou sem `data_prevista`.

  ```
  ┌──────────────────────────────────┐
  │  Resumo do Planejamento          │
  │                                  │
  │  ✅ 31 clientes planejados       │
  │     distribuídos em 5 dias       │
  │                                  │
  │  ⏳ 16 clientes na fila          │
  │  📍 Maringá          7 clientes  │
  │  📍 Apucarana        5 clientes  │
  │  📍 Cascavel         4 clientes  │
  │                                  │
  │  ┌────────────────────────────┐  │
  │  │ 💡 Sugestão de extensão    │  │
  │  │ Adicionar 01/06 a 03/06   │  │
  │  │ para planejar o restante  │  │
  │  │  [Aceitar] [Outra data]   │  │
  │  └────────────────────────────┘  │
  │                                  │
  │  [Salvar fila para depois]       │
  │  [Confirmar 31 agendamentos ›]  │
  └──────────────────────────────────┘
  ```

  **Cálculo da sugestão de extensão:**
  ```typescript
  // Dias necessários = cidades pendentes (1 cidade = 1 dia como base)
  const cidadesPendentes = [...new Set(pendentes.map(c => c.cidade))].length
  const sugestaoInicio = nextBusinessDay(dataFimPlano)
  const sugestaoFim = addBusinessDays(sugestaoInicio, cidadesPendentes - 1)
  ```

  - "Aceitar": volta ao Step 1 com as cidades pendentes e o novo período
  - "Outra data": date range picker para o vendedor definir manualmente, depois volta ao Step 1
  - "Salvar fila para depois": persiste o plano com `status = 'confirmado'` mas clientes pendentes com `data_prevista = NULL`

- [ ] **Task 6 — Step 3: Confirmação Final** (AC: 7)

  ```
  ┌──────────────────────────────────┐
  │  Confirmar Planejamento          │
  │                                  │
  │  Rota A — 25 a 29/05            │
  │                                  │
  │  Seg 25/05  8 clientes           │
  │  Ter 26/05  6 clientes           │
  │  Qua 27/05  7 clientes           │
  │  Qui 28/05  5 clientes           │
  │  Sex 29/05  5 clientes           │
  │                                  │
  │  Total: 31 agendamentos          │
  │  valor previsto: R$ 48.200       │
  │                                  │
  │  [← Voltar]  [Criar agendamentos]│
  └──────────────────────────────────┘
  ```

  - Lista por dia com contagem de clientes
  - Soma total de `previsao_pedido` dos clientes incluídos
  - Ao confirmar: chama `confirmarPlano()` do hook — batch INSERT em `agendamentos`
  - Loading state durante a criação (pode ser 30+ INSERTs)
  - Sucesso → toast "31 agendamentos criados" + fecha sheet + `invalidateWeek`

- [ ] **Task 7 — Indicador Visual no SemanaGrid** (AC: 8, 9)

  Em `src/components/molecules/SemanaGrid.tsx`, adicionar suporte a prop opcional `planosAtivos`:

  ```typescript
  interface PlanoIndicador {
    data: string    // YYYY-MM-DD
    rota: string
    pendentes: number
  }
  ```

  Exibir abaixo do número de agendamentos do dia uma pílula colorida com o nome da rota:
  ```
  Seg 25
  8 ags
  [Rota A]   ← pílula azul
  ```
  Se `pendentes > 0`: pílula com badge "⏳ X".

- [ ] **Task 8 — Validação TypeScript e Testes Browser** (AC: 11)
  - [ ] 8.1 `npx tsc --noEmit` sem erros
  - [ ] 8.2 Testar fluxo completo no browser: 390px viewport (Chrome DevTools)
  - [ ] 8.3 Criar plano com 3 cidades → confirmar → verificar agendamentos criados na Agenda
  - [ ] 8.4 Testar overflow: selecionar período de 2 dias com 4 cidades → confirmar sugestão
  - [ ] 8.5 Verificar indicador visual no SemanaGrid após criar plano

---

## Dev Notes

### Arquitetura de Componentes

```
Agenda.tsx
├── FAB expandido [+] → [Agendar Cliente] [Planejar Rota]
└── PlanejarRotaSheet (novo)
    ├── Step 0: RotaSelectorStep
    ├── Step 1: CidadePaginatorStep (mapeado sobre array de cidades)
    ├── Step 2: OverflowStep
    └── Step 3: ConfirmStep

SemanaGrid.tsx (existente)
└── PlanoIndicador (novo — prop opcional, zero breaking change)
```

### Query de Clientes por Rota

```typescript
// No hook usePlanejamentoRota.carregarClientesPorCidade(rota, vendedorId)
// 1. Buscar cod_vendedor do profile PRIMEIRO (necessário para filtrar rotas_estado)
const { data: profile } = await supabase
  .from('profiles')
  .select('cod_vendedor')
  .eq('id', vendedorId)
  .single()

// 2. Buscar cidades da rota DO VENDEDOR ESPECÍFICO (filtro cod_vendedor obrigatório —
//    nomes de rota podem ser reutilizados por vendedores distintos)
const { data: rotaCidades } = await supabase
  .from('rotas_estado')
  .select('cidade, codigo_ibge_cidade')
  .eq('rota', rota)
  .eq('cod_vendedor', profile.cod_vendedor)

// 3. Buscar clientes nessas cidades
const { data: clientes } = await supabase
  .from('tabela_clientes')
  .select(`
    codigo_cliente, razao_social, nome_fantasia, cidade, situacao,
    analise_rfm!left(previsao_pedido, perfil, dias_sem_comprar)
  `)
  .eq('cod_vendedor', profile.cod_vendedor)
  .in('codigo_ibge_cidade', cidades.map(c => c.codigo_ibge_cidade))
  .not('situacao', 'in', '("I","C")')

// 4. Verificar quais já têm agendamento pendente na semana
// (excluir automaticamente do batch — AC 10)
```

### Batch INSERT de Agendamentos

O `confirmarPlano()` deve criar todos os agendamentos em sequência. Se qualquer INSERT falhar, o `planejamentos_rota.status` não deve ser atualizado — usar Promise.allSettled e reportar falhas individuais sem abortar o plano inteiro:

```typescript
const resultados = await Promise.allSettled(
  clientes.map(c =>
    supabase.from('agendamentos').insert({
      vendedor_id: vendedorId,
      codigo_cliente: c.codigo_cliente,
      data_agendada: c.data_prevista,
      valor_previsto: c.previsao_pedido ?? null,
      status: 'pendente',
    }).select('id').single()
  )
)
// Para os fulfilled: atualizar planejamento_clientes.agendamento_id + status='agendado'
// Para os rejected: manter status='pendente', logar erro
```

### Cálculo de Dias Úteis para Sugestão de Overflow

```typescript
// Reutilizar funções de agendaUtils.ts (já importadas em outros hooks)
import { diasUteisRestantesMes } from '../utils/agendaUtils'
// Ou implementar nextBusinessDay simples inline
```

### Pré-requisitos
- FEAT-AG-009 aplicado (tabelas existem)
- `get_user_cargo()` disponível no banco

### Arquivos a Criar
- `src/hooks/usePlanejamentoRota.ts`
- `src/components/molecules/PlanejarRotaSheet.tsx`

### Arquivos a Modificar
- `src/components/pages/Agenda.tsx` — FAB expandido + integração do sheet
- `src/components/molecules/SemanaGrid.tsx` — prop `planosAtivos` opcional

---

## Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-05-28 | 1.0 | Story criada — Fluxo H7+H6 frontend do planejamento de rota em lote | @sm (River) |
| 2026-05-28 | 1.1 | Revisão @architect: filtro `cod_vendedor` em `rotas_estado` adicionado; wording de `Promise.allSettled` corrigido (sem rollback) | @architect (Aria) |

---

## Dev Agent Record
*(Preenchido por @dev durante implementação)*

### Agent Model Used
*—*

### Completion Notes List
*—*

### File List
*—*
