import { test, expect, Page } from '@playwright/test'
import { collectPageErrors, relevantErrors } from '../../fixtures/console'

/**
 * Fluxo de ESCRITA (round-trip auto-limpante): cria um agendamento e em seguida
 * cancela o que criou — não deixa lixo no banco. Exercita a mutação real
 * (criarAgendamento/cancelarAgendamento) + o AgendarVisitaSheet refatorado.
 */

async function drillToDetalhes(page: Page) {
  await page.goto('/rotas', { waitUntil: 'domcontentloaded' })
  const rotaCard = page.getByRole('button').filter({ hasText: /óticas/ }).first()
  await rotaCard.waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {})
  if (!(await rotaCard.isVisible())) test.skip(true, 'Sem rotas para este vendedor.')
  await rotaCard.click()

  const cidadeCard = page.getByRole('button').filter({ hasText: /óticas/ }).first()
  await cidadeCard.waitFor({ state: 'visible', timeout: 20_000 })
  await cidadeCard.click()

  const clienteCard = page.locator('main div.cursor-pointer').first()
  await clienteCard.waitFor({ state: 'visible', timeout: 20_000 })
  await clienteCard.click()

  await expect(page.getByRole('banner').getByText('Detalhes do Cliente')).toBeVisible({ timeout: 20_000 })
}

test.describe('Vendedor — fluxo de agendamento (criar + cancelar)', () => {
  test('cria um agendamento futuro e cancela (round-trip)', async ({ page }) => {
    const errors = collectPageErrors(page)
    await drillToDetalhes(page)

    // CTA "Agendar visita" só aparece quando não há visita registrada hoje.
    // A seção de visitas carrega async (spinner) — espera estabilizar antes de decidir.
    const agendarBtn = page.getByRole('button', { name: 'Agendar visita' })
    await agendarBtn.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
    if (!(await agendarBtn.isVisible())) {
      test.skip(true, 'Cliente já tem visita hoje — CTA de agendar indisponível.')
    }

    // Estado inicial: nº de agendamentos pendentes (botões "Cancelar agendamento")
    const cancelar = page.getByRole('button', { name: 'Cancelar agendamento' })
    const antes = await cancelar.count()

    // Abrir sheet → avançar 2 meses → escolher dia 15 (data futura estável)
    await agendarBtn.click()
    await expect(page.getByRole('button', { name: /Confirmar agendamento/ })).toBeVisible()
    await page.getByRole('button', { name: 'Próximo mês' }).click()
    await page.getByRole('button', { name: 'Próximo mês' }).click()
    await page.getByRole('button', { name: /^15 de / }).click()
    await page.getByRole('button', { name: /Confirmar agendamento/ }).click()

    // Criou: contagem sobe 1
    await expect(cancelar).toHaveCount(antes + 1, { timeout: 15_000 })

    // Cleanup: cancela o último (data mais distante = o que acabei de criar; lista é asc)
    await cancelar.last().click()
    await expect(cancelar).toHaveCount(antes, { timeout: 15_000 })

    expect(relevantErrors(errors), relevantErrors(errors).join('\n')).toEqual([])
  })
})
