/**
 * Copiloto Focco Brasil
 * Molecule: ClienteBuscaCard — resultado de busca de cliente (Story 3.8)
 */

import { TrendingUp } from 'lucide-react'
import type { ClienteBusca } from '../../hooks/useBuscaCliente'

const RFM_BADGE: Record<string, { label: string; classes: string }> = {
  ouro:   { label: 'Ouro',   classes: 'bg-yellow-100 text-yellow-800' },
  prata:  { label: 'Prata',  classes: 'bg-gray-100 text-gray-700' },
  bronze: { label: 'Bronze', classes: 'bg-orange-100 text-orange-700' },
}

interface ClienteBuscaCardProps {
  cliente: ClienteBusca
  onClick: () => void
}

export function ClienteBuscaCard({ cliente, onClick }: ClienteBuscaCardProps) {
  const nomeExibido = cliente.nome_fantasia || cliente.razao_social
  const rfmKey = cliente.perfil_rfm?.toLowerCase() ?? ''
  const rfmBadge = RFM_BADGE[rfmKey]

  const dsvBadge =
    cliente.dsv == null
      ? null
      : cliente.dsv > 90
      ? { label: `${cliente.dsv}d s/ comprar`, classes: 'bg-red-100 text-red-700' }
      : cliente.dsv > 60
      ? { label: `${cliente.dsv}d s/ comprar`, classes: 'bg-yellow-100 text-yellow-700' }
      : null

  const oportunidadeFmt =
    cliente.oportunidade_rfm != null && cliente.oportunidade_rfm > 0
      ? cliente.oportunidade_rfm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : null

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col gap-1.5 active:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{nomeExibido}</p>
          {cliente.nome_fantasia && (
            <p className="text-xs text-gray-400 truncate">{cliente.razao_social}</p>
          )}
          {cliente.cidade && (
            <p className="text-xs text-gray-500 mt-0.5">{cliente.cidade}</p>
          )}
        </div>
        {rfmBadge && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${rfmBadge.classes}`}
          >
            {rfmBadge.label}
          </span>
        )}
      </div>

      {(dsvBadge || oportunidadeFmt) && (
        <div className="flex items-center gap-2 flex-wrap">
          {dsvBadge && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dsvBadge.classes}`}>
              {dsvBadge.label}
            </span>
          )}
          {oportunidadeFmt && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <TrendingUp className="w-3 h-3" />
              {oportunidadeFmt}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
