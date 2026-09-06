import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DraftArticle } from '@/lib/editor/drafts'
import type { CategoryDefinition } from '@/lib/types'
import { EditorPane } from './EditorPane'

const stylesheet = readFileSync(
  resolve(process.cwd(), 'src/app/globals.css'),
  'utf8'
)

const article: DraftArticle = {
  path: 'docs/zh/book/example.md',
  category: 'book',
  title: '领域驱动设计',
  date: '2025-01-04',
  description: '软件核心复杂性应对之道',
  body: '# 正文',
  draft: false,
  isNew: false,
  slug: ''
}

const categories: CategoryDefinition[] = [
  {
    id: 'book',
    label: '读书',
    description: '',
    directory: 'docs/zh/book',
    depth: 0,
    status: 'active'
  }
]

describe('EditorPane', () => {
  beforeEach(() => localStorage.clear())

  it('keeps publication date and summary in one compact metadata bar', () => {
    const { container } = render(
      <>
        <style>{stylesheet}</style>
        <EditorPane
          article={article}
          busy={false}
          categories={categories}
          wordCount={2}
          onChange={vi.fn()}
          onSave={vi.fn()}
          onUpload={vi.fn()}
        />
      </>
    )

    const metadata = screen.getByRole('group', { name: '文章元数据' })
    const dateLabel = screen.getByText('发布日期').closest('label') as HTMLElement
    const descriptionLabel = screen.getByText('摘要').closest('label') as HTMLElement
    const styles = getComputedStyle(metadata)

    expect(metadata).toContainElement(screen.getByLabelText('发布日期'))
    expect(metadata).toContainElement(screen.getByLabelText('摘要'))
    expect(styles.gridTemplateColumns).toBe('minmax(12rem, 0.72fr) minmax(0, 2fr)')
    expect(styles.marginTop).toBe('0.5rem')
    expect(getComputedStyle(dateLabel).display).toBe('flex')
    expect(getComputedStyle(descriptionLabel).display).toBe('flex')
    expect(container.querySelector('.article-fields')).toContainElement(metadata)
  })

  it('defaults to the 14px editor scale and persists toolbar adjustments', async () => {
    const { container } = render(
      <EditorPane article={article} busy={false} categories={categories} wordCount={2} onChange={vi.fn()} onSave={vi.fn()} onUpload={vi.fn()} />
    )
    const pane = container.querySelector('.source-pane') as HTMLElement

    expect(pane).toHaveAttribute('data-font-size', 'medium')
    expect(screen.getByText('14px')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: '增大编辑字号' }))
    expect(pane).toHaveAttribute('data-font-size', 'large')
    expect(screen.getByText('16px')).toBeVisible()
    expect(localStorage.getItem('jiahim:editor-font-size:v1')).toBe('large')
  })
})
