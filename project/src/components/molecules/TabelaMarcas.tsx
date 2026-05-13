/**
 * Copiloto Focco Brasil
 * Molecule: TabelaMarcas — Breakdown de vendas por marca (OB | PW | Core)
 * Story 4.4
 */

interface MarcaData {
  pecas: number
  valor: number
}

export interface TabelaMarcasProps {
  ob: MarcaData
  pw: MarcaData
  core: MarcaData
  /** Objetivo OB+PW em R$ (meta_ano_atual). Omitir = não exibir rodapé de obj. */
  objObPw?: number
  /** Atingimento total (OB+PW+Core) / objObPw × 100. Calculado pelo ETL 06. */
  atingimento?: number
  /** Objetivo Core em peças. 0 ou undefined = sem objetivo definido (omite linha). */
  objCorePecas?: number
  modo?: 'completo' | 'resumido'
  ano?: number
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const fmtPecas = (v: number) => v.toLocaleString('pt-BR')

function atingColor(pct: number): string {
  if (pct >= 80) return 'text-green-700'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-600'
}

export function TabelaMarcas({
  ob,
  pw,
  core,
  objObPw,
  atingimento,
  objCorePecas,
  modo = 'completo',
  ano,
}: TabelaMarcasProps) {
  const totalPecas = ob.pecas + pw.pecas + core.pecas
  const totalValor = ob.valor + pw.valor + core.valor
  const anoLabel = ano ?? new Date().getFullYear()
  const temObjObPw = (objObPw ?? 0) > 0
  const temObjCore = (objCorePecas ?? 0) > 0

  // ── Modo resumido (DashboardGestao, cards) ──────────────────────────────
  if (modo === 'resumido') {
    return (
      <div className="space-y-1.5">
        {/* OB */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[10px] font-bold bg-gray-900 text-white px-1.5 py-0.5 rounded min-w-[22px] text-center">OB</span>
          <span className="text-gray-600">{fmtPecas(ob.pecas)} pç</span>
          <span className="font-semibold text-gray-900 ml-auto">{fmt(ob.valor)}</span>
        </div>
        {/* PW */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded min-w-[22px] text-center">PW</span>
          <span className="text-gray-600">{fmtPecas(pw.pecas)} pç</span>
          <span className="font-semibold text-gray-900 ml-auto">{fmt(pw.valor)}</span>
          {temObjObPw && atingimento !== undefined && (
            <span className={`text-[10px] font-bold ml-2 ${atingColor(atingimento)}`}>
              {atingimento.toFixed(0)}% obj
            </span>
          )}
        </div>
        {/* Core */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded min-w-[22px] text-center">Core</span>
          <span className="text-gray-600">{fmtPecas(core.pecas)} pç</span>
          <span className="font-semibold text-gray-900 ml-auto">{fmt(core.valor)}</span>
        </div>
        {/* Total */}
        <div className="flex items-center gap-2 text-xs border-t border-gray-300 pt-1.5">
          <span className="font-bold text-gray-900">Total</span>
          <span className="text-gray-600">{fmtPecas(totalPecas)} pç</span>
          <span className="font-bold text-gray-900 ml-auto">{fmt(totalValor)}</span>
        </div>
      </div>
    )
  }

  // ── Modo completo (DetalhesCliente) ────────────────────────────────────
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-3">
        Vendas por Marca — {anoLabel}
      </h3>
      <div className="bg-gray-100 p-4 rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="pb-2 text-xs font-medium text-gray-700">Marca</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-700">Peças vend.</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-700">Valor vend.</th>
            </tr>
          </thead>
          <tbody>
            {/* OB */}
            <tr className="border-t border-gray-200">
              <td className="py-2">
                <span className="text-[10px] font-bold bg-gray-900 text-white px-2 py-0.5 rounded">OB</span>
              </td>
              <td className="py-2 text-right text-xs font-semibold text-gray-900">{fmtPecas(ob.pecas)}</td>
              <td className="py-2 text-right text-xs font-semibold text-gray-900">{fmt(ob.valor)}</td>
            </tr>
            {/* PW */}
            <tr className="border-t border-gray-200">
              <td className="py-2">
                <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded">PW</span>
              </td>
              <td className="py-2 text-right text-xs font-semibold text-gray-900">{fmtPecas(pw.pecas)}</td>
              <td className="py-2 text-right text-xs font-semibold text-gray-900">{fmt(pw.valor)}</td>
            </tr>
            {/* Core */}
            <tr className="border-t border-gray-200">
              <td className="py-2">
                <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded">Core</span>
              </td>
              <td className="py-2 text-right text-xs font-semibold text-gray-900">{fmtPecas(core.pecas)}</td>
              <td className="py-2 text-right text-xs font-semibold text-gray-900">{fmt(core.valor)}</td>
            </tr>
            {/* Total */}
            <tr className="border-t-2 border-gray-400">
              <td className="pt-2 text-xs font-bold text-gray-900">TOTAL</td>
              <td className="pt-2 text-right text-xs font-bold text-gray-900">{fmtPecas(totalPecas)}</td>
              <td className="pt-2 text-right text-xs font-bold text-gray-900">{fmt(totalValor)}</td>
            </tr>
          </tbody>
        </table>

        {/* Rodapé: objetivos e atingimento */}
        {(temObjObPw || temObjCore) && (
          <div className="mt-3 pt-3 border-t border-gray-300 flex flex-wrap gap-x-4 gap-y-1">
            {temObjObPw && (
              <span className="text-xs text-gray-600">
                Obj OB+PW:{' '}
                <span className="font-semibold text-gray-900">{fmt(objObPw!)}</span>
                {atingimento !== undefined && (
                  <>
                    {' · '}
                    <span className={`font-bold ${atingColor(atingimento)}`}>
                      {atingimento.toFixed(1)}% ating.
                    </span>
                  </>
                )}
              </span>
            )}
            {temObjCore && (
              <span className="text-xs text-gray-600">
                Obj Core:{' '}
                <span className="font-semibold text-gray-900">{fmtPecas(objCorePecas!)} pç</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
