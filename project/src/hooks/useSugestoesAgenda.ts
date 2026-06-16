/**
 * Copiloto Focco Brasil
 * Hook: useSugestoesAgenda — sugestões de clientes prioritários (Story 3.9 / Story 006 AC-1)
 *
 * Retorna:
 *  - sugestoes: lista plana (top 20 por score) — usada para o badge de contagem na Agenda
 *  - rotasSugestoes: hierarquia rota → cidade → clientes (top 2 rotas, top 10 cidades, top 20 clientes)
 */

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  ClienteRFM,
  ScorePesos,
  PESOS_DEFAULT,
  calcularScoreCliente,
  ordenarPorScore,
} from '../utils/scoreCliente'
import { formatDate } from './useAgenda'

export interface ClienteSugerido extends ClienteRFM {
  score: number
}

export interface ClienteSugeridoHierarquia extends ClienteSugerido {
  agendado: boolean
}

export interface CidadeSugestao {
  cidade: string
  somaOportunidade: number
  clientes: ClienteSugeridoHierarquia[]
}

export interface RotaSugestao {
  rota: string
  somaOportunidade: number
  cidades: CidadeSugestao[]
}

type RfmData = { perfil: string | null; previsao_pedido: number | null; dias_sem_comprar: number | null }

type ClienteRaw = {
  codigo_cliente: number
  nome_fantasia: string | null
  razao_social: string
  cidade: string | null
  codigo_ibge_cidade: string | null
  analise_rfm: RfmData | RfmData[] | null
}

// ─── helpers puros (extraídos de carregar) ────────────────────────────────────

/** analise_rfm pode vir como objeto ou array (join) — normaliza para 1 registro. */
function extractRfm(c: ClienteRaw): RfmData | null {
  return Array.isArray(c.analise_rfm) ? c.analise_rfm[0] : c.analise_rfm
}

/** Pesos de score + prazo a partir das linhas de configuracoes_agenda. */
function parseConfig(configRows: { chave: string; valor: unknown }[] | null): { pesos: ScorePesos; prazo: number } {
  const configMap = (configRows ?? []).reduce<Record<string, number>>(
    (acc, row) => ({ ...acc, [row.chave]: Number(row.valor) }),
    {}
  )
  const pesos: ScorePesos = {
    oportunidade: configMap['score_peso_oportunidade'] ?? PESOS_DEFAULT.oportunidade,
    dsv: configMap['score_peso_dsv'] ?? PESOS_DEFAULT.dsv,
    historico: configMap['score_peso_historico'] ?? PESOS_DEFAULT.historico,
  }
  const prazo: number = configMap['prazo_alerta_amarelo_dias'] ?? 60
  return { pesos, prazo }
}

/** Mapa codigo_cliente → resultado da última visita (lista já vem ordenada desc). */
function buildUltimaVisitaMap(visitas: { codigo_cliente: number; resultado: string }[] | null): Map<number, string> {
  const map = new Map<number, string>()
  for (const v of visitas ?? []) {
    if (!map.has(v.codigo_cliente)) map.set(v.codigo_cliente, v.resultado)
  }
  return map
}

/** Mapa codigo_ibge_cidade → rota, para as rotas ativas do vendedor. */
async function buildCidadeRotaMap(rotasAtivas: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (rotasAtivas.length === 0) return map
  const { data: rotasEstado } = await supabase
    .from('rotas_estado')
    .select('codigo_ibge_cidade, rota')
    .in('rota', rotasAtivas)
  for (const re of rotasEstado ?? []) {
    if (re.codigo_ibge_cidade) map.set(re.codigo_ibge_cidade, re.rota)
  }
  return map
}

/** Maior previsão de pedido da carteira (normaliza o score). */
function maxOportunidadeDe(clientes: ClienteRaw[]): number {
  return clientes.reduce((max, c) => {
    const rfm = extractRfm(c)
    return Math.max(max, rfm?.previsao_pedido ?? 0)
  }, 0)
}

