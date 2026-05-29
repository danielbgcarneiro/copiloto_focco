/**
 * Copiloto Focco Brasil
 * Molecule: PlanejarRotaSheet — Fluxo de planejamento de rota em lote (FEAT-AG-010)
 *
 * Step 0: RotaSelector     — selecionar rota + período
 * Step 1: CidadePaginator  — percorrer cidade por cidade
 * Step 2: OverflowScreen   — clientes sem data + sugestão de extensão
 * Step 3: ConfirmScreen    — resumo final antes de criar agendamentos
 */

import { useState, useEffect, useMemo } from 'react'
import { X, ChevronLeft, Route, Calendar, CheckCircle2, Users } from 'lucide-react'
import {
  usePlanejamentoRota,
  CidadePlano,
  ClientePlano,
  SITUACAO_AUTO,
  SITUACAO_MANUAL,
  nextBusinessDay,
  addBusinessDays,
  toDateStr,
} from '../../hooks/usePlanejamentoRota'
import { formatCurrency } from '../../utils'

interface PlanejarRotaSheetProps {
  isOpen: boolean
  vendedorId: string
  onClose: () => void
  onSuccess: (datasAgendadas: string[]) => void
}

interface DecisaoCidade {
  data: string | null
  clientesSelecionados: Set<number>
  pulada: boolean
}

function badgeSituacao(situacao: string): string {
  if (SITUACAO_MANUAL.includes(situacao)) return 'bg-red-100 text-red-700'
  return ''
}

function labelSituacao(situacao: string): string {
  const labels: Record<string, string> = {
    A: 'Ativo', E: 'Especial', S: 'Sem limite', V: 'Vista',
    P: 'Inadimplente', B: 'Bloqueado',
  }
  return labels[situacao] ?? situacao
}

// ─── Step 0: Seleção de Rota e Período ──────────────────────────────────────

interface RotaSelectorProps {
  rotasAtivas: string[]
  rotaSelecionada: string
  dataInicio: string
  dataFim: string
  totalAdimplentes: number
  totalCidades: number
  loading: boolean
  onRotaChange: (r: string) => void
  onDataInicioChange: (d: string) => void
  onDataFimChange: (d: string) => void
  onIniciar: () => void
}

