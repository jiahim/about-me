import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CategoryDefinition } from '@/lib/types'
import { AdminApp } from './AdminApp'

const stylesheet = readFileSync(
  resolve(process.cwd(), 'src/app/globals.css'),
  'utf8'
)

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

const articleSummary = {
  path: 'docs/zh/book/article.md',
  category: 'book' as const,
  title: '响应式文章',
  date: '2026-09-02',
  description: '用于抽屉导航测试',
  draft: false
}

function successfulFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const value = url === '/api/articles'
      ? { articles: [] }
      : {
          status: {
            branch: 'codex/editorial-cms',
            defaultBranch: 'main',
            remote: 'origin',
            upstream: 'origin/codex/editorial-cms',
            ahead: 0,
            behind: 0,
            changedFiles: [],
            conflicts: [],
            operation: 'none',
            canWrite: true
          }
        }

    return {
      ok: true,
      json: async () => value
    } as Response
  })
}

function articleFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    let value: object

    if (url === '/api/articles') {
      value = { articles: [articleSummary] }
    } else if (url.startsWith('/api/article?path=')) {
      value = {
        article: {
          ...articleSummary,
          body: ''
        }
      }
    } else {
      value = {
        status: {
          branch: 'codex/editorial-cms',
          defaultBranch: 'main',
          remote: 'origin',
          upstream: 'origin/codex/editorial-cms',
          ahead: 0,
          behind: 0,
          changedFiles: [],
          conflicts: [],
          operation: 'none',
          canWrite: true
        }
      }
    }

    return {
      ok: true,
      json: async () => value
    } as Response
  })
}

