import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { PublishDialog } from './PublishDialog'

it('shows the exact publish scope and confirms a human-attributed message', async () => {
  const onConfirm = vi.fn()
  render(
    <PublishDialog
      articlePath="docs/zh/essay/a.md"
      busy={false}
      mediaPaths={['docs/public/images/articles/2026/09/a.png']}
      open
      title="本地编辑器"
      onClose={vi.fn()}
      onConfirm={onConfirm}
    />
  )

  expect(screen.getByText('docs/zh/essay/a.md')).toBeVisible()
  expect(screen.getByText('docs/public/images/articles/2026/09/a.png')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: '确认提交并推送' }))
  expect(onConfirm).toHaveBeenCalledWith('[Human] docs: 本地编辑器')
})
