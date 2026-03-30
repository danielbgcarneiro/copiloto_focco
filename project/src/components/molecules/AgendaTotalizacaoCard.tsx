/**
 * Copiloto Focco Brasil
 * Molecule: AgendaTotalizacaoCard — tabela unificada de agendamentos + totais (Story 3.18/3.19)
 *
 * Layout por cliente: 2 linhas × 3 colunas
 *   Linha 1: Fantasia | Cidade | Perfil badge | Status
 *   Linha 2: Previsão | Oportunidade | Meta
 * Alternância de fundo entre clientes.
 * Bloco de totais com peso visual de gestão.
 */

import { PenLine } from 'lucide-react'
import { calcularMetaSemana } from '../../utils/agendaUtils'

export interface AgendaTotalizacaoItem {
  id: string
  codigo_cliente: number
  nome: string
  cidade?: string | null
  perfil_rfm?: string | null
  valor_previsto: number | null
  oportunidade: number | null
  meta_ano_atual: number | null
  visita_resultado?: string | null
  visita_valor_realizado?: number | null
}

interface AgendaTotalizacaoCardProps {
  items: AgendaTotalizacaoItem[]
  metaMes: number
  realizadoMes: number
  hoje?: Date
  showClienteTable?: boolean
  onRegistrar?: (id: string) => void
  onClienteClick?: (codigo_cliente: number) => void
}

const RESULTADO_EMOJI: Record<string, string> = {
  vendeu: '✅',
  nao_vendeu: '❌',
  ausente: '👻',
  reagendou: '🔄',
}

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function PerfilBadge({ perfil }: { perfil?: string | null }) {
  if (!perfil) return null
  const p = perfil.toLowerCase()
  const config = p.includes('ouro')
    ? { label: 'Ouro', cls: 'bg-yellow-100 text-yellow-700' }
    : p.includes('prata')
    ? { label: 'Prata', cls: 'bg-gray-200 text-gray-600' }
    : p.includes('bronze')
    ? { label: 'Bronze', cls: 'bg-orange-100 text-orange-700' }
    : { label: perfil, cls: 'bg-blue-100 text-blue-600' }

  return (
    <span className={`text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wide shrink-0 ${config.cls}`}>
      {config.label}
    </span>
  )
}

export function AgendaTotalizacaoCard({
  items,
  metaMes,
  realizadoMes,
  hoje = new Date(),
  showClienteTable = true,
  onRegistrar,
  onClienteClick,
}: AgendaTotalizacaoCardProps) {
  const totalPrevisao = items.reduce((s, i) => s + (i.valor_previsto ?? 0), 0)
  const totalOportunidade = items.reduce((s, i) => s + (i.oportunidade ?? 0), 0)
  const totalMeta = items.reduce((s, i) => s + (i.meta_ano_atual ?? 0), 0)
  const metaSemana = calcularMetaSemana(metaMes, realizadoMes, hoje)
  const saldoMes = Math.max(metaMes - realizadoMes, 0)

  return (
    <div className="mx-4 mb-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

      {showClienteTable && (
        <>
          {/* Header */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Clientes agendados
            </span>
          </div>

          {/* Linhas de cliente */}
          {items.length === 0 ? (
            <div className="px-3 py-4 text-xs text-gray-400 text-center">
              Nenhum cliente agendado
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id}
                className={`px-3 py-2 border-b border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}
              >
                {/* Linha 1: Nome | Cidade | Perfil | Status */}
                <div className="flex items-center gap-1.5 mb-1">
                  <button
                    onClick={() => onClienteClick?.(item.codigo_cliente)}
                    className="flex-1 min-w-0 text-left overflow-hidden"
                    disabled={!onClienteClick}
                  >
                    <span className="text-[11px] font-semibold text-gray-800 truncate block leading-tight">
                      {item.nome}
                    </span>
                  </button>

                  {item.cidade && (
                    <span className="text-[10px] text-gray-400 truncate max-w-[64px] shrink-0 leading-tight">
                      {item.cidade}
                    </span>
                  )}

                  <PerfilBadge perfil={item.perfil_rfm} />

                  {/* Status / botão registrar */}
                  <div className="w-5 flex items-center justify-center shrink-0">
                    {item.visita_resultado ? (
                      <span className="text-sm leading-none" title={item.visita_resultado}>
                        {RESULTADO_EMOJI[item.visita_resultado] ?? '✅'}
                      </span>
                    ) : onRegistrar ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRegistrar(item.id)
                        }}
                        className="text-gray-300 hover:text-primary transition-colors cursor-pointer"
                        title="Registrar resultado"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Linha 2: Previsão | Oportunidade | Meta */}
                <div className="grid grid-cols-3 gap-1">
                  <div>
                    <p className="text-[8px] text-gray-400 leading-tight">Previsão</p>
                    <p className="text-[10px] font-semibold text-primary tabular-nums whitespace-nowrap leading-tight">
                      {item.valor_previsto ? fmt(item.valor_previsto) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] text-gray-400 leading-tight">Oport.</p>
                    <p className="text-[10px] font-semibold text-yellow-600 tabular-nums whitespace-nowrap leading-tight">
                      {item.oportunidade ? fmt(item.oportunidade) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] text-gray-400 leading-tight">Meta</p>
                    <p className="text-[10px] font-semibold text-gray-500 tabular-nums whitespace-nowrap leading-tight">
                      {item.meta_ano_atual ? fmt(item.meta_ano_atual) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ─── Bloco de totais — peso visual de gestão ─────────────────── */}
      <div className="px-3 pt-3 pb-3 border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">
          Resumo
        </p>

        {/* Destaque principal: Previsão do Vendedor */}
        <div className="bg-primary/8 rounded-xl px-3 py-2.5 mb-2.5 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-semibold text-primary/60 uppercase tracking-wide mb-0.5">
              Previsão do Vendedor
            </p>
            <p className="text-2xl font-bold text-primary tabular-nums leading-none">
              {fmt(totalPrevisao)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400">
              {items.length} cliente{items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Grid 2×2: Oportunidade / Meta / Meta Semana / Saldo Mês */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-yellow-50 rounded-lg px-2.5 py-2">
            <p className="text-[8px] font-semibold text-yellow-600 uppercase tracking-wide mb-0.5">
              Soma Oport.
            </p>
            <p className="text-sm font-bold text-yellow-700 tabular-nums whitespace-nowrap">
              {fmt(totalOportunidade)}
            </p>
          </div>
          <div className="bg-gray-100 rounded-lg px-2.5 py-2">
            <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
              Meta Clientes
            </p>
            <p className="text-sm font-bold text-gray-700 tabular-nums whitespace-nowrap">
              {fmt(totalMeta)}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg px-2.5 py-2">
            <p className="text-[8px] font-semibold text-blue-600 uppercase tracking-wide mb-0.5">
              Meta da Semana
            </p>
            <p className="text-sm font-bold text-blue-700 tabular-nums whitespace-nowrap">
              {fmt(metaSemana)}
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg px-2.5 py-2">
            <p className="text-[8px] font-semibold text-orange-600 uppercase tracking-wide mb-0.5">
              Saldo do Mês
            </p>
            <p className="text-sm font-bold text-orange-700 tabular-nums whitespace-nowrap">
              {fmt(saldoMes)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
