import { describe, it, expect } from 'vitest'
import { dsvInfo, fmtOportunidade, metaProgress } from '../../src/components/molecules/ClienteBuscaCard'

describe('dsvInfo', () => {
  it('null/0 → sem label', () => {
    expect(dsvInfo(null)).toEqual({ label: null, color: 'text-gray-500' })
    expect(dsvInfo(0)).toEqual({ label: null, color: 'text-gray-500' })
  })
  it('faixas de cor por dias', () => {
    expect(dsvInfo(100).color).toBe('text-red-600')
    expect(dsvInfo(70).color).toBe('text-yellow-600')
    expect(dsvInfo(10).color).toBe('text-gray-500')
    expect(dsvInfo(10).label).toBe('10d s/ comprar')
  })
})

describe('fmtOportunidade', () => {
  it('null/0 → null; positivo → BRL', () => {
    expect(fmtOportunidade(null)).toBeNull()
    expect(fmtOportunidade(0)).toBeNull()
    expect(fmtOportunidade(1000)).toContain('1.000')
  })
})

describe('metaProgress', () => {
  it('pct e cor por faixa, cap em 100', () => {
    expect(metaProgress(0, 100)).toEqual({ pct: 0, color: 'bg-red-400' })
    expect(metaProgress(100, 50)).toEqual({ pct: 50, color: 'bg-red-400' })
    expect(metaProgress(100, 85)).toEqual({ pct: 85, color: 'bg-yellow-400' })
    expect(metaProgress(100, 200)).toEqual({ pct: 100, color: 'bg-green-500' })
  })
})
