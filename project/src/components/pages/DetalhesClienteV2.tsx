/**
 * Copiloto Focco Brasil
 * DetalhesClienteV2 — página principal de detalhes do cliente
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 *
 * Melhorias vs V1 (DetalhesCliente.tsx — mantido como backup em /detalhes-v2):
 * 1. Layout mobile-first sem max-w-4xl (alinhado com Clientes.tsx)
 * 2. Oportunidade + ação recomendada em banner laranja
 * 3. Barra de progresso visual para meta
 * 4. Contatos unificados via TelefoneCard (sem botões legados)
 * 5. MÚLTIPLOS agendamentos futuros — lista completa + "+ Novo" sempre disponível
 * 6. Total de títulos abertos no header da seção
 * 7. Estética consistente com Clientes (shadow-md, fontes, espaçamentos)
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getClienteDetalhes } from '../../lib/queries/cliente'
import { getHistoricoVisitas } from '../../lib/queries/clientes'
import { getClienteInadimplenteDetalhes, ClienteInadimplente } from '../../lib/queries/inadimplentes'
import { getTitulosClienteDetalhes, TituloAbertoDetalhes } from '../../lib/queries/titulos'
import { formatCurrency } from '../../utils'
import { useSetPage } from '../../contexts'
import { useVisitas, Agendamento } from '../../hooks/useVisitas'
import { useTelefones } from '../../hooks/useTelefones'
import { useConfiguracoes } from '../../hooks/useConfiguracoes'
import { supabase } from '../../lib/supabase'
import {
  RegistrarVisitaSheet,
  AgendarVisitaSheet,
  AdicionarTelefoneSheet,
} from '../molecules'
import { TabelaMarcas } from '../molecules/TabelaMarcas'
import {
  SectionHeader,
  Breadcrumb,
  ClienteHeaderCard,
  FinanceiroSection,
  VisitasSection,
  ContatosSection,
  MixCategoriaTable,
  TitulosAbertosSection,
  HistoricoVisitasSection,
  getStatusInadimplenciaColors,
  processarMetricasCategoria,
  mapClienteView,
} from './DetalhesClienteV2.sections'

// ─── componente ─────────────────────────────────────────────────────────────

const DetalhesClienteV2: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  useSetPage('Detalhes do Cliente', () => navigate(-1))
  const config = useConfiguracoes()
  const { id, rotaId, cidadeNome, clienteId } = useParams<{
    id?: string; rotaId?: string; cidadeNome?: string; clienteId?: string
  }>()

  const [cliente,          setCliente]          = useState<any>(null)
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState<string | null>(null)
  const [historicoVisitas, setHistoricoVisitas] = useState<any[]>([])
  const [loadingVisitas,   setLoadingVisitas]   = useState(false)
  const [inadimplenciaData,setInadimplenciaData]= useState<ClienteInadimplente | null>(null)
  const [titulosData,      setTitulosData]      = useState<TituloAbertoDetalhes[]>([])
  const [loadingTitulos,   setLoadingTitulos]   = useState(false)

  // Múltiplos agendamentos futuros — query própria (não usa .limit(1) do hook)
  const [agendamentosFuturos,   setAgendamentosFuturos]   = useState<Agendamento[]>([])
  const [loadingAgendamentos,   setLoadingAgendamentos]   = useState(false)
  const [cancelandoId,          setCancelandoId]          = useState<string | null>(null)

  // Sheets
  const [showSheet,                  setShowSheet]                  = useState(false)
  const [showAgendarSheet,           setShowAgendarSheet]           = useState(false)
  const [agendamentoEditando,        setAgendamentoEditando]        = useState<Agendamento | null>(null)
  const [showAdicionarTelefoneSheet, setShowAdicionarTelefoneSheet]= useState(false)

  const codigoCliente         = clienteId || id
  const codigoClienteNumerico = codigoCliente ? parseInt(codigoCliente) : 0
  const rotaNome              = rotaId    ? decodeURIComponent(rotaId)    : null
  const cidadeDecodificada    = cidadeNome ? decodeURIComponent(cidadeNome) : null

  const voltarParaClientes = () => {
    if (rotaNome && cidadeDecodificada) {
      navigate(`/rotas/${encodeURIComponent(rotaNome)}/cidades/${encodeURIComponent(cidadeDecodificada)}/clientes`)
    } else {
      navigate('/clientes')
    }
  }

  const {
    visitaHoje, motivos, loading: loadingVisita, loadingMotivos,
    registrarVisita, criarAgendamento, editarAgendamento, cancelarAgendamento,
    carregarMotivos, refresh: refreshVisitaHoje,
  } = useVisitas(codigoClienteNumerico)

  const {
    telefones, loading: loadingTelefones, userId: currentUserId,
    adicionarTelefone, desativarTelefone,
  } = useTelefones(codigoClienteNumerico)

  // ── agendamentos futuros (todos, não só o próximo) ────────────────────────
  const carregarAgendamentosFuturos = useCallback(async (clienteId: number) => {
    if (!clienteId) return
    setLoadingAgendamentos(true)
    try {
      const hoje = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('codigo_cliente', clienteId)
        .eq('status', 'pendente')
        .gte('data_agendada', hoje)
        .order('data_agendada', { ascending: true })
      if (error) throw error
      setAgendamentosFuturos((data ?? []) as Agendamento[])
    } catch {
      // não crítico
    } finally {
      setLoadingAgendamentos(false)
    }
  }, [])

  const handleCancelarAgendamento = async (id: string) => {
    setCancelandoId(id)
    try {
      await cancelarAgendamento(id)
      await carregarAgendamentosFuturos(codigoClienteNumerico)
    } finally {
      setCancelandoId(null)
    }
  }

  // ── carregamento principal ────────────────────────────────────────────────

  async function carregarHistoricoVisitas(id: number) {
    try { setLoadingVisitas(true); setHistoricoVisitas(await getHistoricoVisitas(id)) }
    catch { /* não crítico */ }
    finally { setLoadingVisitas(false) }
  }

  async function carregarInadimplencia(id: number) {
    try { setInadimplenciaData(await getClienteInadimplenteDetalhes(id)) }
    catch { /* não crítico */ }
  }

  async function carregarTitulos(id: number) {
    try { setLoadingTitulos(true); setTitulosData(await getTitulosClienteDetalhes(id)) }
    catch { /* não crítico */ }
    finally { setLoadingTitulos(false) }
  }

  useEffect(() => {
    async function init() {
      if (!codigoCliente) { setError('ID do cliente não fornecido.'); setLoading(false); return }
      const n = parseInt(codigoCliente)
      if (isNaN(n))       { setError('ID inválido.'); setLoading(false); return }
      try {
        setLoading(true)
        setCliente(await getClienteDetalhes(n))
        await Promise.all([
          carregarHistoricoVisitas(n),
          carregarInadimplencia(n),
          carregarTitulos(n),
          carregarAgendamentosFuturos(n),
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [codigoCliente, carregarAgendamentosFuturos])

  // ── estados de loading / erro ──────────────────────────────────────────────

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      <p className="text-sm text-gray-500">Carregando dados do cliente…</p>
    </div>
  )

  if (error) return (
    <div className="px-4 py-8 text-center max-w-sm mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
        <pre className="text-red-600 text-xs text-left whitespace-pre-wrap">{error}</pre>
      </div>
      <button onClick={voltarParaClientes} className="bg-primary text-white text-sm px-4 py-2 rounded-lg">Voltar</button>
    </div>
  )

  if (!cliente) return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm text-gray-500 mb-4">Cliente não encontrado</p>
      <button onClick={voltarParaClientes} className="bg-primary text-white text-sm px-4 py-2 rounded-lg">Voltar</button>
    </div>
  )

  // ── dados mapeados ─────────────────────────────────────────────────────────

  const anoAtual   = new Date().getFullYear()
  const anoAnterior = anoAtual - 1

  const d = mapClienteView(cliente)

  const metricasCategoria = processarMetricasCategoria(cliente)
  const inadStatus  = getStatusInadimplenciaColors(inadimplenciaData !== null, inadimplenciaData?.maior_dias_atraso)
  const progresso   = Math.min(100, Math.max(0, d.percentualMeta))
  const totalTitulos = titulosData.reduce((s, t) => s + t.valor_titulo, 0)

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-4 space-y-3">

      <Breadcrumb rotaNome={rotaNome} cidadeDecodificada={cidadeDecodificada} nome={d.nome} />

      {/* ── Card principal ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">

        <ClienteHeaderCard d={d} perfil={cliente.perfil} inadStatus={inadStatus} />

        {/* ── 2a. AÇÃO RECOMENDADA ────────────────────────────────────────────── */}
        {d.acaoRecomendada && (
          <div className="bg-blue-50 border-t-2 border-blue-200 px-4 py-2.5 flex items-center gap-2">
            <span className="text-blue-500 shrink-0 text-sm">💡</span>
            <span className="text-xs text-blue-800 font-semibold">{d.acaoRecomendada}</span>
          </div>
        )}

        {/* ── 2. OPORTUNIDADE BANNER ─────────────────────────────────────────── */}
        <div className="bg-orange-500 px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-white shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-white font-bold text-sm">
              Oportunidade: {formatCurrency(d.oportunidade)}
            </span>
          </div>
        </div>

        <FinanceiroSection d={d} anoAtual={anoAtual} anoAnterior={anoAnterior} progresso={progresso} />

        {/* ── 3b. VENDAS POR MARCA ───────────────────────────────────────────── */}
        <SectionHeader label="Vendas por Marca" />
        <div className="px-4 py-3">
          <TabelaMarcas
            modo="completo"
            ob={{ valor: d.valorObAnoAtual, pecas: d.pecasObAnoAtual }}
            pw={{ valor: d.valorPwAnoAtual, pecas: d.pecasPwAnoAtual }}
            core={{ valor: d.valorCoreAnoAtual, pecas: d.pecasCoreAnoAtual }}
            objObPw={d.meta}
            objCorePecas={d.metaCorePecas}
            atingimento={d.percentualMeta}
          />
        </div>

        {/* ── 4. VISITAS ─────────────────────────────────────────────────────── */}
        {user && codigoClienteNumerico > 0 && (
          <VisitasSection
            loadingVisita={loadingVisita}
            visitaHoje={visitaHoje}
            agendamentosFuturos={agendamentosFuturos}
            loadingAgendamentos={loadingAgendamentos}
            cancelandoId={cancelandoId}
            dsv={d.dsv}
            prazoAlertaDias={config.prazo_alerta_amarelo_dias}
            onRegistrar={() => setShowSheet(true)}
            onAgendarNovo={() => { setAgendamentoEditando(null); setShowAgendarSheet(true) }}
            onEditarAgendamento={(ag) => { setAgendamentoEditando(ag); setShowAgendarSheet(true) }}
            onCancelarAgendamento={handleCancelarAgendamento}
          />
        )}

        <ContatosSection
          loadingTelefones={loadingTelefones}
          telefones={telefones}
          currentUserId={currentUserId}
          onAdicionar={() => setShowAdicionarTelefoneSheet(true)}
          onDesativar={desativarTelefone}
        />

        <MixCategoriaTable metricasCategoria={metricasCategoria} />

        <TitulosAbertosSection
          loadingTitulos={loadingTitulos}
          titulosData={titulosData}
          totalTitulos={totalTitulos}
        />

        <HistoricoVisitasSection
          loadingVisitas={loadingVisitas}
          historicoVisitas={historicoVisitas}
        />

      </div>{/* /card principal */}

      {/* ── Bottom Sheets ───────────────────────────────────────────────────── */}
      {user && (
        <>
          <RegistrarVisitaSheet
            isOpen={showSheet}
            onClose={() => setShowSheet(false)}
            onSuccess={() => {
              setShowSheet(false)
              refreshVisitaHoje()
              carregarHistoricoVisitas(codigoClienteNumerico)
            }}
            codigoCliente={codigoClienteNumerico}
            vendedorId={user.id}
            rfmPerfil={cliente?.perfil ?? null}
            rfmOportunidade={cliente?.previsao_pedido ?? null}
            rfmDsv={cliente?.dias_sem_comprar ?? null}
            motivos={motivos}
            loadingMotivos={loadingMotivos}
            carregarMotivos={carregarMotivos}
            registrarVisita={registrarVisita}
          />

          <AdicionarTelefoneSheet
            isOpen={showAdicionarTelefoneSheet}
            codigoCliente={codigoClienteNumerico}
            onClose={() => setShowAdicionarTelefoneSheet(false)}
            onSuccess={() => setShowAdicionarTelefoneSheet(false)}
            adicionarTelefone={adicionarTelefone}
          />

          {/* AgendarVisitaSheet — cria novo ou edita o selecionado */}
          <AgendarVisitaSheet
            isOpen={showAgendarSheet}
            onClose={() => { setShowAgendarSheet(false); setAgendamentoEditando(null) }}
            onSuccess={() => {
              setShowAgendarSheet(false)
              setAgendamentoEditando(null)
              carregarAgendamentosFuturos(codigoClienteNumerico)
            }}
            codigoCliente={codigoClienteNumerico}
            vendedorId={user.id}
            agendamentoExistente={agendamentoEditando}
            criarAgendamento={criarAgendamento}
            editarAgendamento={editarAgendamento}
          />
        </>
      )}

    </div>
  )
}

export default DetalhesClienteV2
