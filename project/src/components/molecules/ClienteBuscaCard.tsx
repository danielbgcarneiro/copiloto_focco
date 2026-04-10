/**
 * Copiloto Focco Brasil
 * Molecule: ClienteBuscaCard — resultado de busca de cliente (Story 3.8 / Story 006 AC-3)
 */

import { TrendingUp, AlertTriangle, Check } from 'lucide-react'
import type { ClienteBusca } from '../../hooks/useBuscaCliente'

const RFM_BADGE: Record<string, { label: string; classes: string }> = {
  ouro:   { label: 'Ouro',   classes: 'bg-yellow-100 text-yellow-800' },
  prata:  { label: 'Prata',  classes: 'bg-gray-100 text-gray-700' },
  bronze: { label: 'Bronze', classes: 'bg-orange-100 text-orange-700' },
}

interface ClienteBuscaCardProps {
  cliente: ClienteBusca
  onClick: () => void
  agendado?: boolean
}

export function ClienteBuscaCard({ cliente, onClick, agendado }: ClienteBuscaCardProps) {
  const nomeExibido = cliente.nome_fantasia || cliente.razao_social
  const rfmKey = cliente.perfil_rfm?.toLowerCase() ?? ''
  const rfmBadge = RFM_BADGE[rfmKey]

  const meta = cliente.meta_ano_atual ?? 0
  const vendas = cliente.valor_ano_atual ?? 0
  const percentualMeta = meta > 0 ? Math.min(100, (vendas / meta) * 100) : 0

  const oportunidadeFmt =
    cliente.oportunidade_rfm != null && cliente.oportunidade_rfm > 0
      ? cliente.oportunidade_rfm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : null

  const dsvLabel =
    cliente.dsv != null && cliente.dsv > 0
      ? `${cliente.dsv}d s/ comprar`
      : null

  const dsvColor =
    cliente.dsv != null && cliente.dsv > 90
      ? 'text-red-600'
      : cliente.dsv != null && cliente.dsv > 60
      ? 'text-yellow-600'
      : 'text-gray-500'

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col gap-2 active:bg-gray-50 transition-colors cursor-pointer"
    >
      {/* Linha 1 — Nome + badges */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 truncate flex-1">{nomeExibido}</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {agendado && (
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Check className="w-2.5 h-2.5" />Agendado
            </span>
          )}
          {rfmBadge && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rfmBadge.classes}`}>
              {rfmBadge.label}
            </span>
          )}
        </div>
      </div>

      {/* Linha 2 — Cidade · DSV · Oportunidade */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {cliente.cidade && (
          <span className="text-xs text-gray-500">{cliente.cidade}</span>
        )}
        {cliente.cidade && dsvLabel && (
          <span className="text-xs text-gray-300">·</span>
        )}
        {dsvLabel && (
          <span className={`text-xs font-medium ${dsvColor}`}>{dsvLabel}</span>
        )}
        {oportunidadeFmt && (
          <>
            {(cliente.cidade || dsvLabel) && (
              <span className="text-xs text-gray-300">·</span>
            )}
            <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-medium">
              <TrendingUp className="w-3 h-3" />
              {oportunidadeFmt}
            </span>
          </>
        )}
      </div>

      {/* Linha 3 — Barra de progresso meta */}
      {meta > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                percentualMeta >= 100 ? 'bg-green-500' :
                percentualMeta >= 80  ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${percentualMeta}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">
            {percentualMeta.toFixed(0)}% meta
          </span>
        </div>
      )}

      {/* Linha 4 — Badge inadimplência */}
      {cliente.maior_dias_atraso != null && cliente.maior_dias_atraso > 0 && (
        <div className={`flex items-center gap-1 text-xs font-medium ${cliente.maior_dias_atraso > 60 ? 'text-red-600' : 'text-amber-600'}`}>
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <span>Inadimplente — {cliente.maior_dias_atraso}d em atraso</span>
        </div>
      )}
    </button>
  )
}
