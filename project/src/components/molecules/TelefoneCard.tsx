/**
 * Copiloto Focco Brasil
 * Molecule: TelefoneCard — card de telefone com ações (Story 3.4)
 */

import React, { useState } from 'react'
import { Phone, PhoneCall, MessageCircle, X, AlertCircle } from 'lucide-react'
import { Telefone } from '../../hooks/useTelefones'

interface TelefoneCardProps {
  telefone: Telefone
  isProprietario: boolean
  onDesativar: (id: string) => Promise<void>
}

function formatarNumero(numero: string): string {
  const d = numero.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return numero
}

function whatsappUrl(numero: string): string {
  const digits = numero.replace(/\D/g, '')
  const withCountry = digits.startsWith('55') ? digits : '55' + digits
  return `https://wa.me/${withCountry}`
}

function TipoIcon({ tipo }: { tipo: Telefone['tipo'] }) {
  if (tipo === 'fixo') return <PhoneCall className="h-4 w-4 text-gray-500" />
  if (tipo === 'whatsapp') return (
    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-500 text-white text-[9px] font-bold">WA</span>
  )
  return <Phone className="h-4 w-4 text-gray-500" />
}

export const TelefoneCard: React.FC<TelefoneCardProps> = ({
  telefone,
  isProprietario,
  onDesativar,
}) => {
  const [confirmando, setConfirmando] = useState(false)
  const [desativando, setDesativando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const mostraWhatsApp = telefone.tipo !== 'fixo' || telefone.whatsapp_habilitado

  const handleDesativar = async () => {
    setDesativando(true)
    setErro(null)
    try {
      await onDesativar(telefone.id)
      setConfirmando(false)
    } catch {
      setErro('Erro ao remover telefone.')
    } finally {
      setDesativando(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2">
      {/* Grid 3 colunas: [info] [ligar] [whatsapp] + opcional [remover] */}
      <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr auto auto' + (isProprietario ? ' auto' : '') }}>

        {/* Col 1 — ícone + número + badge */}
        <div className="flex items-center gap-2 min-w-0">
          <TipoIcon tipo={telefone.tipo} />
          <span className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">
            {formatarNumero(telefone.numero)}
          </span>
          {telefone.origem === 'erp' ? (
            <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">ERP</span>
          ) : isProprietario ? (
            <span className="text-[10px] text-blue-500 bg-blue-50 rounded px-1.5 py-0.5 shrink-0">seu</span>
          ) : null}
        </div>

        {/* Col 2 — Ligar */}
        <a
          href={`tel:${telefone.numero.replace(/\D/g, '')}`}
          className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 transition-colors shrink-0"
          aria-label={`Ligar para ${formatarNumero(telefone.numero)}`}
        >
          <Phone className="h-4 w-4" />
        </a>

        {/* Col 3 — WhatsApp */}
        {mostraWhatsApp ? (
          <a
            href={whatsappUrl(telefone.numero)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 active:bg-green-200 transition-colors shrink-0"
            aria-label={`WhatsApp ${formatarNumero(telefone.numero)}`}
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        ) : (
          <span className="p-2 w-8" /> /* placeholder para manter alinhamento */
        )}

        {/* Col 4 — Remover (só para proprietário) */}
        {isProprietario && (
          <button
            onClick={() => setConfirmando(true)}
            className="p-2 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 active:bg-red-100 transition-colors shrink-0"
            aria-label="Remover telefone"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {erro}
        </div>
      )}

      {/* Confirmação de remoção */}
      {confirmando && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-700 mb-2">Remover este telefone da lista?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmando(false)}
              disabled={desativando}
              className="flex-1 text-xs py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Não
            </button>
            <button
              onClick={handleDesativar}
              disabled={desativando}
              className="flex-1 text-xs py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {desativando ? 'Removendo...' : 'Sim, remover'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
