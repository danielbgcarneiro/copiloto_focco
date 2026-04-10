/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Calendar, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react'
import { TabelaPerfil as TabelaPerfilType } from '../../lib/queries/dashboard'
import { formatCurrency } from '../../utils'

interface TabelaPerfilProps {
  dados: TabelaPerfilType;
  filtroCidade: string;
}

const corPerfil = {
  ouro:   { border: 'border-yellow-300', header: 'bg-yellow-600', badge: 'bg-yellow-100 text-yellow-800', pill: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  prata:  { border: 'border-gray-300',   header: 'bg-gray-600',   badge: 'bg-gray-100 text-gray-700',    pill: 'bg-gray-50 border-gray-200 text-gray-600' },
  bronze: { border: 'border-orange-300', header: 'bg-orange-600', badge: 'bg-orange-100 text-orange-800', pill: 'bg-orange-50 border-orange-200 text-orange-700' },
}

type SortKey = 'nome_fantasia' | 'cidade_uf' | 'objetivo' | 'vendas' | 'percentual' | 'maior_dias_atraso'

const SORT_LABELS: Record<SortKey, string> = {
  percentual:       '% Meta',
  vendas:           'Vendas',
  objetivo:         'Objetivo',
  nome_fantasia:    'Nome',
  cidade_uf:        'Cidade',
  maior_dias_atraso:'Atraso',
}

function percentualColor(pct: number) {
  if (pct >= 100) return 'text-green-700'
  if (pct >= 80)  return 'text-yellow-700'
  return 'text-red-600'
}

export const TabelaPerfil: React.FC<TabelaPerfilProps> = ({ dados, filtroCidade }) => {
  const navigate = useNavigate()
  const cores = corPerfil[dados.perfil]
  const nomeCapitalizado = dados.perfil.charAt(0).toUpperCase() + dados.perfil.slice(1)

  const [sortKey, setSortKey]     = useState<SortKey>('percentual')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    if (!showSortMenu) return
    function handleOutside(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showSortMenu])

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setShowSortMenu(false)
  }

  const filteredClientes = useMemo(() => {
    if (!filtroCidade) return dados.clientes
    return dados.clientes.filter(c =>
      c.cidade_uf.toLowerCase().includes(filtroCidade.toLowerCase())
    )
  }, [dados.clientes, filtroCidade])

  const sortedClientes = useMemo(() => {
    return [...filteredClientes].sort((a, b) => {
      const av = (a as any)[sortKey] ?? 0
      const bv = (b as any)[sortKey] ?? 0
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1  : -1
      return 0
    })
  }, [filteredClientes, sortKey, sortDir])

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${cores.border}`}>

      {/* ── Cabeçalho ── */}
      <div className={`${cores.header} text-white px-4 py-3`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">💎 {nomeCapitalizado}</h3>
          <div className="flex gap-3 text-xs opacity-90">
            <span>{filteredClientes.length} clientes</span>
            <span>TT {formatCurrency(dados.somaObjetivo)}</span>
            <span>VD {formatCurrency(dados.somaVendas)}</span>
            <span className="font-semibold">{dados.percentualGeral.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* ── Sort — botão único com dropdown ── */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-100">
        <span className="text-xs text-gray-400">
          Ordenado por <span className="font-semibold text-gray-600">{SORT_LABELS[sortKey]}</span>
          {sortDir === 'asc' ? ' ↑' : ' ↓'}
        </span>
        <div className="relative" ref={sortMenuRef}>
          <button
            onClick={() => setShowSortMenu(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Ordenar
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
          </button>

          {showSortMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => handleSort(k)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors cursor-pointer ${
                    k === sortKey
                      ? 'bg-gray-100 font-semibold text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {SORT_LABELS[k]}
                  {k === sortKey
                    ? (sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-gray-500" /> : <ArrowDown className="w-3.5 h-3.5 text-gray-500" />)
                    : null
                  }
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Lista de clientes ── */}
      {dados.clientes.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">Nenhum cliente neste perfil</div>
      ) : (
        <div className="overflow-y-auto max-h-[28rem] divide-y divide-gray-100 bg-white">
          {sortedClientes.map((cliente) => {
            const diasAtraso  = cliente.maior_dias_atraso ?? 0
            const inadimplente = diasAtraso > 0
            const pct          = cliente.percentual

            return (
              <div
                key={cliente.codigo_cliente}
                className="flex items-center gap-3 px-3 py-3.5 min-h-[60px] active:bg-gray-50 transition-colors"
              >
                {/* Info principal — cresce */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                    {cliente.nome_fantasia}
                  </p>
                  <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5">
                    {inadimplente && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                          diasAtraso > 60
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                        title={`Inadimplente — ${diasAtraso}d em atraso`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {diasAtraso}d
                      </span>
                    )}
                    <span className="text-xs text-gray-500 truncate">
                      {cliente.cidade_uf}
                      <span className="mx-1.5 text-gray-300">·</span>
                      <span className="text-gray-600">Obj {formatCurrency(cliente.objetivo)}</span>
                      <span className="mx-1.5 text-gray-300">·</span>
                      <span className="text-gray-600">VD {formatCurrency(cliente.vendas)}</span>
                    </span>
                  </div>
                </div>

                {/* % — badge colorido */}
                <div className="flex-shrink-0 text-right min-w-[44px]">
                  <span className={`text-sm font-bold ${percentualColor(pct)}`}>
                    {pct.toFixed(0)}%
                  </span>
                </div>

                {/* Botão agendar — 44×44px mínimo */}
                <button
                  onClick={() => navigate(`/clientes/detalhes/${cliente.codigo_cliente}`)}
                  className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-green-50 text-green-600 hover:bg-green-100 active:bg-green-200 transition-colors cursor-pointer"
                  title={`Agendar visita — ${cliente.nome_fantasia}`}
                  aria-label={`Agendar visita para ${cliente.nome_fantasia}`}
                >
                  <Calendar className="w-5 h-5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TabelaPerfil
