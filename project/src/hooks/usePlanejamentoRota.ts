/**
 * Copiloto Focco Brasil
 * Hook: usePlanejamentoRota — Planejamento de rota em lote (FEAT-AG-010)
 */

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface PlanoRota {
  id: string
  vendedor_id: string
  rota: string
  data_inicio: string
  data_fim: string | null
  status: 'rascunho' | 'confirmado' | 'em_andamento' | 'concluido'
}

export interface PlanoCliente {
  id: string
  planejamento_id: string
  codigo_cliente: number
  cidade: string | null
  data_prevista: string | null
  status: 'pendente' | 'agendado' | 'pulado'
  agendamento_id: string | null
}

export interface ClientePlano {
  codigo_cliente: number
  razao_social: string
  nome_fantasia: string | null
  situacao: string
  previsao_pedido: number | null
  perfil_rfm: string | null
  dsv: number | null
  cidade: string | null
  jaAgendado: boolean
}

export interface CidadePlano {
  cidade: string
  clientes: ClientePlano[]
}

export interface PlanoIndicador {
  data: string
  rota: string
  pendentes: number
}

export interface ResultadoConfirmacao {
  criados: number
  falhas: number
  erros: string[]
}

const SITUACAO_AUTO = ['A', 'E', 'S', 'V']
const SITUACAO_MANUAL = ['P', 'B']

export { SITUACAO_AUTO, SITUACAO_MANUAL }

function nextBusinessDay(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + 1)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

function addBusinessDays(date: Date, n: number): Date {
  const d = new Date(date)
  let count = 0
  while (count < n) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) count++
  }
  return d
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

export { nextBusinessDay, addBusinessDays, toDateStr }

