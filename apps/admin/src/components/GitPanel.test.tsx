import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import { GitPanel } from './GitPanel'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('loads the selected article diff and history', async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    return {
      ok: true,
      json: async () =>
        url.includes('/history')
          ? {
              history: [
                {
                  sha: 'abc',
                  shortSha: 'abc',
                  authoredAt: '2026-09-01T10:00:00Z',
                  author: 'Jia',
                  subject: 'docs: update article'
                }
              ]
            }
          : { diff: '+new line' }
    } as Response
  })
  vi.stubGlobal('fetch', fetchMock)

  render(
    <GitPanel
      open
      articlePath="docs/zh/essay/a.md"
      onClose={vi.fn()}
    />
  )

  expect(await screen.findByText('+new line')).toBeVisible()
  await userEvent.click(screen.getByRole('tab', { name: '历史' }))
  expect(await screen.findByText('docs: update article')).toBeVisible()
})
