import { describe, it, expect } from 'vitest'
import { getPerfilValue, compareClientes } from '../../src/components/pages/Clientes.sections'

describe('getPerfilValue', () => {
  it('ordena ouro > prata > bronze > outros (case-insensitive)', () => {
    expect(getPerfilValue('Ouro')).toBe(3)
    expect(getPerfilValue('prata')).toBe(2)
    expect(getPerfilValue('BRONZE')).toBe(1)
    expect(getPerfilValue('')).toBe(0)
  })
})

describe('compareClientes', () => {
  const c = (over: any) => ({ nome_fantasia: 'X', bairro: '', analise_rfm: {}, ...over })

  it('perfil: desc coloca Ouro antes de Bronze; asc inverte', () => {
    const ouro = c({ analise_rfm: { perfil: 'Ouro' } })
    const bronze = c({ analise_rfm: { perfil: 'Bronze' } })
    expect(compareClientes(ouro, bronze, 'perfil', 'desc')).toBeLessThan(0)
    expect(compareClientes(ouro, bronze, 'perfil', 'asc')).toBeGreaterThan(0)
  })

  it('nome usa localeCompare', () => {
    expect(compareClientes(c({ nome_fantasia: 'A' }), c({ nome_fantasia: 'B' }), 'nome', 'desc')).toBeLessThan(0)
  })

  it('oportunidade desc: maior previsão primeiro', () => {
    const baixa = c({ analise_rfm: { previsao_pedido: 100 } })
    const alta = c({ analise_rfm: { previsao_pedido: 500 } })
    expect(compareClientes(baixa, alta, 'oportunidade', 'desc')).toBeGreaterThan(0)
  })

  it('chave desconhecida cai em perfil', () => {
    const ouro = c({ analise_rfm: { perfil: 'Ouro' } })
    const bronze = c({ analise_rfm: { perfil: 'Bronze' } })
    expect(compareClientes(ouro, bronze, 'xyz', 'desc')).toBeLessThan(0)
  })
})
