import { test, expect } from '@playwright/test'

test.describe('admin surface', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText(/osw permits admin/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('admin pages require authentication', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/login/)

    await page.goto('/admin/orders')
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin APIs reject unauthenticated write access', async ({ request }) => {
    const dashboardRes = await request.get('/api/admin/orders')
    const body = await dashboardRes.text()

    expect([200, 302, 307, 401, 403]).toContain(dashboardRes.status())
    if (dashboardRes.status() === 200) {
      expect(body.toLowerCase()).toContain('login')
    }

    const writeRes = await request.post('/api/admin/customers', {
      data: { name: 'Unauthorized Attempt LLC' },
    })
    expect([302, 307, 401, 403]).toContain(writeRes.status())
  })
})
