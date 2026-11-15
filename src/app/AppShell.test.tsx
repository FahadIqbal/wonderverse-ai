import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetStores } from '../test/helpers'

vi.mock('../features/lab/scene/webgl', () => ({ isWebGLAvailable: () => false }))

import { AppShell } from './AppShell'

describe('AppShell', () => {
  beforeEach(() => {
    resetStores()
  })

  it('offers a no-login start path with landmarks and a skip link', () => {
    render(<AppShell />)
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    // Fresh load leaves focus alone so the skip link is the first Tab stop (found by the E2E run).
    expect(document.body).toHaveFocus()
    expect(screen.queryByLabelText(/password|email/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enter the Lab' })).toBeEnabled()
  })

  it('enters the lab in one click, lands on the lab heading, and can go back', async () => {
    const user = userEvent.setup()
    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'Enter the Lab' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Electricity Lab missions' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Start Mission 1' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Electricity Lab' })).toHaveFocus()
    expect(await screen.findByRole('button', { name: 'Start mission' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to missions' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Electricity Lab missions' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to start' }))
    expect(screen.getByRole('button', { name: 'Enter the Lab' })).toBeInTheDocument()
  })

  it('without WebGL the lab still starts a mission in the schematic editor (R7)', async () => {
    const user = userEvent.setup()
    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'Enter the Lab' }))
    await user.click(screen.getByRole('button', { name: 'Start Mission 1' }))
    await user.click(await screen.findByRole('button', { name: 'Start mission' }))
    expect(screen.getByTestId('fallback-note')).toHaveTextContent(/WebGL/)
    expect(screen.getByRole('button', { name: 'Terminal Battery 1 positive' })).toBeInTheDocument()
  })
})