function mediaStyleRule(media: string, selector: string): CSSStyleRule | undefined {
  const style = document.createElement('style')
  style.textContent = stylesheet
  document.head.append(style)

  const mediaRule = Array.from(style.sheet?.cssRules ?? []).find(
    (rule): rule is CSSMediaRule =>
      rule instanceof CSSMediaRule && rule.conditionText === media
  )

  const result = Array.from(mediaRule?.cssRules ?? []).find(
    (rule): rule is CSSStyleRule =>
      rule instanceof CSSStyleRule &&
      rule.selectorText.replace(/\s+/g, ' ') === selector
  )
  style.remove()
  return result
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('AdminApp', () => {
  it('does not reserve a duplicate footer row for Git status', async () => {
    const fetchStub = successfulFetch()
    vi.stubGlobal('fetch', fetchStub)

    const { container } = render(
      <>
        <style>{stylesheet}</style>
        <AdminApp categories={categories} siteUrl="https://www.jiahim.com" />
      </>
    )

    await waitFor(() => {
      expect(screen.getByText('codex/editorial-cms')).toBeVisible()
    })

    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(screen.queryByText('本地内容工作台')).not.toBeInTheDocument()
    expect(getComputedStyle(container.querySelector('.admin-shell') as HTMLElement).gridTemplateRows)
      .toBe('3.65rem auto minmax(0, 1fr)')
    expect(getComputedStyle(container.querySelector('#articles-workspace') as HTMLElement).gridRow)
      .toBe('3')
  })

  it('keeps every desktop workspace pane in one grid row', async () => {
    vi.stubGlobal('fetch', successfulFetch())

    const { container } = render(
      <>
        <style>{stylesheet}</style>
        <AdminApp categories={categories} siteUrl="https://www.jiahim.com" />
      </>
    )

    await waitFor(() => {
      expect(screen.getByText('codex/editorial-cms')).toBeVisible()
    })

    const desktopItems = [
      container.querySelector('.article-sidebar'),
      ...container.querySelectorAll('.workspace-resize-handle'),
      container.querySelector('.source-pane'),
      container.querySelector('.preview-pane')
    ] as HTMLElement[]

    expect(desktopItems).toHaveLength(5)
    for (const item of desktopItems) {
      expect(getComputedStyle(item).gridRow).toBe('1')
    }
  })

  it('places an optional feedback banner between the header and workspace', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: '本地读取失败' })
    } as Response)))

    const { container } = render(
      <>
        <style>{stylesheet}</style>
        <AdminApp categories={categories} siteUrl="https://www.jiahim.com" />
      </>
    )

    await waitFor(() => {
      expect(container.querySelector('.global-status')).toBeInTheDocument()
    })

    const status = container.querySelector('.global-status') as HTMLElement
    const workspace = container.querySelector('#articles-workspace') as HTMLElement

    expect(getComputedStyle(status).gridRow).toBe('2')
    expect(getComputedStyle(workspace).gridRow).toBe('3')
  })

  it('switches the compact pane and closes the article drawer with Escape', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', successfulFetch())

    const { container } = render(
      <AdminApp categories={categories} siteUrl="https://www.jiahim.com" />
    )

    await waitFor(() => {
      expect(screen.getByText('codex/editorial-cms')).toBeVisible()
    })

    const workspace = container.querySelector('#articles-workspace') as HTMLElement
    const sourceButton = screen.getByRole('button', { name: '编辑' })
    const previewButton = screen.getByRole('button', { name: '预览' })
    const drawerButton = screen.getByRole('button', { name: '打开文章列表' })

    expect(workspace).toHaveClass('workspace--compact-source')
    expect(sourceButton).toHaveAttribute('aria-pressed', 'true')
    expect(previewButton).toHaveAttribute('aria-pressed', 'false')
    expect(drawerButton).toHaveAttribute('aria-controls', 'article-sidebar')
    expect(drawerButton).toHaveAttribute('aria-expanded', 'false')

    await user.click(previewButton)
    expect(workspace).toHaveClass('workspace--compact-preview')
    expect(previewButton).toHaveAttribute('aria-pressed', 'true')

    await user.click(drawerButton)
    expect(workspace).toHaveClass('workspace--drawer-open')
    expect(drawerButton).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    expect(workspace).not.toHaveClass('workspace--drawer-open')
    expect(drawerButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('dismisses the drawer from the backdrop and sidebar actions', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', articleFetch())

    const { container } = render(
      <AdminApp categories={categories} siteUrl="https://www.jiahim.com" />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /响应式文章/ })).toBeVisible()
    })

    const workspace = container.querySelector('#articles-workspace') as HTMLElement
    const drawerButton = screen.getByRole('button', { name: '打开文章列表' })

    expect(screen.getByRole('complementary', { name: '文章列表' }))
      .toHaveAttribute('id', 'article-sidebar')

    await user.click(drawerButton)
    const backdrop = container.querySelector('.article-drawer-backdrop') as HTMLElement
    expect(backdrop).toHaveAccessibleName('关闭文章列表')
    await user.click(backdrop)
    expect(workspace).not.toHaveClass('workspace--drawer-open')

    await user.click(screen.getByRole('button', { name: '打开文章列表' }))
    await user.click(screen.getByRole('button', { name: '预览' }))
    await user.click(screen.getByRole('button', { name: /响应式文章/ }))

    await waitFor(() => {
      expect(workspace).not.toHaveClass('workspace--drawer-open')
      expect(workspace).toHaveClass('workspace--compact-source')
    })

    await user.click(screen.getByRole('button', { name: '打开文章列表' }))
    await user.click(screen.getByRole('button', { name: '新建' }))
    expect(workspace).not.toHaveClass('workspace--drawer-open')
    expect(workspace).toHaveClass('workspace--compact-source')
  })

  it('synchronizes editor and preview scroll ratios in both directions until disabled', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', articleFetch())

    const { container } = render(
      <AdminApp categories={categories} siteUrl="https://www.jiahim.com" />
    )

    await user.click(await screen.findByRole('button', { name: /响应式文章/ }))
    const editor = await waitFor(
      () => container.querySelector('.cm-scroller') as HTMLElement
    )
    const preview = container.querySelector('.markdown-preview') as HTMLElement

    for (const element of [editor, preview]) {
      Object.defineProperties(element, {
        scrollHeight: { configurable: true, value: 1000 },
        clientHeight: { configurable: true, value: 400 }
      })
    }

    editor.scrollTop = 300
    fireEvent.scroll(editor)
    await waitFor(() => expect(preview.scrollTop).toBe(300))
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    preview.scrollTop = 120
    fireEvent.scroll(preview)
    await waitFor(() => expect(editor.scrollTop).toBe(120))
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    await user.click(screen.getByRole('button', { name: '滚动同步' }))
    editor.scrollTop = 500
    fireEvent.scroll(editor)
    expect(preview.scrollTop).toBe(120)
  })

  it('lays out compact panes and the narrow article drawer at their breakpoints', () => {
    const compactControls = mediaStyleRule(
      '(max-width: 980px)',
      '.responsive-workspace-controls'
    )
    const compactPreviewHidden = mediaStyleRule(
      '(max-width: 980px)',
      '.workspace--compact-source .preview-pane'
    )
    const compactSourceHidden = mediaStyleRule(
      '(max-width: 980px)',
      '.workspace--compact-preview .source-pane'
    )
    const compactResizeHandle = mediaStyleRule(
      '(max-width: 980px)',
      '.workspace-resize-handle'
    )
    const drawer = mediaStyleRule('(max-width: 760px)', '.article-sidebar')
    const openDrawer = mediaStyleRule(
      '(max-width: 760px)',
      '.workspace--drawer-open .article-sidebar'
    )
    const openBackdrop = mediaStyleRule(
      '(max-width: 760px)',
      '.workspace--drawer-open .article-drawer-backdrop'
    )
    const mobilePaneButton = mediaStyleRule(
      '(max-width: 760px)',
      '.responsive-pane-switch button'
    )
    const reducedDrawer = mediaStyleRule(
      '(prefers-reduced-motion: reduce)',
      '.article-sidebar, .article-drawer-backdrop'
    )

    expect(compactControls?.style.display).toBe('flex')
    expect(compactControls?.style.getPropertyValue('grid-column')).toBe('1 / -1')
    expect(compactPreviewHidden?.style.display).toBe('none')
    expect(compactSourceHidden?.style.display).toBe('none')
    expect(compactResizeHandle?.style.display).toBe('none')
    expect(stylesheet).toMatch(
      /@media \(max-width: 1180px\)[\s\S]*?minmax\(420px,[\s\S]*?minmax\(320px,/
    )
    expect(stylesheet).toMatch(
      /\.workspace--sidebar-collapsed\s*\{[\s\S]*?minmax\(420px,[\s\S]*?minmax\(320px,/
    )
    expect(stylesheet).not.toMatch(
      /\.workspace--sidebar-collapsed\s*\{[\s\S]*?minmax\(460px,/
    )
    expect(drawer?.style.position).toBe('fixed')
    expect(drawer?.style.transform).toBe('translateX(-100%)')
    expect(openDrawer?.style.transform).toBe('translateX(0)')
    expect(openBackdrop?.style.opacity).toBe('1')
    expect(openBackdrop?.style.getPropertyValue('pointer-events')).toBe('auto')
    expect(mobilePaneButton?.style.getPropertyValue('min-height')).toBe('2.75rem')
    expect(reducedDrawer?.cssText).toContain('transition: none')
  })

  it('opens the complete article drawer when the desktop sidebar preference is collapsed', async () => {
    const user = userEvent.setup()
    localStorage.setItem('jiahim:sidebar-collapsed', 'true')
    vi.stubGlobal('fetch', articleFetch())

    render(<AdminApp categories={categories} siteUrl="https://www.jiahim.com" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '展开文章列表' })).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: '打开文章列表' }))

    expect(screen.getByRole('button', { name: /响应式文章/ })).toBeVisible()
    expect(screen.getByRole('button', { name: '新建' })).toBeVisible()
  })

  it('closes the drawer and restores the desktop collapse preference after widening', async () => {
    const user = userEvent.setup()
    let onBreakpointChange: ((event: MediaQueryListEvent) => void) | undefined
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      media: '(min-width: 761px)',
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        onBreakpointChange = listener
      },
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    } as unknown as MediaQueryList)))
    localStorage.setItem('jiahim:sidebar-collapsed', 'true')
    vi.stubGlobal('fetch', articleFetch())

    const { container } = render(
      <AdminApp categories={categories} siteUrl="https://www.jiahim.com" />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '展开文章列表' })).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: '打开文章列表' }))
    expect(screen.getByRole('button', { name: /响应式文章/ })).toBeVisible()

    act(() => {
      onBreakpointChange?.({ matches: true } as MediaQueryListEvent)
    })

    expect(container.querySelector('#articles-workspace'))
      .not.toHaveClass('workspace--drawer-open')
    expect(screen.getByRole('button', { name: '展开文章列表' })).toBeVisible()
  })

  it('restores persisted desktop pane sizes and exposes accessible resize separators', async () => {
    vi.stubGlobal('innerWidth', 1400)
    localStorage.setItem('jiahim:workspace-layout:v1', JSON.stringify({
      sidebarWidth: 360,
      editorRatio: 0.64
    }))
    vi.stubGlobal('fetch', successfulFetch())

    const { container } = render(
      <AdminApp categories={categories} siteUrl="https://www.jiahim.com" />
    )

    await waitFor(() => {
      expect(screen.getByText('codex/editorial-cms')).toBeVisible()
    })

    const workspace = container.querySelector('#articles-workspace') as HTMLElement
    const separators = screen.getAllByRole('separator')

    expect(separators).toHaveLength(2)
    expect(separators[0]).toHaveAccessibleName('调整文章列表宽度')
    expect(separators[0]).toHaveAttribute('aria-orientation', 'vertical')
    expect(separators[0]).toHaveAttribute('tabindex', '0')
    expect(separators[1]).toHaveAccessibleName('调整编辑与预览比例')
    expect(workspace.style.getPropertyValue('--sidebar-width')).toBe('360px')
    expect(workspace.style.getPropertyValue('--editor-width')).toBe('658px')
    expect(workspace.style.getPropertyValue('--preview-flex')).toBe('1fr')
  })

  it('resizes with pointer and keyboard input, clamps pane minimums, and resets on double click', async () => {
    vi.stubGlobal('innerWidth', 1400)
    vi.stubGlobal('PointerEvent', MouseEvent)
    vi.stubGlobal('fetch', successfulFetch())
    const user = userEvent.setup()

    const { container } = render(
      <AdminApp categories={categories} siteUrl="https://www.jiahim.com" />
    )

    await waitFor(() => {
      expect(screen.getByText('codex/editorial-cms')).toBeVisible()
    })

    const workspace = container.querySelector('#articles-workspace') as HTMLElement
    vi.spyOn(workspace, 'getBoundingClientRect').mockReturnValue({
      bottom: 700,
      height: 640,
      left: 0,
      right: 1400,
      top: 60,
      width: 1400,
      x: 0,
      y: 60,
      toJSON: () => ({})
    })

    const sidebarSeparator = screen.getByRole('separator', { name: '调整文章列表宽度' })
    const contentSeparator = screen.getByRole('separator', { name: '调整编辑与预览比例' })

    fireEvent.pointerDown(sidebarSeparator, { button: 2, pointerId: 9, clientX: 100 })
    expect(workspace).not.toHaveClass('workspace--resizing')

    fireEvent.pointerDown(sidebarSeparator, { pointerId: 1, clientX: 100 })
    expect(workspace).toHaveClass('workspace--resizing')
    expect(workspace.style.getPropertyValue('--sidebar-width')).toBe('220px')
    expect(localStorage.getItem('jiahim:workspace-layout:v1')).toBeNull()

    fireEvent.pointerMove(sidebarSeparator, { pointerId: 1, clientX: 900 })
    expect(workspace.style.getPropertyValue('--sidebar-width')).toBe('420px')
    expect(localStorage.getItem('jiahim:workspace-layout:v1')).toBeNull()
    fireEvent.pointerUp(sidebarSeparator, { pointerId: 1, clientX: 900 })
    expect(workspace).not.toHaveClass('workspace--resizing')
    expect(localStorage.getItem('jiahim:workspace-layout:v1')).not.toBeNull()

    sidebarSeparator.focus()
    await user.keyboard('{ArrowLeft}')
    expect(workspace.style.getPropertyValue('--sidebar-width')).toBe('412px')

    const committedBeforeContentDrag = localStorage.getItem('jiahim:workspace-layout:v1')
    fireEvent.pointerDown(contentSeparator, { pointerId: 2, clientX: 500 })
    expect(workspace.style.getPropertyValue('--editor-width')).toBe('420px')
    fireEvent.pointerDown(sidebarSeparator, { pointerId: 3, clientX: 300 })
    expect(workspace.style.getPropertyValue('--sidebar-width')).toBe('412px')
    expect(localStorage.getItem('jiahim:workspace-layout:v1')).toBe(committedBeforeContentDrag)
    fireEvent.pointerMove(contentSeparator, { pointerId: 2, clientX: 1300 })
    expect(workspace.style.getPropertyValue('--editor-width')).toBe('656px')
    expect(localStorage.getItem('jiahim:workspace-layout:v1')).toBe(committedBeforeContentDrag)
    fireEvent.pointerUp(contentSeparator, { pointerId: 2, clientX: 1300 })
    expect(localStorage.getItem('jiahim:workspace-layout:v1')).not.toBe(committedBeforeContentDrag)

    expect(JSON.parse(localStorage.getItem('jiahim:workspace-layout:v1') || '{}'))
      .toEqual(expect.objectContaining({ sidebarWidth: 412 }))

    fireEvent.pointerDown(contentSeparator, { pointerId: 4, clientX: 650 })
    expect(workspace).toHaveClass('workspace--resizing')
    fireEvent.lostPointerCapture(contentSeparator, { pointerId: 4 })
    expect(workspace).not.toHaveClass('workspace--resizing')

    fireEvent.doubleClick(contentSeparator)
    expect(localStorage.getItem('jiahim:workspace-layout:v1')).toBeNull()
    expect(workspace.style.getPropertyValue('--sidebar-width')).toBe('')
    expect(workspace.style.getPropertyValue('--editor-width')).toBe('')
    expect(workspace.style.getPropertyValue('--preview-flex')).toBe('')
  })

  it('renders a persisted editor ratio as a constrained pixel track so the grid fills its width', async () => {
    vi.stubGlobal('innerWidth', 1098)
    localStorage.setItem('jiahim:workspace-layout:v1', JSON.stringify({
      sidebarWidth: 280,
      editorRatio: 0.5235732009925558
    }))
    vi.stubGlobal('fetch', successfulFetch())

    const { container } = render(
      <AdminApp categories={categories} siteUrl="https://www.jiahim.com" />
    )

    await waitFor(() => {
      expect(screen.getByText('codex/editorial-cms')).toBeVisible()
    })

    const workspace = container.querySelector('#articles-workspace') as HTMLElement
    expect(workspace.style.getPropertyValue('--editor-width')).toBe('422px')
  })

  it('steps the content separator from its rendered constrained width', async () => {
    vi.stubGlobal('innerWidth', 1098)
    localStorage.setItem('jiahim:workspace-layout:v1', JSON.stringify({
      sidebarWidth: 280,
      editorRatio: 0.8
    }))
    vi.stubGlobal('fetch', successfulFetch())
    const user = userEvent.setup()

    const { container } = render(
      <AdminApp categories={categories} siteUrl="https://www.jiahim.com" />
    )

    await waitFor(() => {
      expect(screen.getByText('codex/editorial-cms')).toBeVisible()
    })

    const workspace = container.querySelector('#articles-workspace') as HTMLElement
    vi.spyOn(workspace, 'getBoundingClientRect').mockReturnValue({
      bottom: 700, height: 640, left: 0, right: 1098, top: 60,
      width: 1098, x: 0, y: 60, toJSON: () => ({})
    })

    expect(workspace.style.getPropertyValue('--editor-width')).toBe('486px')
    const sidebarSeparator = screen.getByRole('separator', { name: '调整文章列表宽度' })
    const contentSeparator = screen.getByRole('separator', { name: '调整编辑与预览比例' })
    expect(sidebarSeparator).toHaveAttribute('aria-valuemax', '346')
    expect(sidebarSeparator).toHaveAttribute('aria-valuenow', '280')
    expect(contentSeparator).toHaveAttribute('aria-valuemin', '52')
    expect(contentSeparator).toHaveAttribute('aria-valuemax', '60')
    expect(contentSeparator).toHaveAttribute('aria-valuenow', '60')

    contentSeparator.focus()
    await user.keyboard('{ArrowLeft}')

    expect(workspace.style.getPropertyValue('--editor-width')).toBe('478px')
  })
})
