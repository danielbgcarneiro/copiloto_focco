/**
 * Copiloto Focco Brasil
 * Seções de apresentação de Clientes — extraídas para reduzir complexidade.
 */

import type { RefObject } from 'react'
import { Search, Filter } from 'lucide-react'

// ─── ordenação ────────────────────────────────────────────────────────────────

export function getPerfilValue(perfil: string): number {
  const p = perfil?.toLowerCase() || ''
  if (p.includes('ouro')) return 3
  if (p.includes('prata')) return 2
  if (p.includes('bronze')) return 1
  return 0
}

const rfmDe = (c: any) => c.analise_rfm || {}

/** Comparadores por chave de ordenação — cada um isolado mantém a complexidade baixa. */
const COMPARATORS: Record<string, (a: any, b: any) => number> = {
  perfil: (a, b) => getPerfilValue(rfmDe(b).perfil || '') - getPerfilValue(rfmDe(a).perfil || ''),
  nome: (a, b) => a.nome_fantasia.localeCompare(b.nome_fantasia),
  bairro: (a, b) => (a.bairro || '').localeCompare(b.bairro || ''),
  oportunidade: (a, b) => (rfmDe(b).previsao_pedido || 0) - (rfmDe(a).previsao_pedido || 0),
  dsv: (a, b) => (rfmDe(b).dias_sem_comprar || 0) - (rfmDe(a).dias_sem_comprar || 0),
}

/** Compara dois clientes pela chave/direção; desconhecida cai em 'perfil'. */
export function compareClientes(a: any, b: any, sortBy: string, sortDirection: 'asc' | 'desc'): number {
  const comparison = (COMPARATORS[sortBy] || COMPARATORS.perfil)(a, b)
  return sortDirection === 'desc' ? comparison : -comparison
}

export function ClientesBreadcrumb({
  rotaNome, cidadeDecodificada,
}: {
  rotaNome: string | null
  cidadeDecodificada: string | null
}) {
  if (!rotaNome && !cidadeDecodificada) return null
  return (
    <div className="mb-4 px-2">
      <div className="flex items-center text-sm text-gray-600">
        {rotaNome && <span>Rota: <span className="font-semibold text-primary">{rotaNome}</span></span>}
        {rotaNome && cidadeDecodificada && <span className="mx-2">•</span>}
        {cidadeDecodificada && <span>Cidade: <span className="font-semibold text-primary">{cidadeDecodificada}</span></span>}
      </div>
    </div>
  )
}

type SortKey = 'perfil' | 'nome' | 'bairro' | 'oportunidade' | 'dsv'

const SORT_OPTIONS: { key: SortKey; label: string; indicator: 'arrow' | 'alpha' }[] = [
  { key: 'perfil', label: 'Perfil', indicator: 'arrow' },
  { key: 'nome', label: 'Nome', indicator: 'alpha' },
  { key: 'bairro', label: 'Bairro', indicator: 'alpha' },
  { key: 'oportunidade', label: 'Oportunidade', indicator: 'arrow' },
  { key: 'dsv', label: 'DSV', indicator: 'arrow' },
]

function SortOption({
  option, activeKey, sortDirection, onSort, last,
}: {
  option: { key: SortKey; label: string; indicator: 'arrow' | 'alpha' }
  activeKey: string
  sortDirection: 'asc' | 'desc'
  onSort: (key: string) => void
  last: boolean
}) {
  const active = activeKey === option.key
  const indicador = option.indicator === 'alpha'
    ? (sortDirection === 'asc' ? 'A-Z' : 'Z-A')
    : (sortDirection === 'desc' ? '↓' : '↑')
  return (
    <button
      className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-50 ${last ? '' : 'border-b border-gray-200'} flex items-center justify-between ${active ? 'bg-blue-50 font-semibold' : ''}`}
      onClick={() => onSort(option.key)}
    >
      <span>{option.label}</span>
      {active && <span className="text-[10px] text-gray-500">{indicador}</span>}
    </button>
  )
}

export function ClienteSearchBar({
  searchTerm, onSearchChange, showSortMenu, onToggleSortMenu, sortBy, sortDirection, onSort, sortMenuRef,
}: {
  searchTerm: string
  onSearchChange: (value: string) => void
  showSortMenu: boolean
  onToggleSortMenu: () => void
  sortBy: string
  sortDirection: 'asc' | 'desc'
  onSort: (key: string) => void
  sortMenuRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          aria-label="Buscar óticas por nome, código ou bairro"
          placeholder="Buscar óticas / bairro..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>
      <div className="relative flex-shrink-0" ref={sortMenuRef}>
        <button
          aria-label="Ordenar clientes"
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          onClick={onToggleSortMenu}
        >
          <Filter className="h-4 w-4 text-gray-600" />
        </button>
        {showSortMenu && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-40">
            {SORT_OPTIONS.map((opt, i) => (
              <SortOption
                key={opt.key}
                option={opt}
                activeKey={sortBy}
                sortDirection={sortDirection}
                onSort={onSort}
                last={i === SORT_OPTIONS.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
