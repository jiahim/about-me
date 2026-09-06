import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { ArticleQualityPanel } from './ArticleQualityPanel'

it('groups findings and jumps to the source line', async () => {
  const onSelectLine = vi.fn()
  render(<ArticleQualityPanel findings={[
    { id: 'one', severity: 'error', field: 'body', message: '链接无效', line: 4 },
    { id: 'two', severity: 'info', field: 'canonical', message: '自动生成' }
  ]} onSelectLine={onSelectLine} />)
  expect(screen.getByRole('heading', { name: '错误 · 1' })).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: /第 4 行/ }))
  expect(onSelectLine).toHaveBeenCalledWith(4)
})
