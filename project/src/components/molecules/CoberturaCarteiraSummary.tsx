/**
 * Copiloto Focco Brasil
 * Molecule: CoberturaCarteiraSummary — cobertura de carteira do vendedor (Story 3.14 AC6)
 */

import { Users, ChevronRight } from 'lucide-react'
import { ClienteNaoVisitado } from '../../hooks/useGestaoAgenda'

interface CoberturaCarteiraSummaryProps {
  totalClientesCarteira: number
  clientesVisitados: number
  pctCobertura: number
  clientesNaoVisitados: ClienteNaoVisitado[]
  onClienteClick: (codigoCliente: number) => void
}

export function CoberturaCarteiraSummary({
  totalClientesCarteira,
  clientesVisitados,
  pctCobertura,
  clientesNaoVisitados,
  onClienteClick,
}: CoberturaCarteiraSummaryProps) {
  const progresso = Math.min(pctCobertura, 100)

  return (
    <div>
      {/* Resumo */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-900">Cobertura de Carteira</h3>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <StatBox label="Total" value={String(totalClientesCarteira)} color="text-gray-900" />
          <StatBox label="Visitados" value={String(clientesVisitados)} color="text-green-700" />
          <StatBox label="Sem visita" value={String(totalClientesCarteira - clientesVisitados)} color="text-red-600" />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-500">Cobertura</span>
            <span className={`text-xs font-semibold ${progresso >= 80 ? 'text-green-700' : progresso >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
              {pctCobertura.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full ${progresso >= 80 ? 'bg-green-500' : progresso >= 50 ? 'bg-orange-400' : 'bg-red-400'}`}
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lista de não visitados */}
      {clientesNaoVisitados.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-700">
              Clientes sem visita no período ({clientesNaoVisitados.length})
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {clientesNaoVisitados.map((c) => (
              <button
                key={c.codigoCliente}
                onClick={() => onClienteClick(c.codigoCliente)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium text-gray-900 truncate">{c.nomeCliente}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] ${c.diasSemComprar > 90 ? 'text-red-600' : c.diasSemComprar > 60 ? 'text-orange-600' : 'text-yellow-600'}`}>
                      {c.diasSemComprar}d sem comprar
                    </span>
                    {c.perfil && (
                      <span className="text-[10px] text-gray-400">{c.perfil}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      )}

      {clientesNaoVisitados.length === 0 && totalClientesCarteira > 0 && (
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-green-700">Todos os clientes visitados!</p>
          <p className="text-xs text-green-600 mt-0.5">Cobertura 100% no período</p>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <p className={`text-base font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  )
}