function RotaSelector({
  rotasAtivas, rotaSelecionada, dataInicio, dataFim,
  totalAdimplentes, totalCidades, loading,
  onRotaChange, onDataInicioChange, onDataFimChange, onIniciar,
}: RotaSelectorProps) {
  const hoje = toDateStr(new Date())
  const podeProsseguir = !!rotaSelecionada && !!dataInicio

  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rota</label>
        <select
          value={rotaSelecionada}
          onChange={(e) => onRotaChange(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">Selecionar rota...</option>
          {rotasAtivas.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Período</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dataInicio}
            min={hoje}
            onChange={(e) => onDataInicioChange(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <span className="text-gray-400 text-sm">até</span>
          <input
            type="date"
            value={dataFim}
            min={dataInicio || hoje}
            onChange={(e) => onDataFimChange(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
      </div>

      {rotaSelecionada && !loading && totalAdimplentes > 0 && (
        <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-sm text-sky-700">
          <p className="font-semibold">{totalAdimplentes} clientes adimplentes</p>
          <p className="text-xs text-sky-500 mt-0.5">em {totalCidades} cidades</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <button
        onClick={onIniciar}
        disabled={!podeProsseguir || loading}
        className="w-full py-3 rounded-xl bg-sky-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-sky-700 active:bg-sky-800 transition-colors"
      >
        Iniciar planejamento →
      </button>
    </div>
  )
}

// ─── Step 1: Paginação por Cidade ────────────────────────────────────────────

interface CidadePaginatorProps {
  cidades: CidadePlano[]
  cidadeIdx: number
  diasPeriodo: string[]
  decisoes: Map<string, DecisaoCidade>
  onDecisaoChange: (cidade: string, decisao: Partial<DecisaoCidade>) => void
  onProxima: () => void
  onPular: () => void
  onVoltar: () => void
}

function CidadePaginator({
  cidades, cidadeIdx, diasPeriodo, decisoes,
  onDecisaoChange, onProxima, onPular, onVoltar,
}: CidadePaginatorProps) {
  const cidadeAtual = cidades[cidadeIdx]
  if (!cidadeAtual) return null

  const decisao = decisoes.get(cidadeAtual.cidade) ?? {
    data: null, clientesSelecionados: new Set<number>(), pulada: false,
  }

  const adimplentes = cidadeAtual.clientes.filter((c) => SITUACAO_AUTO.includes(c.situacao))
  const manuais = cidadeAtual.clientes.filter((c) => SITUACAO_MANUAL.includes(c.situacao))
  const selecionados = decisao.clientesSelecionados

  function toggleCliente(codigo: number) {
    const novo = new Set(selecionados)
    if (novo.has(codigo)) novo.delete(codigo)
    else novo.add(codigo)
    onDecisaoChange(cidadeAtual.cidade, { clientesSelecionados: novo })
  }

  function selecionarDia(data: string) {
    onDecisaoChange(cidadeAtual.cidade, { data })
  }

  const podeProsseguir = !!decisao.data

  function formatDiaSemana(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return `${dias[d.getDay()]} ${d.getDate()}/${meses[d.getMonth()]}`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="flex items-center gap-1 px-4 py-2">
        <button onClick={onVoltar} className="p-1 mr-1">
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        {cidades.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full ${
              i < cidadeIdx ? 'bg-sky-500' : i === cidadeIdx ? 'bg-sky-300' : 'bg-gray-200'
            }`}
          />
        ))}
        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
          {cidadeIdx + 1}/{cidades.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Cidade header */}
        <h3 className="text-base font-bold text-gray-800 mt-2">
          {cidadeAtual.cidade}
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          {cidadeAtual.clientes.filter(c => !c.jaAgendado).length} clientes disponíveis
        </p>

        {/* Seleção de dia */}
        <p className="text-xs font-semibold text-gray-600 mb-2">Dia desta cidade</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {diasPeriodo.map((d) => (
            <button
              key={d}
              onClick={() => selecionarDia(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                decisao.data === d
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-sky-300'
              }`}
            >
              {formatDiaSemana(d)}
            </button>
          ))}
        </div>

        {/* Clientes adimplentes */}
        {adimplentes.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {adimplentes.map((c) => (
              <ClienteRow
                key={c.codigo_cliente}
                cliente={c}
                selecionado={selecionados.has(c.codigo_cliente)}
                onToggle={() => toggleCliente(c.codigo_cliente)}
              />
            ))}
          </div>
        )}

        {/* Divisor inadimplentes */}
        {manuais.length > 0 && (
          <>
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">Inadimplentes / Bloqueados</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-1.5">
              {manuais.map((c) => (
                <ClienteRow
                  key={c.codigo_cliente}
                  cliente={c}
                  selecionado={selecionados.has(c.codigo_cliente)}
                  onToggle={() => toggleCliente(c.codigo_cliente)}
                  manual
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Ações */}
      <div className="px-4 pb-6 pt-2 border-t border-gray-100 flex gap-2">
        <button
          onClick={onPular}
          className="flex-shrink-0 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          Pular cidade
        </button>
        <button
          onClick={onProxima}
          disabled={!podeProsseguir}
          className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-sky-700 transition-colors"
        >
          {cidadeIdx < cidades.length - 1 ? 'Próxima →' : 'Finalizar →'}
        </button>
      </div>
    </div>
  )
}

function ClienteRow({
  cliente, selecionado, onToggle, manual = false,
}: {
  cliente: ClientePlano
  selecionado: boolean
  onToggle: () => void
  manual?: boolean
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 border transition-colors text-left ${
        cliente.jaAgendado
          ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-100'
          : selecionado
          ? 'bg-sky-50 border-sky-200'
          : 'bg-white border-gray-100 hover:border-gray-200'
      }`}
      disabled={cliente.jaAgendado}
    >
      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
        selecionado ? 'bg-sky-600 border-sky-600' : 'border-gray-300'
      }`}>
        {selecionado && <div className="w-2 h-2 bg-white rounded-sm" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-800 truncate">
            {cliente.nome_fantasia || cliente.razao_social}
          </span>
          {manual && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${badgeSituacao(cliente.situacao)}`}>
              {labelSituacao(cliente.situacao)}
            </span>
          )}
          {cliente.jaAgendado && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
              Já agendado
            </span>
          )}
        </div>
        {cliente.dsv != null && (
          <span className="text-xs text-gray-400">DSV {cliente.dsv}d</span>
        )}
      </div>
      {cliente.previsao_pedido != null && cliente.previsao_pedido > 0 && (
        <span className="text-xs font-semibold text-orange-600 flex-shrink-0">
          {formatCurrency(cliente.previsao_pedido, true)}
        </span>
      )}
    </button>
  )
}

// ─── Step 2: Overflow ────────────────────────────────────────────────────────

interface OverflowScreenProps {
  cidades: CidadePlano[]
  decisoes: Map<string, DecisaoCidade>
  dataFimAtual: string
  onAceitarSugestao: (novaDataInicio: string, novaDataFim: string) => void
  onSalvarFila: () => void
  onConfirmar: () => void
}

function OverflowScreen({
  cidades, decisoes, dataFimAtual,
  onAceitarSugestao, onSalvarFila, onConfirmar,
}: OverflowScreenProps) {
  const cidadesPendentes = cidades.filter((c) => {
    const d = decisoes.get(c.cidade)
    return !d?.data && !d?.pulada
  })

  const planejados = cidades.reduce((acc, c) => {
    const d = decisoes.get(c.cidade)
    if (d?.data) acc += d.clientesSelecionados.size
    return acc
  }, 0)

  const diasDistintos = new Set(
    Array.from(decisoes.values()).map((d) => d.data).filter(Boolean)
  ).size

  const sugestaoInicio = nextBusinessDay(new Date(dataFimAtual + 'T00:00:00'))
  const sugestaoFim = addBusinessDays(sugestaoInicio, Math.max(cidadesPendentes.length - 1, 0))

  if (cidadesPendentes.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-green-700">{planejados} clientes planejados</p>
          <p className="text-xs text-green-500 mt-0.5">distribuídos em {diasDistintos} dias</p>
        </div>
        <button
          onClick={onConfirmar}
          className="w-full py-3 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
        >
          Confirmar {planejados} agendamentos →
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="bg-sky-50 border border-sky-100 rounded-xl p-3">
        <p className="text-sm font-semibold text-sky-700">✅ {planejados} clientes planejados</p>
        <p className="text-xs text-sky-500 mt-0.5">em {diasDistintos} dias</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">
          ⏳ {cidadesPendentes.length} {cidadesPendentes.length === 1 ? 'cidade' : 'cidades'} sem data
        </p>
        <div className="space-y-1.5">
          {cidadesPendentes.map((c) => (
            <div key={c.cidade} className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">📍</span>
                <span className="text-sm text-gray-700">{c.cidade}</span>
              </div>
              <span className="text-xs text-gray-500">{c.clientes.length} clientes</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
        <p className="text-xs font-bold text-yellow-700 mb-1">💡 Sugestão de extensão</p>
        <p className="text-sm text-yellow-700">
          Adicionar {toDateStr(sugestaoInicio)} a {toDateStr(sugestaoFim)} para planejar o restante
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onAceitarSugestao(toDateStr(sugestaoInicio), toDateStr(sugestaoFim))}
            className="flex-1 py-2 rounded-lg bg-yellow-500 text-white text-xs font-semibold hover:bg-yellow-600 transition-colors"
          >
            Aceitar
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSalvarFila}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          Salvar fila para depois
        </button>
        <button
          onClick={onConfirmar}
          className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
        >
          Confirmar {planejados} →
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Confirmação Final ───────────────────────────────────────────────

interface ConfirmScreenProps {
  rota: string
  dataInicio: string
  dataFim: string
  cidades: CidadePlano[]
  decisoes: Map<string, DecisaoCidade>
  loading: boolean
  onVoltar: () => void
  onConfirmar: () => void
}

function ConfirmScreen({
  rota, dataInicio, dataFim, cidades, decisoes, loading,
  onVoltar, onConfirmar,
}: ConfirmScreenProps) {
  const porDia = useMemo(() => {
    const mapa = new Map<string, { clientes: number; valorTotal: number }>()
    cidades.forEach((c) => {
      const d = decisoes.get(c.cidade)
      if (!d?.data) return
      const atual = mapa.get(d.data) ?? { clientes: 0, valorTotal: 0 }
      d.clientesSelecionados.forEach((cod) => {
        const cli = c.clientes.find((cl) => cl.codigo_cliente === cod)
        atual.clientes++
        atual.valorTotal += cli?.previsao_pedido ?? 0
      })
      mapa.set(d.data, atual)
    })
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [cidades, decisoes])

  const totalClientes = porDia.reduce((acc, [, d]) => acc + d.clientes, 0)
  const totalValor = porDia.reduce((acc, [, d]) => acc + d.valorTotal, 0)

  function formatDataBR(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return `${dias[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-xs text-gray-500 mb-1">{rota}</p>
        <p className="text-sm font-semibold text-gray-700 mb-4">
          {dataInicio} a {dataFim}
        </p>

        <div className="space-y-2">
          {porDia.map(([data, info]) => (
            <div key={data} className="flex items-center justify-between rounded-lg bg-sky-50 border border-sky-100 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">{formatDataBR(data)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Users className="w-3 h-3" />{info.clientes}
                </span>
                {info.valorTotal > 0 && (
                  <span className="text-xs font-semibold text-orange-600">
                    {formatCurrency(info.valorTotal, true)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-gray-700">Total</span>
            <div className="flex items-center gap-3">
              <span className="text-gray-600">{totalClientes} agendamentos</span>
              {totalValor > 0 && (
                <span className="font-bold text-orange-600">{formatCurrency(totalValor, true)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 pt-2 border-t border-gray-100 flex gap-2">
        <button
          onClick={onVoltar}
          disabled={loading}
          className="flex-shrink-0 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          ← Voltar
        </button>
        <button
          onClick={onConfirmar}
          disabled={loading || totalClientes === 0}
          className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-sky-700 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            `Criar ${totalClientes} agendamentos`
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Sheet Principal ─────────────────────────────────────────────────────────

export function PlanejarRotaSheet({ isOpen, vendedorId, onClose, onSuccess }: PlanejarRotaSheetProps) {
  const hook = usePlanejamentoRota(vendedorId)

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [rotaSelecionada, setRotaSelecionada] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [cidadeIdx, setCidadeIdx] = useState(0)
  const [decisoes, setDecisoes] = useState<Map<string, DecisaoCidade>>(new Map())
  const [planoId, setPlanoId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Carregar rotas ao abrir
  useEffect(() => {
    if (isOpen && !hook.rotasAtivas.length) {
      hook.carregarRotas()
    }
  }, [isOpen])

  // Carregar clientes ao selecionar rota + período
  useEffect(() => {
    if (!rotaSelecionada || !dataInicio) return
    const fim = dataFim || dataInicio
    hook.carregarClientesPorCidade(rotaSelecionada, dataInicio, fim)
  }, [rotaSelecionada, dataInicio, dataFim])

  const diasPeriodo = useMemo(() => {
    if (!dataInicio) return []
    const fim = dataFim || dataInicio
    const dias: string[] = []
    const cur = new Date(dataInicio + 'T00:00:00')
    const end = new Date(fim + 'T00:00:00')
    while (cur <= end) {
      const dow = cur.getDay()
      if (dow !== 0 && dow !== 6) dias.push(toDateStr(cur))
      cur.setDate(cur.getDate() + 1)
    }
    return dias
  }, [dataInicio, dataFim])

  const totaisStep0 = useMemo(() => {
    const adimplentes = hook.cidadesPlano.reduce(
      (acc, c) => acc + c.clientes.filter((cl) => SITUACAO_AUTO.includes(cl.situacao) && !cl.jaAgendado).length,
      0,
    )
    return { adimplentes, cidades: hook.cidadesPlano.length }
  }, [hook.cidadesPlano])

  function resetSheet() {
    setStep(0)
    setRotaSelecionada('')
    setDataInicio('')
    setDataFim('')
    setCidadeIdx(0)
    setDecisoes(new Map())
    setPlanoId(null)
  }

  function handleClose() {
    resetSheet()
    onClose()
  }

  function getDecisaoDefault(_cidade: string, clientes: ClientePlano[]): DecisaoCidade {
    const autosDisponiveis = new Set(
      clientes
        .filter((c) => SITUACAO_AUTO.includes(c.situacao) && !c.jaAgendado)
        .map((c) => c.codigo_cliente)
    )
    return { data: null, clientesSelecionados: autosDisponiveis, pulada: false }
  }

  function updateDecisao(cidade: string, patch: Partial<DecisaoCidade>) {
    setDecisoes((prev) => {
      const novo = new Map(prev)
      const atual = novo.get(cidade) ?? getDecisaoDefault(
        cidade,
        hook.cidadesPlano.find((c) => c.cidade === cidade)?.clientes ?? [],
      )
      novo.set(cidade, { ...atual, ...patch })
      return novo
    })
  }

  // Inicializa decisões ao entrar no step 1
  function handleIniciar() {
    const iniciais = new Map<string, DecisaoCidade>()
    hook.cidadesPlano.forEach((c) => {
      iniciais.set(c.cidade, getDecisaoDefault(c.cidade, c.clientes))
    })
    setDecisoes(iniciais)
    setCidadeIdx(0)
    setStep(1)
  }

  function handleProxima() {
    if (cidadeIdx < hook.cidadesPlano.length - 1) {
      setCidadeIdx((i) => i + 1)
    } else {
      setStep(2)
    }
  }

  function handlePular() {
    updateDecisao(hook.cidadesPlano[cidadeIdx].cidade, { data: null, pulada: true })
    if (cidadeIdx < hook.cidadesPlano.length - 1) {
      setCidadeIdx((i) => i + 1)
    } else {
      setStep(2)
    }
  }

  function handleVoltarCidade() {
    if (cidadeIdx > 0) setCidadeIdx((i) => i - 1)
    else setStep(0)
  }

  function handleAceitarSugestao(_novaInicio: string, novaFim: string) {
    setDataFim(novaFim)
    // Volta ao step 1 mostrando apenas cidades pendentes
    const pendentes = hook.cidadesPlano.filter((c) => {
      const d = decisoes.get(c.cidade)
      return !d?.data && !d?.pulada
    })
    const primeiraIdx = hook.cidadesPlano.findIndex((c) => c.cidade === pendentes[0]?.cidade)
    setCidadeIdx(primeiraIdx >= 0 ? primeiraIdx : 0)
    setStep(1)
  }

  async function handleSalvarFila() {
    await persistirPlano(false)
  }

  async function persistirPlano(confirmar: boolean) {
    const fim = dataFim || dataInicio
    const plano = await hook.criarPlano(rotaSelecionada, dataInicio, fim)
    if (!plano) return

    // Coletar todos os clientes das decisões
    const clientes: Array<{ codigoCliente: number; cidade: string; dataPrevista: string | null }> = []
    hook.cidadesPlano.forEach((c) => {
      const d = decisoes.get(c.cidade)
      if (!d || d.pulada) return
      d.clientesSelecionados.forEach((cod) => {
        clientes.push({
          codigoCliente: cod,
          cidade: c.cidade,
          dataPrevista: d.data,
        })
      })
    })

    await hook.adicionarClientes(plano.id, clientes)
    setPlanoId(plano.id)

    if (confirmar) {
      setStep(3)
    } else {
      setToast('Fila salva! Continue o planejamento depois.')
      setTimeout(() => {
        handleClose()
        onSuccess([])
      }, 1500)
    }
  }

  async function handleConfirmarFinal() {
    let id = planoId
    if (!id) {
      const fim = dataFim || dataInicio
      const plano = await hook.criarPlano(rotaSelecionada, dataInicio, fim)
      if (!plano) return
      id = plano.id

      const clientes: Array<{ codigoCliente: number; cidade: string; dataPrevista: string | null }> = []
      hook.cidadesPlano.forEach((c) => {
        const d = decisoes.get(c.cidade)
        if (!d || d.pulada) return
        d.clientesSelecionados.forEach((cod) => {
          clientes.push({ codigoCliente: cod, cidade: c.cidade, dataPrevista: d.data })
        })
      })
      await hook.adicionarClientes(id, clientes)
    }

    const resultado = await hook.confirmarPlano(id)
    const datasAgendadas = Array.from(
      new Set(
        Array.from(decisoes.values())
          .map((d) => d.data)
          .filter((d): d is string => !!d)
      )
    )

    if (resultado.falhas > 0) {
      setToast(`${resultado.criados} criados, ${resultado.falhas} falharam.`)
    } else {
      setToast(`${resultado.criados} agendamentos criados com sucesso!`)
    }

    setTimeout(() => {
      handleClose()
      onSuccess(datasAgendadas)
    }, 1500)
  }

  if (!isOpen) return null

  const stepTitles = ['Planejar Rota', 'Cidades', 'Resumo', 'Confirmar']

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl shadow-xl flex flex-col"
        style={{ maxHeight: '90vh', animation: 'slideUp 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold text-gray-800">{stepTitles[step]}</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mx-4 mt-2 rounded-lg bg-green-50 border border-green-200 p-2.5 text-xs text-green-700 font-medium">
            {toast}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {step === 0 && (
            <div className="overflow-y-auto flex-1">
              <RotaSelector
                rotasAtivas={hook.rotasAtivas}
                rotaSelecionada={rotaSelecionada}
                dataInicio={dataInicio}
                dataFim={dataFim}
                totalAdimplentes={totaisStep0.adimplentes}
                totalCidades={totaisStep0.cidades}
                loading={hook.loading}
                onRotaChange={setRotaSelecionada}
                onDataInicioChange={setDataInicio}
                onDataFimChange={setDataFim}
                onIniciar={handleIniciar}
              />
            </div>
          )}

          {step === 1 && (
            <CidadePaginator
              cidades={hook.cidadesPlano}
              cidadeIdx={cidadeIdx}
              diasPeriodo={diasPeriodo}
              decisoes={decisoes}
              onDecisaoChange={updateDecisao}
              onProxima={handleProxima}
              onPular={handlePular}
              onVoltar={handleVoltarCidade}
            />
          )}

          {step === 2 && (
            <div className="overflow-y-auto flex-1">
              <OverflowScreen
                cidades={hook.cidadesPlano}
                decisoes={decisoes}
                dataFimAtual={dataFim || dataInicio}
                onAceitarSugestao={handleAceitarSugestao}
                onSalvarFila={handleSalvarFila}
                onConfirmar={() => persistirPlano(true)}
              />
            </div>
          )}

          {step === 3 && (
            <ConfirmScreen
              rota={rotaSelecionada}
              dataInicio={dataInicio}
              dataFim={dataFim || dataInicio}
              cidades={hook.cidadesPlano}
              decisoes={decisoes}
              loading={hook.loading}
              onVoltar={() => setStep(2)}
              onConfirmar={handleConfirmarFinal}
            />
          )}
        </div>
      </div>
    </div>
  )
}
