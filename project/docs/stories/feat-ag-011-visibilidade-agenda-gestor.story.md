# Story FEAT-AG-011 — Popup Lembrete do Dia + Badges RFM + Clientes Sem Rota

## Status
Draft

## Executor Assignment
```
executor: "@dev"
quality_gate: "@qa"
quality_gate_tools: [typecheck, lint, browser-test]
```

## Story
**As a** vendedor / gestor do Copiloto,  
**I want** ver um popup com meus agendamentos de hoje ao abrir o app (vendedor) e visualizar badges de perfil RFM por cliente e uma seção de clientes sem rota no DashboardRotas (gestor),  
**so that** o vendedor não perca visitas agendadas e o gestor identifique clientes órfãos de rota rapidamente.

---

## Acceptance Criteria

### AC-1: Popup Lembrete do Dia (Vendedor)
1. Ao carregar `Dashboard.tsx`, se existirem agendamentos com `status = 'pendente'` e `data_agendada = hoje` para o vendedor logado, um popup bottom-sheet é exibido.
2. O popup lista cada agendamento com: nome do cliente (`nome_fantasia`), código do cliente, valor previsto (se houver) e horário (se houver).
3. O popup tem um botão "Ver Agenda" que navega para `/agenda` e fecha o popup.
4. O popup tem um botão "Fechar" (X) que descarta sem navegar.
5. Se não houver agendamentos para hoje, o popup **não** aparece.
6. O popup aparece toda vez que a página é carregada (sem flag de "já viu hoje").

### AC-2: Badges Ouro/Prata/Bronze no Drill-Down de Clientes (Gestor)
7. Em `DashboardRotas.tsx`, a query de clientes por cidade passa a incluir `perfil` de `analise_rfm`.
8. A interface `ClienteRotaData` inclui `perfil?: string`.
9. Na linha de cada cliente, antes do nome, exibe um badge colorido:
   - `Ouro` → fundo amarelo-dourado (`bg-yellow-100 text-yellow-700 border-yellow-300`)
   - `Prata` → fundo cinza prata (`bg-gray-100 text-gray-600 border-gray-300`)
   - `Bronze` → fundo laranja-bronze (`bg-orange-100 text-orange-700 border-orange-300`)
   - `Sem Perfil` ou `null` → nenhum badge
10. O badge não quebra o layout da coluna "Cliente" (truncate mantido).

### AC-3: Seção "Clientes Sem Rota" em DashboardRotas (Gestor)
11. Abaixo do painel de rotas existente, existe uma seção expansível "Clientes Sem Rota".
12. A seção carrega clientes em `tabela_clientes` onde:
    - `cod_vendedor` é um dos vendedores filtrados (ou todos se nenhum filtro ativo)
    - `situacao NOT IN ('I', 'C')` — exclui inativos e cancelados
    - `codigo_ibge_cidade NOT IN` qualquer `codigo_ibge_cidade` em `rotas_estado` para o `cod_vendedor` correspondente
13. A lista exibe: `nome_fantasia`, `cidade`, vendedor (`vendedor_apelido`), `situacao`.
14. A seção mostra o total de clientes sem rota no header expansível.
15. Se não houver clientes sem rota para os vendedores filtrados, exibe mensagem "Nenhum cliente sem rota encontrado".

---

## 🤖 CodeRabbit Integration

### Story Type Analysis
- **Primary Type**: Frontend — Component Enhancement + New UI Component
- **Secondary Type(s)**: UX Improvement (visibilidade de agenda e cobertura)
- **Complexity**: Medium (3 itens independentes, nenhum requer nova tabela)

### Specialized Agent Assignment
**Primary Agents:**
- @dev: Implementa os 3 itens em `Dashboard.tsx` e `DashboardRotas.tsx`

**Supporting Agents:**
- @qa: Valida layout no browser (popup, badges, seção sem rota)

