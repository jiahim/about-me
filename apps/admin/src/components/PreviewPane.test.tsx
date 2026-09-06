import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'

import { PreviewPane } from './PreviewPane'

beforeEach(() => localStorage.clear())

it('switches from safe preview to outline and reports the selected source line', async () => {
  const onSelectLine = vi.fn()
  render(
    <PreviewPane
      body={'## Install\n\nRun the command.'}
      categoryLabel="技术文章"
      date="2026-09-01"
      description=""
      siteUrl="http://127.0.0.1:5173"
      title="Local editor"
      onSelectLine={onSelectLine}
      syncScroll
      onScrollRatio={vi.fn()}
      onSyncScrollChange={vi.fn()}
    />
  )

  expect(screen.getByRole('heading', { name: 'Install' })).toBeVisible()
  await userEvent.click(screen.getByRole('tab', { name: '大纲' }))
  await userEvent.click(screen.getByRole('button', { name: 'Install' }))
  expect(onSelectLine).toHaveBeenCalledWith(1)
})

it('shows quality findings and jumps to their source line', async () => {
  const onSelectLine = vi.fn()
  render(<PreviewPane body="Text" categoryLabel="技术" date="2026-01-01" description="" siteUrl="https://jiahim.com" syncScroll title="Title" findings={[{ id: 'alt', severity: 'warning', field: 'body', message: '缺少替代文本', line: 3 }]} onScrollRatio={vi.fn()} onSelectLine={onSelectLine} onSyncScrollChange={vi.fn()} />)
  await userEvent.click(screen.getByRole('tab', { name: '检查 (1)' }))
  await userEvent.click(screen.getByRole('button', { name: /第 3 行/ }))
  expect(onSelectLine).toHaveBeenCalledWith(3)
})

it('does not execute raw HTML from markdown', () => {
  render(
    <PreviewPane
      body={'<script>window.bad = true</script>'}
      categoryLabel="随笔"
      date=""
      description=""
      siteUrl="http://127.0.0.1:5173"
      title="Safe preview"
      onSelectLine={vi.fn()}
      syncScroll
      onScrollRatio={vi.fn()}
      onSyncScrollChange={vi.fn()}
    />
  )

  expect(document.querySelector('script')).toBeNull()
  expect(screen.getByText('<script>window.bad = true</script>')).toBeVisible()
})

it('publishes preview scrolls, applies remote ratios without echo, and toggles sync', async () => {
  const onScrollRatio = vi.fn()
  const onSyncScrollChange = vi.fn()
  const props = {
    body: 'Long article',
    categoryLabel: '技术',
    date: '2026-09-04',
    description: '',
    siteUrl: 'https://www.jiahim.com',
    title: 'Scroll sync',
    onSelectLine: vi.fn(),
    syncScroll: true,
    onScrollRatio,
    onSyncScrollChange
  }
  const { container, rerender } = render(<PreviewPane {...props} />)
  const preview = container.querySelector('.markdown-preview') as HTMLElement

  Object.defineProperties(preview, {
    scrollHeight: { configurable: true, value: 1000 },
    clientHeight: { configurable: true, value: 400 }
  })
  preview.scrollTop = 300
  fireEvent.scroll(preview)
  expect(onScrollRatio).toHaveBeenLastCalledWith(0.5)

  rerender(
    <PreviewPane
      {...props}
      remoteScrollRatio={0.25}
      remoteScrollRevision={1}
    />
  )
  expect(preview.scrollTop).toBe(150)
  fireEvent.scroll(preview)
  expect(onScrollRatio).toHaveBeenCalledTimes(1)

  await userEvent.click(screen.getByRole('button', { name: '滚动同步' }))
  expect(onSyncScrollChange).toHaveBeenCalledWith(false)
})

it('defaults to a smaller 16px reading scale and persists preview adjustments', async () => {
  const { container } = render(<PreviewPane body="Text" categoryLabel="技术" date="2026-01-01" description="" siteUrl="https://jiahim.com" syncScroll title="Title" onScrollRatio={vi.fn()} onSelectLine={vi.fn()} onSyncScrollChange={vi.fn()} />)
  const pane = container.querySelector('.preview-pane') as HTMLElement

  expect(pane).toHaveAttribute('data-font-size', 'medium')
  expect(screen.getByText('16px')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: '减小预览字号' }))
  expect(pane).toHaveAttribute('data-font-size', 'small')
  expect(screen.getByText('14px')).toBeVisible()
  expect(localStorage.getItem('jiahim:preview-font-size:v1')).toBe('small')
})
