# Documentação: Sistema de Status de Inadimplência

## Visão Geral

Foi implementado um sistema visual de indicadores de status de inadimplência na página de Detalhes do Cliente (`DetalhesCliente.tsx`). Este sistema exibe um badge colorido ao lado do perfil do cliente, indicando se o cliente está em dia ou inadimplente.

---

## 📊 Arquitetura

### Componentes Envolvidos

#### 1. **DetalhesCliente.tsx** (Componente Principal)
- Localização: `src/components/pages/DetalhesCliente.tsx`
- Responsabilidades:
  - Renderizar página de detalhes do cliente
  - Buscar dados de inadimplência via `getClienteInadimplenteDetalhes()`
  - Exibir badge de status usando `getStatusInadimplenciaColors()`
  - Mostrar seção completa de "Títulos Vencidos"

#### 2. **cliente.ts** (Query Principal)
- Localização: `src/lib/queries/cliente.ts`
- Tipo: `ClienteDetalhes`
- Campo novo: `status_financeiro?: string`
- Descrição: Interface estendida para suportar informações de inadimplência futura

#### 3. **inadimplentes.ts** (Query de Inadimplência)
- Localização: `src/lib/queries/inadimplentes.ts`
- Função: `getClienteInadimplenteDetalhes(codigoCliente: number)`
- Retorna: `ClienteInadimplente | null`
- Descrição: Busca dados de títulos vencidos para um cliente específico

---

## 🎨 Sistema de Cores

### Função: `getStatusInadimplenciaColors()`

```typescript
const getStatusInadimplenciaColors = (
  temInadimplencia: boolean, 
  diasAtraso?: number
) => { ... }
```

#### Parâmetros
- `temInadimplencia`: Boolean indicando se cliente tem inadimplência
- `diasAtraso`: Número de dias de atraso (usado quando inadimplente)

#### Estados e Cores Retornadas

| Status | Dias Atraso | Cor | CSS Classes | Prioridade |
|--------|-------------|-----|-------------|-----------|
| **Adimplente** | N/A | Verde | `bg-gradient-to-br from-green-100 to-green-200 text-green-800 border border-green-400` | 0 |
| **Baixo** | 0-30 | Azul | `bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border border-blue-400` | 1 |
| **Médio** | 31-60 | Amarelo | `bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-400` | 2 |
| **Alto Risco** | 61-90 | Laranja | `bg-gradient-to-br from-orange-100 to-orange-200 text-orange-800 border border-orange-400` | 3 |
| **Crítico** | >90 | Vermelho | `bg-gradient-to-br from-red-100 to-red-200 text-red-800 border border-red-400` | 4 |

### Exemplo de Uso

```typescript
// Cliente sem inadimplência
const status1 = getStatusInadimplenciaColors(false);
// Retorna: { status: 'Adimplente', statusColor: '...', prioridade: 0 }

// Cliente com 45 dias de atraso
const status2 = getStatusInadimplenciaColors(true, 45);
// Retorna: { status: 'Médio', statusColor: '...', prioridade: 2 }

// Cliente com 120 dias de atraso
const status3 = getStatusInadimplenciaColors(true, 120);
// Retorna: { status: 'Crítico', statusColor: '...', prioridade: 4 }
```

---

## 🔄 Fluxo de Dados

```
DetalhesCliente.tsx
    ↓
    └─→ getClienteDetalhes(codigoCliente)
    │   └─→ Busca dados básicos e RFM
    │
    ├─→ getClienteInadimplenteDetalhes(codigoCliente)
    │   └─→ Busca em vw_titulos_vencidos_detalhado
    │       └─→ Se houver títulos vencidos → ClienteInadimplente
    │       └─→ Se não houver → null
    │
    ├─→ getStatusInadimplenciaColors(temInadimplencia, diasAtraso)
    │   └─→ Determina cor e status para exibição
    │
    └─→ Renderiza badge ao lado do perfil
```

---

## 📍 Localização no UI

### Header do Cliente

```
┌─────────────────────────────────────────────────┐
│  Nome Cliente                   [Adimplente] [Bronze] │
│  Cód: 1234                                 DSV: 5d   │
└─────────────────────────────────────────────────┘
```

- **Posição**: Primeira seção, lado direito
- **Elemento**: Badge inline com status de inadimplência
- **Adjacência**: Ao lado do badge de perfil (Ouro/Prata/Bronze)

---

## 💻 Implementação Técnica

### Estados do Componente

```typescript
const [inadimplenciaData, setInadimplenciaData] = useState<ClienteInadimplente | null>(null)
const [loadingInadimplencia, setLoadingInadimplencia] = useState(false)
```

### Carregamento dos Dados

