/**
 * Copiloto Focco Brasil
 * Edge Function: sync-erp-visitas (Story 3.5)
 *
 * Sincroniza pedidos do ERP (pedidos_vendas_mes) com visitas.
 * Lê registros dentro da janela retroativa e chama auto_populate_visita_from_venda().
 *
 * Fonte ERP:   pedidos_vendas_mes
 * Mapeamento:  pedidos_vendas_mes.vendedor → profiles.vendedor → profiles.id (UUID)
 * Cancelado:   valor_faturado = 0 AND valor_aberto = 0
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface SyncResult {
  success: boolean
  janela_dias: number
  pedidos_lidos: number
  sem_vendedor_mapeado: number
  created: number
  updated_existing: number
  updated_cancelled: number
  skipped_outside_window: number
  skipped_cancelled_no_visit: number
  errors: number
  error_details?: string[]
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Aceitar GET e POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  const result: SyncResult = {
    success: false,
    janela_dias: 60,
    pedidos_lidos: 0,
    sem_vendedor_mapeado: 0,
    created: 0,
    updated_existing: 0,
    updated_cancelled: 0,
    skipped_outside_window: 0,
    skipped_cancelled_no_visit: 0,
    errors: 0,
  }

  const errorDetails: string[] = []

  try {
    // 1. Obter janela retroativa de configuracoes_agenda (AC9)
    const { data: config } = await supabase
      .from('configuracoes_agenda')
      .select('valor')
      .eq('chave', 'janela_retroativa_vendas_dias')
      .single()

    result.janela_dias = config ? parseInt(config.valor, 10) : 60

    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() - result.janela_dias)
    const dataLimiteStr = dataLimite.toISOString().split('T')[0]

    // 2. Mapear nomes de vendedores para UUIDs via profiles.vendedor (FASE 1)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, vendedor')
      .not('vendedor', 'is', null)

    if (profilesError) {
      throw new Error(`Erro ao carregar profiles: ${profilesError.message}`)
    }

    const vendedorMap = new Map<string, string>()
    for (const p of profiles ?? []) {
      if (p.vendedor && p.id) {
        vendedorMap.set(p.vendedor.toUpperCase().trim(), p.id)
      }
    }

    // 3. Buscar pedidos do ERP na janela retroativa (AC9)
    const { data: pedidos, error: pedidosError } = await supabase
      .from('pedidos_vendas_mes')
      .select('pedido, vendedor, codigo_cliente, data_criacao, valor_faturado, valor_aberto')
      .gte('data_criacao', dataLimiteStr)
      .not('codigo_cliente', 'is', null)

    if (pedidosError) {
      throw new Error(`Erro ao ler pedidos_vendas_mes: ${pedidosError.message}`)
    }

    result.pedidos_lidos = pedidos?.length ?? 0

    // 4. Processar cada pedido
    for (const pedido of pedidos ?? []) {
      const nomeVendedor = pedido.vendedor?.toUpperCase().trim()
      const vendedorId = nomeVendedor ? vendedorMap.get(nomeVendedor) : undefined

      if (!vendedorId || !pedido.codigo_cliente || !pedido.data_criacao) {
        result.sem_vendedor_mapeado++
        continue
      }

      const valorFaturado = parseFloat(pedido.valor_faturado ?? '0') || 0
      const valorAberto = parseFloat(pedido.valor_aberto ?? '0') || 0
      const valorTotal = valorFaturado + valorAberto
      // Cancelado = ambos os valores são zero (AC5, FASE 1.3)
      const cancelado = valorFaturado === 0 && valorAberto === 0

      try {
        const { data: resultado, error: rpcError } = await supabase.rpc(
          'auto_populate_visita_from_venda',
          {
            p_vendedor_id: vendedorId,
            p_codigo_cliente: pedido.codigo_cliente,
            p_data_venda: pedido.data_criacao,
            p_valor_venda: valorTotal,
            p_cancelado: cancelado,
          }
        )

        if (rpcError) {
          errorDetails.push(`pedido ${pedido.pedido}: ${rpcError.message}`)
          result.errors++
          continue
        }

        switch (resultado) {
          case 'created':
            result.created++
            break
          case 'updated_existing':
            result.updated_existing++
            break
          case 'updated_cancelled':
            result.updated_cancelled++
            break
          case 'skipped_outside_window':
            result.skipped_outside_window++
            break
          case 'skipped_cancelled_no_visit':
            result.skipped_cancelled_no_visit++
            break
          default:
            result.skipped_outside_window++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errorDetails.push(`pedido ${pedido.pedido}: ${msg}`)
        result.errors++
      }
    }

    result.success = true
    if (errorDetails.length > 0) {
      result.error_details = errorDetails
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