### Quality Gate Tasks
- [ ] Pre-execution: Confirmar que `analise_rfm.perfil` retorna strings 'Ouro', 'Prata', 'Bronze', 'Sem Perfil'
- [ ] Post-execution: typecheck sem erros
- [ ] Post-execution: lint sem warnings
- [ ] Post-execution: Testar popup com agendamentos existentes para hoje
- [ ] Post-execution: Testar ausência de popup quando não há agendamentos
- [ ] Post-execution: Confirmar badges visíveis no drill-down rota→cidade→cliente
- [ ] Post-execution: Confirmar seção "Sem Rota" carrega e exibe corretamente

---

## Tasks / Subtasks

- [ ] **Task 1 — Pre-check: Validar dados** (AC: 1, 7, 11)
  - [ ] 1.1 Confirmar valores distintos de `analise_rfm.perfil`:
    ```sql
    SELECT DISTINCT perfil FROM analise_rfm ORDER BY 1;
    ```
    **Resultado esperado:** valores incluindo 'Ouro', 'Prata', 'Bronze', 'Sem Perfil' (ou null)

  - [ ] 1.2 Confirmar query de clientes sem rota:
    ```sql
    -- Exemplo para cod_vendedor = X
    SELECT tc.codigo_cliente, tc.nome_fantasia, tc.cidade, tc.situacao
    FROM tabela_clientes tc
    WHERE tc.situacao NOT IN ('I', 'C')
      AND tc.codigo_ibge_cidade IS NOT NULL
      AND tc.codigo_ibge_cidade NOT IN (
        SELECT re.codigo_ibge_cidade
        FROM rotas_estado re
        WHERE re.cod_vendedor = tc.cod_vendedor
      )
    LIMIT 10;
    ```

- [ ] **Task 2 — Popup Lembrete do Dia** (AC: 1–6)
  - [ ] 2.1 Adicionar interface `AgendamentoLembrete` em `Dashboard.tsx`:
    ```typescript
    interface AgendamentoLembrete {
      id: string
      codigo_cliente: number
      nome_fantasia: string
      data_agendada: string
      valor_previsto: number | null
    }
    ```

  - [ ] 2.2 Adicionar estados:
    ```typescript
    const [lembreteOpen, setLembreteOpen] = useState(false)
    const [agendamentosHoje, setAgendamentosHoje] = useState<AgendamentoLembrete[]>([])
    const [loadingLembrete, setLoadingLembrete] = useState(false)
    ```

  - [ ] 2.3 Adicionar `useEffect` que carrega agendamentos ao montar (somente quando `user?.id` disponível):
    ```typescript
    useEffect(() => {
      if (!user?.id) return
      const hoje = new Date().toISOString().split('T')[0]
      setLoadingLembrete(true)
      supabase
        .from('agendamentos')
        .select(`
          id,
          codigo_cliente,
          data_agendada,
          valor_previsto,
          tabela_clientes!agendamentos_codigo_cliente_fkey (
            nome_fantasia
          )
        `)
        .eq('vendedor_id', user.id)
        .eq('status', 'pendente')
        .eq('data_agendada', hoje)
        .order('data_agendada', { ascending: true })
        .then(({ data }) => {
          const lista: AgendamentoLembrete[] = (data || []).map((a: any) => ({
            id: a.id,
            codigo_cliente: a.codigo_cliente,
            nome_fantasia: Array.isArray(a.tabela_clientes)
              ? a.tabela_clientes[0]?.nome_fantasia ?? `Cliente ${a.codigo_cliente}`
              : a.tabela_clientes?.nome_fantasia ?? `Cliente ${a.codigo_cliente}`,
            data_agendada: a.data_agendada,
            valor_previsto: a.valor_previsto,
          }))
          setAgendamentosHoje(lista)
          if (lista.length > 0) setLembreteOpen(true)
        })
        .catch(() => {})
        .finally(() => setLoadingLembrete(false))
    }, [user?.id])
    ```

  - [ ] 2.4 Adicionar componente `PopupLembrete` inline no JSX de `Dashboard.tsx`:
    ```tsx
    {lembreteOpen && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
        <div className="w-full max-w-lg bg-white rounded-t-2xl shadow-xl p-4 pb-6"
             style={{ animation: 'slideUp 0.25s ease-out' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-gray-800">Agenda de Hoje</h3>
              <p className="text-xs text-gray-500">{agendamentosHoje.length} agendamento{agendamentosHoje.length !== 1 ? 's' : ''} pendente{agendamentosHoje.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setLembreteOpen(false)}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Lista */}
          <ul className="space-y-2 max-h-56 overflow-y-auto">
            {agendamentosHoje.map(ag => (
              <li key={ag.id} className="flex items-center justify-between rounded-lg bg-sky-50 border border-sky-100 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800 truncate max-w-[220px]">{ag.nome_fantasia}</p>
                  <p className="text-xs text-gray-500">Cód. {ag.codigo_cliente}</p>
                </div>
                {ag.valor_previsto != null && ag.valor_previsto > 0 && (
                  <span className="text-xs font-semibold text-sky-700 ml-2 flex-shrink-0">
                    {formatCurrency(ag.valor_previsto, true)}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {/* Ações */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => { setLembreteOpen(false); navigate('/agenda') }}
              className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
            >
              Ver Agenda
            </button>
            <button
              onClick={() => setLembreteOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    )}
    ```

  - [ ] 2.5 Adicionar import `X` do `lucide-react` e `supabase` do `../../lib/supabase` (se ainda não importados)
  - [ ] 2.6 Adicionar keyframe `slideUp` no `src/index.css` (ou equivalente global):
    ```css
    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    ```

