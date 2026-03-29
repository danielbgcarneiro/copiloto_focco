/**
 * Copiloto Focco Brasil
 * Hook: useSugestoesAgenda — sugestões de clientes prioritários para a semana (Story 3.9)
 *
 * Lógica:
 *  1. Busca cod_vendedor de profiles
 *  2. Busca pesos e prazo de configuracoes_agenda (defaults: 0.5/0.3/0.2, 60 dias)
 *  3. Busca clientes da carteira com analise_rfm
 *  4. Filtra: DSV > prazo configurado
 *  5. Exclui clientes com agendamento pendente na semana
 *  6. Busca última visita por cliente
 *  7. Calcula score e ordena; retorna top 20
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

export function useSugestoesAgenda(vendedorId: string | undefined) {
  const [sugestoes, setSugestoes] = useState<ClienteSugerido[]>([])
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
          return
        }

        // 2. Pesos e prazo de configuracoes_agenda
        const { data: config } = await supabase
          .from('configuracoes_agenda')
          .select(
            'score_peso_oportunidade, score_peso_dsv, score_peso_historico, prazo_alerta_amarelo_dias'
          )
          .maybeSingle()

        const pesos: ScorePesos = {
          oportunidade: config?.score_peso_oportunidade ?? PESOS_DEFAULT.oportunidade,
          dsv: config?.score_peso_dsv ?? PESOS_DEFAULT.dsv,
          historico: config?.score_peso_historico ?? PESOS_DEFAULT.historico,
        }
        const prazo: number = config?.prazo_alerta_amarelo_dias ?? 60

        // 3. Clientes da carteira com analise_rfm
        const { data: clientesRaw } = await supabase
          .from('tabela_clientes')
          .select(`
            codigo_cliente, nome_fantasia, razao_social, cidade,
            analise_rfm!left(perfil, previsao_pedido, dias_sem_comprar)
          `)
          .eq('cod_vendedor', codVendedor)

        if (!clientesRaw || clientesRaw.length === 0) {
          setSugestoes([])
          return
        }

        // 4. Filtrar apenas clientes com DSV > prazo
        type ClienteRaw = {
          codigo_cliente: number
          nome_fantasia: string | null
          razao_social: string
          cidade: string | null
          analise_rfm:
            | { perfil: string | null; previsao_pedido: number | null; dias_sem_comprar: number | null }
            | { perfil: string | null; previsao_pedido: number | null; dias_sem_comprar: number | null }[]
            | null
        }

        const clientesFiltrados = (clientesRaw as ClienteRaw[]).filter((c) => {
          const rfm = Array.isArray(c.analise_rfm) ? c.analise_rfm[0] : c.analise_rfm
          return rfm != null && (rfm.dias_sem_comprar ?? 0) > prazo
        })

        if (clientesFiltrados.length === 0) {
          setSugestoes([])
          return
        }

        const codigos = clientesFiltrados
          .map((c) => c.codigo_cliente)
          .filter((id): id is number => id != null)

        // 5. Agendamentos pendentes desta semana (para excluir)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)

        const { data: agendamentos } = await supabase
          .from('agendamentos')
          .select('codigo_cliente')
          .eq('vendedor_id', vendedorId)
          .eq('status', 'pendente')
          .gte('data_agendada', formatDate(weekStart))
          .lte('data_agendada', formatDate(weekEnd))
          .in('codigo_cliente', codigos)

        const agendados = new Set<number>(
          (agendamentos ?? []).map((a: { codigo_cliente: number }) => a.codigo_cliente)
        )

        // 6. Última visita por cliente (resultado)
        const { data: visitas } = await supabase
          .from('visitas')
          .select('codigo_cliente, resultado')
          .eq('vendedor_id', vendedorId)
          .in('codigo_cliente', codigos)
          .order('data_visita', { ascending: false })

        const ultimaVisitaMap = new Map<number, string>()
        for (const v of (visitas ?? []) as { codigo_cliente: number; resultado: string }[]) {
          if (!ultimaVisitaMap.has(v.codigo_cliente)) {
            ultimaVisitaMap.set(v.codigo_cliente, v.resultado)
          }
        }

        // 7. Montar ClienteRFM (excluindo os com agendamento pendente)
        const clientesRFM: ClienteRFM[] = []
        for (const c of clientesFiltrados) {
          if (agendados.has(c.codigo_cliente)) continue
          const rfm = Array.isArray(c.analise_rfm) ? c.analise_rfm[0] : c.analise_rfm
          if (!rfm) continue
          clientesRFM.push({
            codigo_cliente: c.codigo_cliente,
            nome_fantasia: c.nome_fantasia,
            razao_social: c.razao_social,
            cidade: c.cidade,
            perfil_rfm: rfm.perfil ?? null,
            previsao_pedido: rfm.previsao_pedido ?? 0,
            dias_sem_comprar: rfm.dias_sem_comprar ?? 0,
            resultado_ultima_visita: ultimaVisitaMap.get(c.codigo_cliente) ?? null,
          })
        }

        // 8. Score + ordenação
        const maxOportunidade = clientesRFM.reduce(
          (max, c) => (c.previsao_pedido > max ? c.previsao_pedido : max),
          0
        )

        const comScore: ClienteSugerido[] = clientesRFM.map((c) => ({
          ...c,
          score: calcularScoreCliente(c, maxOportunidade, pesos),
        }))

        setSugestoes(ordenarPorScore(comScore).slice(0, 20))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar sugestões')
      } finally {
        setLoading(false)
      }
    },
    [vendedorId]
  )

  return { sugestoes, loading, error, carregar }
}
