import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SettingsPublishDialog } from './SettingsPublishDialog'

describe('SettingsPublishDialog', () => {
  it('shows the exact server-owned file scope and confirms a human-attributed message', async () => {
    const confirm = vi.fn()
    render(
      <SettingsPublishDialog
        busy={false}
        open
        paths={['config/site.config.json', 'docs/public/images/site/logo.png']}
        onClose={vi.fn()}
        onConfirm={confirm}
      />
    )
    expect(screen.getByText(/config\/site\.config\.json/)).toBeInTheDocument()
    expect(screen.getByText(/docs\/public\/images\/site\/logo\.png/)).toBeInTheDocument()
    expect(screen.getByText(/不会自动合并/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '确认提交并推送' }))
    expect(confirm).toHaveBeenCalledWith('[Human] config: update site settings')
  })

  it('cannot confirm an empty scope', () => {
    render(<SettingsPublishDialog busy={false} open paths={[]} onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByRole('button', { name: '确认提交并推送' })).toBeDisabled()
  })
})