function toClienteRFM(c: ClienteRaw, rfm: RfmData, ultimaVisitaMap: Map<number, string>): ClienteRFM {
  return {
    codigo_cliente: c.codigo_cliente,
    nome_fantasia: c.nome_fantasia,
    razao_social: c.razao_social,
    cidade: c.cidade,
    perfil_rfm: rfm.perfil ?? null,
    previsao_pedido: rfm.previsao_pedido ?? 0,
    dias_sem_comprar: rfm.dias_sem_comprar ?? 0,
    resultado_ultima_visita: ultimaVisitaMap.get(c.codigo_cliente) ?? null,
  }
}

/** 7a — lista plana: DSV > prazo, excluindo agendados, top 20 por score. */
function buildFlatSuggestions(
  clientes: ClienteRaw[], agendados: Set<number>, ultimaVisitaMap: Map<number, string>,
  maxOportunidade: number, pesos: ScorePesos, prazo: number,
): ClienteSugerido[] {
  const clientesFiltradosDSV = clientes.filter((c) => {
    const rfm = extractRfm(c)
    return rfm != null && (rfm.dias_sem_comprar ?? 0) > prazo
  })

  const clientesRFM: ClienteRFM[] = []
  for (const c of clientesFiltradosDSV) {
    if (agendados.has(c.codigo_cliente)) continue
    const rfm = extractRfm(c)
    if (!rfm) continue
    clientesRFM.push(toClienteRFM(c, rfm, ultimaVisitaMap))
  }

  const comScore: ClienteSugerido[] = clientesRFM.map((c) => ({
    ...c,
    score: calcularScoreCliente(c, maxOportunidade, pesos),
  }))

  return ordenarPorScore(comScore).slice(0, 20)
}

/** 7b — hierarquia rota → cidade → clientes (oportunidade > 0); top 2/10/20. */
function buildHierarchy(
  clientes: ClienteRaw[], cidadeRotaMap: Map<string, string>, agendados: Set<number>,
  ultimaVisitaMap: Map<number, string>, maxOportunidade: number, pesos: ScorePesos,
): RotaSugestao[] {
  const rotaMap = new Map<string, {
    somaOportunidade: number
    cidades: Map<string, { somaOportunidade: number; clientes: ClienteSugeridoHierarquia[] }>
  }>()

  for (const c of clientes) {
    const rfm = extractRfm(c)
    if (!rfm || !rfm.previsao_pedido || rfm.previsao_pedido <= 0) continue
    if (!c.codigo_ibge_cidade) continue

    const rota = cidadeRotaMap.get(c.codigo_ibge_cidade)
    if (!rota) continue

    const cidade = c.cidade ?? 'Sem cidade'

    if (!rotaMap.has(rota)) {
      rotaMap.set(rota, { somaOportunidade: 0, cidades: new Map() })
    }
    const rotaData = rotaMap.get(rota)!

    if (!rotaData.cidades.has(cidade)) {
      rotaData.cidades.set(cidade, { somaOportunidade: 0, clientes: [] })
    }
    const cidadeData = rotaData.cidades.get(cidade)!

    const clienteRFM = toClienteRFM(c, rfm, ultimaVisitaMap)
    cidadeData.somaOportunidade += rfm.previsao_pedido
    rotaData.somaOportunidade += rfm.previsao_pedido

    cidadeData.clientes.push({
      ...clienteRFM,
      score: calcularScoreCliente(clienteRFM, maxOportunidade, pesos),
      agendado: agendados.has(c.codigo_cliente),
    })
  }

  return Array.from(rotaMap.entries())
    .map(([rota, data]) => ({
      rota,
      somaOportunidade: data.somaOportunidade,
      cidades: Array.from(data.cidades.entries())
        .map(([cidade, cData]) => ({
          cidade,
          somaOportunidade: cData.somaOportunidade,
          clientes: [...cData.clientes]
            .sort((a, b) => b.previsao_pedido - a.previsao_pedido)
            .slice(0, 20),
        }))
        .sort((a, b) => b.somaOportunidade - a.somaOportunidade)
        .slice(0, 10),
    }))
    .sort((a, b) => b.somaOportunidade - a.somaOportunidade)
    .slice(0, 2)
}