export function usePlanejamentoRota(vendedorId: string | undefined) {
  const [rotasAtivas, setRotasAtivas] = useState<string[]>([])
  const [cidadesPlano, setCidadesPlano] = useState<CidadePlano[]>([])
  const [planoAtual, setPlanoAtual] = useState<PlanoRota | null>(null)
  const [planosAtivos, setPlanosAtivos] = useState<PlanoIndicador[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const carregarRotas = useCallback(async (): Promise<string[]> => {
    if (!vendedorId) return []
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('vendedor_rotas')
        .select('rota')
        .eq('vendedor_id', vendedorId)
        .eq('ativo', true)
        .neq('rota', 'Sem Rota')
        .order('rota', { ascending: true })

      if (err) throw err
      const rotas = (data ?? []).map((r: any) => r.rota as string)
      setRotasAtivas(rotas)
      return rotas
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar rotas')
      return []
    } finally {
      setLoading(false)
    }
  }, [vendedorId])

  const carregarClientesPorCidade = useCallback(async (
    rota: string,
    dataInicio: string,
    dataFim: string,
  ): Promise<CidadePlano[]> => {
    if (!vendedorId) return []
    setLoading(true)
    setError(null)
    try {
      // 1. Buscar cod_vendedor do profile
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('cod_vendedor')
        .eq('id', vendedorId)
        .single()

      if (profErr || !profile) throw new Error('Perfil não encontrado')

      // 2. Buscar cidades da rota do vendedor específico
      const { data: rotaCidades, error: rotaErr } = await supabase
        .from('rotas_estado')
        .select('cidade, codigo_ibge_cidade')
        .eq('rota', rota)
        .eq('cod_vendedor', profile.cod_vendedor)
        .order('ordem', { ascending: true })

      if (rotaErr) throw rotaErr
      if (!rotaCidades?.length) return []

      const ibgeCodes = rotaCidades.map((c: any) => c.codigo_ibge_cidade)

      // 3. Buscar clientes nessas cidades
      const { data: clientes, error: clientesErr } = await supabase
        .from('tabela_clientes')
        .select(`
          codigo_cliente, razao_social, nome_fantasia, cidade, situacao,
          analise_rfm!left(previsao_pedido, perfil, dias_sem_comprar)
        `)
        .eq('cod_vendedor', profile.cod_vendedor)
        .in('codigo_ibge_cidade', ibgeCodes)
        .not('situacao', 'in', '("I","B")')

      if (clientesErr) throw clientesErr

      // 4. Buscar agendamentos pendentes no período para marcar "já agendado"
      const { data: agsPeriodo } = await supabase
        .from('agendamentos')
        .select('codigo_cliente')
        .eq('vendedor_id', vendedorId)
        .eq('status', 'pendente')
        .gte('data_agendada', dataInicio)
        .lte('data_agendada', dataFim)

      const jaAgendadosSet = new Set(
        (agsPeriodo ?? []).map((a: any) => a.codigo_cliente as number)
      )

      // 5. Agrupar por cidade na ordem das rotas_estado
      const cidadeOrdem = new Map(
        rotaCidades.map((rc: any, idx: number) => [rc.cidade, idx])
      )

      const cidadesMap = new Map<string, ClientePlano[]>()
      ;(clientes ?? []).forEach((c: any) => {
        const rfm = Array.isArray(c.analise_rfm) ? c.analise_rfm[0] : c.analise_rfm
        const cidade = c.cidade || 'Sem cidade'
        if (!cidadesMap.has(cidade)) cidadesMap.set(cidade, [])
        cidadesMap.get(cidade)!.push({
          codigo_cliente: c.codigo_cliente,
          razao_social: c.razao_social || '',
          nome_fantasia: c.nome_fantasia || null,
          situacao: c.situacao || '',
          previsao_pedido: rfm?.previsao_pedido ?? null,
          perfil_rfm: rfm?.perfil ?? null,
          dsv: rfm?.dias_sem_comprar ?? null,
          cidade,
          jaAgendado: jaAgendadosSet.has(c.codigo_cliente),
        })
      })

      const resultado: CidadePlano[] = Array.from(cidadesMap.entries())
        .sort((a, b) => {
          const oa = cidadeOrdem.get(a[0]) ?? 999
          const ob = cidadeOrdem.get(b[0]) ?? 999
          return oa - ob
        })
        .map(([cidade, clientesList]) => ({
          cidade,
          clientes: clientesList.sort((a, b) =>
            (b.previsao_pedido ?? 0) - (a.previsao_pedido ?? 0)
          ),
        }))

      setCidadesPlano(resultado)
      return resultado
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes')
      return []
    } finally {
      setLoading(false)
    }
  }, [vendedorId])

  const criarPlano = useCallback(async (
    rota: string,
    dataInicio: string,
    dataFim?: string | null,
  ): Promise<PlanoRota | null> => {
    if (!vendedorId) return null
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('planejamentos_rota')
        .insert({
          vendedor_id: vendedorId,
          rota,
          data_inicio: dataInicio,
          data_fim: dataFim ?? null,
          status: 'rascunho',
        })
        .select()
        .single()

      if (err) throw err
      const plano = data as PlanoRota
      setPlanoAtual(plano)
      return plano
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar plano')
      return null
    } finally {
      setLoading(false)
    }
  }, [vendedorId])

  const adicionarClientes = useCallback(async (
    planejamentoId: string,
    clientes: Array<{ codigoCliente: number; cidade: string; dataPrevista: string | null }>,
  ): Promise<boolean> => {
    if (!clientes.length) return true
    try {
      const rows = clientes.map((c) => ({
        planejamento_id: planejamentoId,
        codigo_cliente: c.codigoCliente,
        cidade: c.cidade,
        data_prevista: c.dataPrevista,
        status: 'pendente',
      }))

      const { error: err } = await supabase
        .from('planejamento_clientes')
        .insert(rows)

      if (err) throw err
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar clientes')
      return false
    }
  }, [])

  const confirmarPlano = useCallback(async (
    planejamentoId: string,
  ): Promise<ResultadoConfirmacao> => {
    setLoading(true)
    setError(null)
    const resultado: ResultadoConfirmacao = { criados: 0, falhas: 0, erros: [] }
    try {
      // 1. Buscar clientes com data_prevista definida
      const { data: pendentes, error: fetchErr } = await supabase
        .from('planejamento_clientes')
        .select('id, codigo_cliente, data_prevista')
        .eq('planejamento_id', planejamentoId)
        .eq('status', 'pendente')
        .not('data_prevista', 'is', null)

      if (fetchErr) throw fetchErr
      if (!pendentes?.length) return resultado

      // 2. Criar agendamentos em batch (tolerante a falhas parciais)
      const inserts = await Promise.allSettled(
        pendentes.map((pc: any) =>
          supabase
            .from('agendamentos')
            .insert({
              vendedor_id: vendedorId,
              codigo_cliente: pc.codigo_cliente,
              data_agendada: pc.data_prevista,
              status: 'pendente',
            })
            .select('id')
            .single()
        )
      )

      // 3. Atualizar planejamento_clientes com agendamento_id para os bem-sucedidos
      const atualizacoes: Promise<void>[] = []
      inserts.forEach((res, idx) => {
        if (res.status === 'fulfilled' && !res.value.error) {
          resultado.criados++
          const agId = res.value.data?.id
          if (agId) {
            atualizacoes.push(
              Promise.resolve(
                supabase
                  .from('planejamento_clientes')
                  .update({ status: 'agendado', agendamento_id: agId })
                  .eq('id', pendentes[idx].id)
              ).then(() => {})
            )
          }
        } else {
          resultado.falhas++
          const msg = res.status === 'rejected'
            ? String(res.reason)
            : res.value.error?.message ?? 'Erro desconhecido'
          resultado.erros.push(`Cliente ${pendentes[idx].codigo_cliente}: ${msg}`)
        }
      })

      await Promise.allSettled(atualizacoes)

      // 4. Atualizar status do plano
      await supabase
        .from('planejamentos_rota')
        .update({ status: 'confirmado' })
        .eq('id', planejamentoId)

      return resultado
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar plano')
      return resultado
    } finally {
      setLoading(false)
    }
  }, [vendedorId])

  const buscarPlanosAtivos = useCallback(async (): Promise<PlanoIndicador[]> => {
    if (!vendedorId) return []
    try {
      const { data, error: err } = await supabase
        .from('planejamentos_rota')
        .select(`
          rota,
          planejamento_clientes!inner(data_prevista, status)
        `)
        .eq('vendedor_id', vendedorId)
        .not('status', 'eq', 'concluido')

      if (err) throw err

      const indicadores: PlanoIndicador[] = []
      ;(data ?? []).forEach((plano: any) => {
        const clientes = Array.isArray(plano.planejamento_clientes)
          ? plano.planejamento_clientes
          : []
        const porData = new Map<string, number>()
        let pendentes = 0

        clientes.forEach((pc: any) => {
          if (pc.data_prevista) {
            porData.set(pc.data_prevista, (porData.get(pc.data_prevista) ?? 0) + 1)
          } else if (pc.status === 'pendente') {
            pendentes++
          }
        })

        porData.forEach((_, data) => {
          indicadores.push({ data, rota: plano.rota, pendentes })
        })
      })

      setPlanosAtivos(indicadores)
      return indicadores
    } catch {
      return []
    }
  }, [vendedorId])

  return {
    rotasAtivas,
    cidadesPlano,
    planoAtual,
    planosAtivos,
    loading,
    error,
    carregarRotas,
    carregarClientesPorCidade,
    criarPlano,
    adicionarClientes,
    confirmarPlano,
    buscarPlanosAtivos,
  }
}
