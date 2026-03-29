/**
 * Copiloto Focco Brasil
 * Hook: useConfiguracoes — leitura de configurações da agenda (Story 3.11)
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface ConfiguracoesAgenda {
  prazo_alerta_amarelo_dias: number
  prazo_alerta_vermelho_dias: number
  threshold_forecast_risco_pct: number
}

const DEFAULT_CONFIG: ConfiguracoesAgenda = {
  prazo_alerta_amarelo_dias: 60,
  prazo_alerta_vermelho_dias: 90,
  threshold_forecast_risco_pct: 40,
}

export function useConfiguracoes(): ConfiguracoesAgenda {
  const [config, setConfig] = useState<ConfiguracoesAgenda>(DEFAULT_CONFIG)

  useEffect(() => {
    supabase
      .from('configuracoes_agenda')
      .select('chave, valor')
      .then(({ data }) => {
        if (!data) return
        const overrides = data.reduce<Record<string, number>>(
          (acc, row) => ({ ...acc, [row.chave]: Number(row.valor) }),
          {}
        )
        setConfig({ ...DEFAULT_CONFIG, ...overrides })
      })
  }, [])

  return config
}