export function useSugestoesAgenda(vendedorId: string | undefined) {
  const [sugestoes, setSugestoes] = useState<ClienteSugerido[]>([])
  const [rotasSugestoes, setRotasSugestoes] = useState<RotaSugestao[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(
    async (weekStart: Date) => {
      if (!vendedorId) return
      setLoading(true)
      setError(null)

      try {
        // 1. cod_vendedor do vendedor logado
        const { data: profile } = await supabase
          .from('profiles')
          .select('cod_vendedor')
          .eq('id', vendedorId)
          .single()

        const codVendedor = profile?.cod_vendedor
        if (!codVendedor) {
          setSugestoes([])
          setRotasSugestoes([])
          return
        }

        // 2. Pesos e prazo de configuracoes_agenda
        const { data: configRows } = await supabase
          .from('configuracoes_agenda')
          .select('chave, valor')
          .in('chave', ['score_peso_oportunidade', 'score_peso_dsv', 'score_peso_historico', 'prazo_alerta_amarelo_dias'])
        const { pesos, prazo } = parseConfig(configRows)

        // 3. Clientes da carteira com analise_rfm + codigo_ibge_cidade para mapping de rota
        const { data: clientesRaw } = await supabase
          .from('tabela_clientes')
          .select(`
            codigo_cliente, nome_fantasia, razao_social, cidade, codigo_ibge_cidade,
            analise_rfm!left(perfil, previsao_pedido, dias_sem_comprar)
          `)
          .eq('cod_vendedor', codVendedor)
          .not('situacao', 'in', '("I","B")')

        if (!clientesRaw || clientesRaw.length === 0) {
          setSugestoes([])
          setRotasSugestoes([])
          return
        }
        const clientes = clientesRaw as ClienteRaw[]

        // 4. Agendamentos pendentes desta semana (para excluir dos sugestoes e marcar badge)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)

        const allCodes = clientes
          .map((c) => c.codigo_cliente)
          .filter((id): id is number => id != null)

        const { data: agendamentos } = await supabase
          .from('agendamentos')
          .select('codigo_cliente')
          .eq('vendedor_id', vendedorId)
          .eq('status', 'pendente')
          .gte('data_agendada', formatDate(weekStart))
          .lte('data_agendada', formatDate(weekEnd))
          .in('codigo_cliente', allCodes)

        const agendados = new Set<number>(
          (agendamentos ?? []).map((a: { codigo_cliente: number }) => a.codigo_cliente)
        )

        // 5. Última visita por cliente
        const { data: visitas } = await supabase
          .from('visitas')
          .select('codigo_cliente, resultado')
          .eq('vendedor_id', vendedorId)
          .in('codigo_cliente', allCodes)
          .order('data_visita', { ascending: false })

        const ultimaVisitaMap = buildUltimaVisitaMap(
          visitas as { codigo_cliente: number; resultado: string }[] | null
        )

        // 6. Rotas ativas do vendedor + mapeamento cidade → rota
        const { data: rotasVendedor } = await supabase
          .from('vendedor_rotas')
          .select('rota')
          .eq('vendedor_id', vendedorId)
          .eq('ativo', true)

        const rotasAtivas = (rotasVendedor ?? []).map((r: { rota: string }) => r.rota)
        const cidadeRotaMap = await buildCidadeRotaMap(rotasAtivas)

        // 7. Score base + listas (plana e hierárquica)
        const maxOportunidade = maxOportunidadeDe(clientes)
        setSugestoes(buildFlatSuggestions(clientes, agendados, ultimaVisitaMap, maxOportunidade, pesos, prazo))
        setRotasSugestoes(buildHierarchy(clientes, cidadeRotaMap, agendados, ultimaVisitaMap, maxOportunidade, pesos))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar sugestões')
      } finally {
        setLoading(false)
      }
    },
    [vendedorId]
  )

  return { sugestoes, rotasSugestoes, loading, error, carregar }
}