```typescript
async function carregarInadimplencia(clienteIdNumerico: number) {
  try {
    setLoadingInadimplencia(true);
    const inadimplencia = await getClienteInadimplenteDetalhes(clienteIdNumerico);
    setInadimplenciaData(inadimplencia);
  } catch (error) {
    console.error('Erro ao carregar dados de inadimplência:', error);
  } finally {
    setLoadingInadimplencia(false);
  }
}
```

### Renderização do Badge

```typescript
{(() => {
  const temInadimplencia = inadimplenciaData !== null
  const diasAtraso = inadimplenciaData?.maior_dias_atraso
  const statusInfo = getStatusInadimplenciaColors(temInadimplencia, diasAtraso)
  return (
    <span className={`text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap ${statusInfo.statusColor}`}>
      {statusInfo.status}
    </span>
  )
})()}
```

---

## 🔗 Dependências

### Queries Utilizadas
- `getClienteDetalhes()` - Dados básicos do cliente
- `getClienteInadimplenteDetalhes()` - Dados de inadimplência
- `getHistoricoVisitas()` - Histórico de visitas

### Imports Necessários
```typescript
import { getClienteInadimplenteDetalhes, getStatusInadimplencia, ClienteInadimplente } from '../../lib/queries/inadimplentes'
```

### Ícones Utilizados
- `AlertTriangle` - Seção "Títulos Vencidos"

---

## 📝 Interface ClienteDetalhes

```typescript
interface ClienteDetalhes {
  // Dados básicos
  codigo_cliente: number;
  nome_fantasia: string;
  razao_social: string;
  cidade: string;
  bairro: string;
  celular?: string;

  // Dados de RFM
  dias_sem_comprar?: number;
  valor_ano_atual?: number;
  valor_ano_anterior?: number;
  meta_ano_atual?: number;
  percentual_atingimento?: number;
  previsao_pedido?: number;
  qtd_compras_ano_anterior?: number;
  qtd_compras_ano_atual?: number;
  perfil?: string;

  // Métricas por categoria
  rx_fem_ob?: number;
  rx_fem_pw?: number;
  rx_mas_ob?: number;
  rx_mas_pw?: number;
  sol_fem_ob?: number;
  sol_fem_pw?: number;
  sol_mas_ob?: number;
  sol_mas_pw?: number;

  // Status financeiro (novo campo)
  status_financeiro?: string;
}
```

---

## 🧪 Casos de Uso

### Caso 1: Cliente Adimplente
- **Entrada**: `inadimplenciaData = null`
- **Badge Exibido**: Verde com texto "Adimplente"
- **Seção de Títulos**: "✓ Sem títulos vencidos"

### Caso 2: Cliente com Inadimplência Baixa
- **Entrada**: `inadimplenciaData = { maior_dias_atraso: 15, ... }`
- **Badge Exibido**: Azul com texto "Baixo"
- **Seção de Títulos**: Mostra tabela com detalhes dos títulos

### Caso 3: Cliente em Situação Crítica
- **Entrada**: `inadimplenciaData = { maior_dias_atraso: 120, ... }`
- **Badge Exibido**: Vermelho com texto "Crítico"
- **Seção de Títulos**: Mostra todos os títulos vencidos com alerta

---

## 🚀 Futuras Melhorias

1. **Adicionar ao Tipo `ClienteDetalhes`**
   - Integrar campo `status_financeiro` na query principal de cliente
   - Evitar query adicional se dados já estiverem disponíveis

2. **Cache de Dados**
   - Implementar cache para evitar múltiplas buscas
   - Atualizar a cada intervalo definido (ex: 5 minutos)

3. **Ações Rápidas**
   - Botão "Receber Pagamento" no badge de inadimplência
   - Integração com sistema de cobrança

4. **Filtros e Relatórios**
   - Relatório de inadimplentes por período
   - Análise de evolução do atraso

---

## 📚 Referências

- **Página Inadimplentes**: `src/components/pages/Inadimplentes.tsx`
- **Query de Inadimplentes**: `src/lib/queries/inadimplentes.ts`
- **View SQL**: `vw_titulos_vencidos_detalhado`
- **Status Colors**: `getStatusInadimplencia()` em inadimplentes.ts

---

## ✅ Checklist de Implementação

- [x] Criar função `getStatusInadimplenciaColors()`
- [x] Adicionar campo `status_financeiro` em `ClienteDetalhes`
- [x] Integrar busca de inadimplência em DetalhesCliente
- [x] Renderizar badge de status ao lado do perfil
- [x] Criar seção "Títulos Vencidos" com tabela
- [x] Documentar arquitetura e uso
- [ ] Adicionar testes unitários
- [ ] Integrar status_financeiro na query principal (futuro)

---

**Última Atualização**: 09/02/2026
**Desenvolvedor**: Daniel Carneiro
**Status**: ✅ Implementado e Funcional
