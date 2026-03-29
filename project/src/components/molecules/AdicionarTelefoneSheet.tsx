/**
 * Copiloto Focco Brasil
 * Molecule: AdicionarTelefoneSheet — bottom sheet para adicionar telefone (Story 3.4)
 */

import React, { useState, useEffect } from 'react'
import { X, Phone, AlertCircle } from 'lucide-react'
import { AdicionarTelefoneParams, Telefone } from '../../hooks/useTelefones'

interface AdicionarTelefoneSheetProps {
  isOpen: boolean
  codigoCliente: number
  onClose: () => void
  onSuccess: () => void
  adicionarTelefone: (params: AdicionarTelefoneParams) => Promise<Telefone>
}

const TIPOS: { value: Telefone['tipo']; label: string }[] = [
  { value: 'celular', label: 'Celular' },
  { value: 'fixo', label: 'Fixo' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'outro', label: 'Outro' },
]

function apenasDigitos(s: string): string {
  return s.replace(/\D/g, '')
}

export const AdicionarTelefoneSheet: React.FC<AdicionarTelefoneSheetProps> = ({
  isOpen,
  codigoCliente,
  onClose,
  onSuccess,
  adicionarTelefone,
}) => {
  const [numero, setNumero] = useState('')
  const [tipo, setTipo] = useState<Telefone['tipo']>('celular')
  const [descricao, setDescricao] = useState('')
  const [whatsappHabilitado, setWhatsappHabilitado] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setNumero('')
    setTipo('celular')
    setDescricao('')
    setWhatsappHabilitado(false)
    setErro(null)
  }, [isOpen])

  // Quando tipo = whatsapp, auto-habilita whatsapp_habilitado
  useEffect(() => {
    if (tipo === 'whatsapp') setWhatsappHabilitado(true)
  }, [tipo])

  const handleSalvar = async () => {
    const digits = apenasDigitos(numero)
    if (digits.length < 10) {
      setErro('Informe um número válido com DDD (mínimo 10 dígitos).')
      return
    }
    setSaving(true)
    setErro(null)
    try {
      await adicionarTelefone({
        codigoCliente,
        numero: digits,
        tipo,
        descricao: descricao.trim() || undefined,
        whatsappHabilitado,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar telefone.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Adicionar telefone"
        className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl px-5 pt-5 pb-8 max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-gray-900">Adicionar telefone</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Número */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="(00) 00000-0000"
            value={numero}
            onChange={e => setNumero(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        </div>

        {/* Tipo */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value as Telefone['tipo'])}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            {TIPOS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Descrição */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição <span className="text-gray-400 text-xs">opcional</span>
          </label>
          <input
            type="text"
            placeholder="ex: Gerente João, Recepção..."
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Toggle WhatsApp — só para celular e outro */}
        {tipo !== 'whatsapp' && tipo !== 'fixo' && (
          <div className="mb-5 flex items-center justify-between py-3 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Tem WhatsApp?</p>
              <p className="text-xs text-gray-500">Habilita botão de mensagem rápida</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={whatsappHabilitado}
              onClick={() => setWhatsappHabilitado(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                whatsappHabilitado ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                whatsappHabilitado ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}

        {/* Salvar */}
        <button
          onClick={handleSalvar}
          disabled={saving || !numero.trim()}
          className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Salvando...' : 'Salvar telefone'}
        </button>
      </div>
    </>
  )
}