- [ ] **Task 3 — Badges RFM no Drill-Down de Clientes** (AC: 7–10)
  - [ ] 3.1 Atualizar `ClienteRotaData` em `DashboardRotas.tsx`:
    ```typescript
    interface ClienteRotaData {
      codigo_cliente: number
      nome_fantasia: string
      oportunidade: number
      meta: number
      vendas: number
      percentual: number
      dias_sem_venda: number
      dias_atraso: number
      perfil: string | null     // NOVO
    }
    ```

  - [ ] 3.2 Atualizar select em `carregarClientesCidade` — adicionar `perfil` ao fetch do `analise_rfm`:
    ```typescript
    analise_rfm (
      previsao_pedido,
      meta_ano_atual,
      valor_ano_atual,
      dias_sem_comprar,
      perfil           // NOVO
    )
    ```

  - [ ] 3.3 Atualizar mapeamento do array `.map()` — adicionar campo `perfil`:
    ```typescript
    perfil: rfm?.perfil ?? null,
    ```

  - [ ] 3.4 Adicionar helper de badge logo antes do `return` do componente (ou como função pura fora do componente):
    ```typescript
    const perfilBadge = (perfil: string | null) => {
      if (!perfil || perfil === 'Sem Perfil') return null
      const styles: Record<string, string> = {
        Ouro:   'bg-yellow-50 text-yellow-700 border border-yellow-300',
        Prata:  'bg-gray-100 text-gray-600 border border-gray-300',
        Bronze: 'bg-orange-50 text-orange-700 border border-orange-300',
      }
      return (
        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${styles[perfil] ?? ''}`}>
          {perfil}
        </span>
      )
    }
    ```

  - [ ] 3.5 Atualizar célula "Cliente" na tabela de clientes da cidade — envolver conteúdo com badge:
    ```tsx
    <td className="px-4 py-1.5 text-gray-800 font-medium truncate max-w-[200px]">
      <div className="flex items-center gap-1.5">
        {cliente.dias_atraso > 0 && (
          <TriangleAlert className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        )}
        {perfilBadge(cliente.perfil)}
        <span className="truncate">{cliente.nome_fantasia}</span>
      </div>
    </td>
    ```

- [ ] **Task 4 — Seção "Clientes Sem Rota"** (AC: 11–15)
  - [ ] 4.1 Adicionar interface `ClienteSemRota`:
    ```typescript
    interface ClienteSemRota {
      codigo_cliente: number
      nome_fantasia: string
      cidade: string
      estado: string
      situacao: string
      vendedor_apelido: string
      cod_vendedor: number
    }
    ```

  - [ ] 4.2 Adicionar estados:
    ```typescript
    const [clientesSemRota, setClientesSemRota] = useState<ClienteSemRota[]>([])
    const [loadingClientesSemRota, setLoadingClientesSemRota] = useState(false)
    const [semRotaExpanded, setSemRotaExpanded] = useState(false)
    const [semRotaCarregado, setSemRotaCarregado] = useState(false)
    ```

  - [ ] 4.3 Adicionar função `carregarClientesSemRota()` — lazy load acionado ao expandir:
    ```typescript
    const carregarClientesSemRota = async () => {
      if (semRotaCarregado) return
      // Guard: aguardar rotasData estar carregado (evita resultado vazio em cargas rápidas)
      if (rotasData.length === 0) return
      setLoadingClientesSemRota(true)
      try {
        // Coletar cod_vendedores dos vendedores filtrados (ou todos)
        const codVendedoresFiltrados = vendedoresSelecionadosRotas.length > 0
          ? rotasData
              .filter(r => vendedoresSelecionadosRotas.includes(r.vendedor_uuid))
              .map(r => r.cod_vendedor)
              .filter((v, i, a) => a.indexOf(v) === i)
          : rotasData
              .map(r => r.cod_vendedor)
              .filter((v, i, a) => a.indexOf(v) === i)

        if (codVendedoresFiltrados.length === 0) {
          setClientesSemRota([])
          return
        }

        // Para cada cod_vendedor, buscar cidades cobertas por rotas_estado
        const { data: rotasCidades } = await supabase
          .from('rotas_estado')
          .select('cod_vendedor, codigo_ibge_cidade')
          .in('cod_vendedor', codVendedoresFiltrados)

        const cidadesPorVendedor = new Map<number, Set<string>>()
        ;(rotasCidades || []).forEach(rc => {
          if (!cidadesPorVendedor.has(rc.cod_vendedor)) {
            cidadesPorVendedor.set(rc.cod_vendedor, new Set())
          }
          cidadesPorVendedor.get(rc.cod_vendedor)!.add(rc.codigo_ibge_cidade)
        })

        // Buscar clientes sem cobertura por rota
        const { data: clientesData, error } = await supabase
          .from('tabela_clientes')
          .select('codigo_cliente, nome_fantasia, cidade, estado, situacao, cod_vendedor')
          .in('cod_vendedor', codVendedoresFiltrados)
          .not('situacao', 'in', '("I","C")')
          .not('codigo_ibge_cidade', 'is', null)

        if (error) throw error

        // Filtrar client-side os que não têm a cidade coberta por rota
        const vendedorApelidoMap = new Map(
          rotasData.map(r => [r.cod_vendedor, r.vendedor_apelido])
        )

        const semRota = (clientesData || []).filter((c: any) => {
          const cidades = cidadesPorVendedor.get(c.cod_vendedor)
          return !cidades || !cidades.has(c.codigo_ibge_cidade ?? '')
        })
        .map((c: any): ClienteSemRota => ({
          codigo_cliente: c.codigo_cliente,
          nome_fantasia: c.nome_fantasia || `Cliente ${c.codigo_cliente}`,
          cidade: c.cidade || '—',
          estado: c.estado || '—',
          situacao: c.situacao || '—',
          cod_vendedor: c.cod_vendedor,
          vendedor_apelido: vendedorApelidoMap.get(c.cod_vendedor) || `Vendedor ${c.cod_vendedor}`,
        }))
        .sort((a, b) => a.cidade.localeCompare(b.cidade))

        setClientesSemRota(semRota)
        setSemRotaCarregado(true)
      } catch (err) {
        console.error('Erro ao carregar clientes sem rota:', err)
      } finally {
        setLoadingClientesSemRota(false)
      }
    }
    ```

  - [ ] 4.4 Adicionar JSX da seção "Clientes Sem Rota" após o painel de rotas (antes do `</div>` de fechamento da página):
    ```tsx
    {/* ─── Seção: Clientes Sem Rota ─────────────────────────────────── */}
    <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => {
          setSemRotaExpanded(prev => !prev)
          if (!semRotaExpanded) carregarClientesSemRota()
        }}
      >
        <div>
          <h3 className="text-sm font-bold text-gray-800">Clientes Sem Rota</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Clientes ativos cuja cidade não está mapeada em nenhuma rota do vendedor
          </p>
        </div>
        <div className="flex items-center gap-2">
          {semRotaCarregado && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              clientesSemRota.length > 0
                ? 'bg-orange-100 text-orange-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {clientesSemRota.length}
            </span>
          )}
          {semRotaExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </div>
      </button>

      {semRotaExpanded && (
        <div className="border-t border-gray-100">
          {loadingClientesSemRota ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : clientesSemRota.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-6">
              Nenhum cliente sem rota encontrado
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-100">
                    <th className="text-left px-4 py-2 font-semibold">Cliente</th>
                    <th className="text-left px-4 py-2 font-semibold">Cidade / UF</th>
                    <th className="text-left px-4 py-2 font-semibold">Vendedor</th>
                    <th className="text-center px-4 py-2 font-semibold">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesSemRota.map((c, idx) => (
                    <tr key={c.codigo_cliente} className={`border-b border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-4 py-2 text-gray-800 font-medium">
                        <span className="truncate block max-w-[180px]">{c.nome_fantasia}</span>
                        <span className="text-gray-400 text-[10px]">Cód. {c.codigo_cliente}</span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{c.cidade} — {c.estado}</td>
                      <td className="px-4 py-2 text-gray-600">{c.vendedor_apelido}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          c.situacao === 'P' ? 'bg-red-100 text-red-600' :
                          c.situacao === 'B' ? 'bg-orange-100 text-orange-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {c.situacao}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
    ```

- [ ] **Task 5 — Typecheck e Lint** (AC: todos)
  - [ ] 5.1 `npm run typecheck` — zero erros
  - [ ] 5.2 `npm run lint` — zero warnings

---

## Dev Notes

### Popup Lembrete — Comportamento Intencional
O popup aparece **toda vez que a página carrega** e há agendamentos pendentes para hoje. Isso é intencional — o vendedor pode ter fechado o app e reaberto; o lembrete deve repetir. Não há persistência de "já descartado hoje" em localStorage.

### Popup — FK para nome do cliente
`agendamentos` possui `codigo_cliente INT`. A relação com `tabela_clientes` é por `codigo_cliente`, não UUID. O join no Supabase usa `agendamentos_codigo_cliente_fkey` (verificar nome correto da FK no schema). Se a FK não existir com esse nome, fallback: fazer dois queries (buscar agendamentos, depois buscar nomes em batch por `codigo_cliente`).

```sql
-- Verificar nome da FK antes de implementar:
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'agendamentos' AND constraint_type = 'FOREIGN KEY';
```

### Badges — Filtro de situação no drill-down
O `carregarClientesCidade` já filtra `.not('situacao', 'in', '("I","B")')`. Clientes `P` (inadimplente) e `V` (vista liberado) aparecem na lista — os badges RFM deles serão exibidos normalmente.

### Clientes Sem Rota — Estratégia de Query
A busca é feita em duas etapas (client-side filter) porque o PostgREST não suporta anti-join eficiente via API. A query busca:
1. Todas cidades cobertas por `rotas_estado` para os cod_vendedores selecionados.
2. Todos clientes ativos desses vendedores.
3. Filtra client-side os clientes cuja `codigo_ibge_cidade` não está no conjunto da etapa 1.

Isso é aceitável porque o volume de clientes por vendedor é controlado (tipicamente < 500 por vendedor).

### Tabelas Relacionadas
- `agendamentos` — popup lembrete
- `tabela_clientes` — nome para popup + lista sem rota
- `analise_rfm` — campo `perfil` para badges
- `rotas_estado` — referência de cidades cobertas por rota
- `vendedor_rotas` — vínculo vendedor↔rota (já carregado em `rotasData`)

---

## Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-05-28 | 1.0 | Story criada — visibilidade de agenda para vendedor + badges RFM + clientes sem rota para gestor | @sm (River) |
| 2026-05-28 | 1.1 | Revisão @architect: `animate-slide-up` → keyframe CSS inline; guard `rotasData.length === 0` adicionado em `carregarClientesSemRota`; FK `agendamentos_codigo_cliente_fkey` confirmada no banco | @architect (Aria) |

---

## Dev Agent Record
*(Preenchido por @dev durante implementação)*

### Agent Model Used
*—*

### Completion Notes List
*—*

### File List
*—*
