/**
 * Copiloto Focco Brasil
 * Hook: useBuscaCliente — busca de clientes da carteira do vendedor (Story 3.8)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export interface ClienteBusca {
  codigo_cliente: number
  nome_fantasia: string | null
  razao_social: string
  cidade: string | null
  perfil_rfm: string | null
  dsv: number | null
  oportunidade_rfm: number | null
  score: number
}

function calcScore(rfm: { previsao_pedido?: number | null; dias_sem_comprar?: number | null }): number {
  return (rfm.previsao_pedido ?? 0) * 0.6 + (rfm.dias_sem_comprar ?? 0) * 0.4
}

export function useBuscaCliente(vendedorId: string | undefined) {
  const [codVendedor, setCodVendedor] = useState<number | null>(null)
  const [resultados, setResultados] = useState<ClienteBusca[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Buscar cod_vendedor uma vez
  useEffect(() => {
    if (!vendedorId) return
    supabase
      .from('profiles')
      .select('cod_vendedor')
      .eq('id', vendedorId)
      .single()
      .then(({ data }) => {
        if (data?.cod_vendedor != null) setCodVendedor(Number(data.cod_vendedor))
      })
  }, [vendedorId])

  const buscar = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (query.trim().length < 2) {
        setResultados([])
        return
      }

      debounceRef.current = setTimeout(async () => {
        if (!codVendedor) return
        setLoading(true)
        try {
          const trimmed = query.trim()
          const isNumeric = /^\d+$/.test(trimmed)

          // Buscar clientes da carteira
          // - numérico: busca direta por código (exata)
          // - texto: RPC com unaccent para busca accent-insensitive (fix "sao luis" → "São Luís")
          //   e limit 200 (fix anterior limit 20 que truncava cidades grandes)
          let clientes: { codigo_cliente: number; nome_fantasia: string | null; razao_social: string; cidade: string | null }[] | null = null

          if (isNumeric) {
            const { data } = await supabase
              .from('tabela_clientes')
              .select('codigo_cliente, nome_fantasia, razao_social, cidade')
              .eq('cod_vendedor', codVendedor)
              .eq('codigo_cliente', parseInt(trimmed))
              .limit(10)
            clientes = data
          } else {
            const { data } = await supabase
              .rpc('buscar_clientes_carteira', {
                p_cod_vendedor: codVendedor,
                p_query: trimmed,
                p_limit: 200,
              })
            clientes = data
          }

          if (!clientes?.length) {
            setResultados([])
            return
          }

          const codes = clientes.map((c) => c.codigo_cliente)

          // Buscar RFM mais recente por cliente
          const { data: rfmData } = await supabase
            .from('analise_rfm')
            .select('codigo_cliente, perfil, previsao_pedido, dias_sem_comprar')
            .in('codigo_cliente', codes)
            .order('data_analise', { ascending: false })

          const rfmMap = new Map<
            number,
            { perfil: string; previsao_pedido: number | null; dias_sem_comprar: number | null }
          >()
          for (const r of rfmData ?? []) {
            if (!rfmMap.has(r.codigo_cliente)) {
              rfmMap.set(r.codigo_cliente, {
                perfil: r.perfil,
                previsao_pedido: r.previsao_pedido ?? null,
                dias_sem_comprar: r.dias_sem_comprar ?? null,
              })
            }
          }

          const results: ClienteBusca[] = clientes.map((c) => {
            const rfm = rfmMap.get(c.codigo_cliente)
            return {
              codigo_cliente: c.codigo_cliente,
              nome_fantasia: c.nome_fantasia ?? null,
              razao_social: c.razao_social,
              cidade: c.cidade ?? null,
              perfil_rfm: rfm?.perfil ?? null,
              dsv: rfm?.dias_sem_comprar ?? null,
              oportunidade_rfm: rfm?.previsao_pedido ?? null,
              score: calcScore(rfm ?? {}),
            }
          })

          results.sort((a, b) => b.score - a.score)
          setResultados(results)
        } catch {
          setResultados([])
        } finally {
          setLoading(false)
        }
      }, 300)
    },
    [codVendedor]
  )

  const limpar = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setResultados([])
  }, [])

  return {
    resultados,
    loading,
    buscar,
    limpar,
    pronto: codVendedor !== null,
  }
}
