import { describe, it, expect } from 'vitest'
import {
  calcMetaPeriodo, buildRfmMap, computeAtividade, computeForecast,
  computeQualidade, computeDiasSemCompra, computeCobertura, groupBy,
  buildDsvMap, countSemVisita60d,
} from '../../src/hooks/useGestaoAgenda'

describe('calcMetaPeriodo', () => {
  it('mês = meta mensal; trimestre = mensal × 3', () => {
    expect(calcMetaPeriodo('mes', 1000, 0, new Date())).toBe(1000)
    expect(calcMetaPeriodo('trimestre', 1000, 0, new Date())).toBe(3000)
  })
})

describe('buildRfmMap', () => {
  it('usa a primeira ocorrência por cliente e aplica defaults', () => {
    const m = buildRfmMap([
      { codigo_cliente: 1, dias_sem_comprar: 30, perfil: 'Ouro', previsao_pedido: 500, meta_ano_atual: 1000 },
      { codigo_cliente: 1, dias_sem_comprar: 99, perfil: 'Prata', previsao_pedido: 1, meta_ano_atual: 2 },
      { codigo_cliente: 2, dias_sem_comprar: null, perfil: null, previsao_pedido: null, meta_ano_atual: null },
    ])
    expect(m.get(1)).toEqual({ diasSemComprar: 30, perfil: 'Ouro', previsaoPedido: 500, metaAnoAtual: 1000 })
    expect(m.get(2)).toEqual({ diasSemComprar: 0, perfil: '', previsaoPedido: 0, metaAnoAtual: 0 })
  })
  it('null → mapa vazio', () => {
    expect(buildRfmMap(null).size).toBe(0)
  })
})

describe('computeAtividade', () => {
  const visitas = (rs: string[]) => rs.map((r, i) => ({ id: String(i), resultado: r })) as any
  it('calcula taxas e média', () => {
    const r = computeAtividade(visitas(['vendeu', 'nao_vendeu', 'vendeu', 'ausente']), [{}, {}, {}, {}, {}] as any, 2)
    expect(r.totalVisitas).toBe(4)
    expect(r.visitasAgendadas).toBe(5)
    expect(r.taxaCumprimento).toBe(80)
    expect(r.taxaConversao).toBe(50)
    expect(r.mediaVisitasPorSemana).toBe(2)
  })
  it('divisão por zero → 0', () => {
    const r = computeAtividade([], [], 1)
    expect(r.taxaCumprimento).toBe(0)
    expect(r.taxaConversao).toBe(0)
  })
})

describe('computeForecast', () => {
  it('soma forecast/realizado, accuracy, atingimento e oportunidade RFM', () => {
    const ags = [{ codigo_cliente: 1, valor_previsto: 100 }, { codigo_cliente: 2, valor_previsto: null }] as any
    const vis = [{ valor_realizado: 50 }, { valor_realizado: null }] as any
    const rfm = buildRfmMap([{ codigo_cliente: 1, previsao_pedido: 200 }])
    const r = computeForecast(ags, vis, 100, rfm)
    expect(r.forecastTotal).toBe(100)
    expect(r.realizadoTotal).toBe(50)
    expect(r.forecastAccuracy).toBe(0.5)
    expect(r.atingimentoMeta).toBe(50)
    expect(r.somaOportunidade).toBe(200)
  })
  it('forecast/meta zero → accuracy/atingimento 0', () => {
    const r = computeForecast([], [], 0, new Map())
    expect(r.forecastAccuracy).toBe(0)
    expect(r.atingimentoMeta).toBe(0)
  })
})

describe('computeQualidade', () => {
  it('topMotivos ordenado por contagem e pctComObservacao', () => {
    const vis = [
      { motivo_nao_venda_id: 1, observacoes: 'x' },
      { motivo_nao_venda_id: 1, observacoes: '' },
      { motivo_nao_venda_id: 2, observacoes: ' ' },
      { motivo_nao_venda_id: null, observacoes: 'y' },
    ] as any
    const motivos = [
      { id: 1, descricao: 'Preço', codigo_canonico: 'PRECO' },
      { id: 2, descricao: 'Estoque', codigo_canonico: 'EST' },
    ] as any
    const r = computeQualidade(vis, motivos, 4)
    expect(r.topMotivos[0]).toEqual({ motivo: 'Preço', count: 2 })
    expect(r.topMotivos[1]).toEqual({ motivo: 'Estoque', count: 1 })
    expect(r.pctComObservacao).toBe(50)
  })
})

describe('computeDiasSemCompra', () => {
  it('conta por faixa (cumulativo)', () => {
    const clientes = [{ codigo_cliente: 1 }, { codigo_cliente: 2 }, { codigo_cliente: 3 }] as any
    const rfm = buildRfmMap([
      { codigo_cliente: 1, dias_sem_comprar: 100 },
      { codigo_cliente: 2, dias_sem_comprar: 65 },
      { codigo_cliente: 3, dias_sem_comprar: 10 },
    ])
    const r = computeDiasSemCompra(clientes, rfm)
    expect(r.clientes30d).toBe(2)
    expect(r.clientes60d).toBe(2)
    expect(r.clientes90d).toBe(1)
  })
})

describe('computeCobertura', () => {
  it('clientes visitados (únicos) e pct de cobertura', () => {
    const vis = [{ codigo_cliente: 1 }, { codigo_cliente: 1 }] as any
    const ativos = [{ codigo_cliente: 1 }, { codigo_cliente: 2 }] as any
    const r = computeCobertura(vis, ativos)
    expect(r.clientesVisitados).toBe(1)
    expect(r.pctCobertura).toBe(50)
  })
})

describe('groupBy / buildDsvMap / countSemVisita60d', () => {
  it('groupBy agrupa por chave', () => {
    const m = groupBy([{ v: 'a' }, { v: 'a' }, { v: 'b' }], (r) => r.v)
    expect(m.get('a')?.length).toBe(2)
    expect(m.get('b')?.length).toBe(1)
  })
  it('countSemVisita60d conta clientes > 60d por vendedor', () => {
    const dsv = buildDsvMap([
      { codigo_cliente: 1, dias_sem_comprar: 70 },
      { codigo_cliente: 2, dias_sem_comprar: 30 },
    ])
    const res = countSemVisita60d(
      [{ codigo_cliente: 1, cod_vendedor: 9 }, { codigo_cliente: 2, cod_vendedor: 9 }],
      dsv,
    )
    expect(res.get(9)).toBe(1)
  })
})
