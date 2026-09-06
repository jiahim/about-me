import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ComponentProps } from 'react'

import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ArticleSummary, CategoryDefinition } from '@/lib/types'
import { ArticleSidebar, articleCategoryFilterOptions } from './ArticleSidebar'

const stylesheet = readFileSync(
  resolve(process.cwd(), 'src/app/globals.css'),
  'utf8'
)

const categories: CategoryDefinition[] = [
  { id: 'essay', label: '随笔', description: '', directory: 'docs/zh/essay', depth: 0, status: 'active' },
  { id: 'skill', label: '技术文章', description: '', directory: 'docs/zh/skill', parentId: 'essay', depth: 1, status: 'hidden' }
]

const articles: ArticleSummary[] = [
  {
    path: 'docs/zh/essay/note.md',
    category: 'essay',
    title: '一篇文章',
    date: '2026-09-01',
    description: '',
    draft: true
  }
]

type SidebarProps = ComponentProps<typeof ArticleSidebar>

function collectStyleRules(rules: CSSRuleList): CSSStyleRule[] {
  return Array.from(rules).flatMap((rule) => {
    if (rule instanceof CSSStyleRule) return [rule]
    const nestedRules = (rule as CSSRule & { cssRules?: CSSRuleList }).cssRules
    return nestedRules ? collectStyleRules(nestedRules) : []
  })
}

function styleRule(selector: string, declaration?: string): CSSStyleRule | undefined {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => collectStyleRules(sheet.cssRules))
    .find(
      (rule) =>
        rule.selectorText === selector &&
        (!declaration || rule.cssText.includes(declaration))
    )
}

function mediaRule(condition: string): CSSMediaRule | undefined {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => Array.from(sheet.cssRules))
    .find(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule && rule.conditionText === condition
    )
}

function conflictingDisplaySelectors(
  element: Element,
  expectedDisplay: string
): string[] {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => collectStyleRules(sheet.cssRules))
    .flatMap((rule) => {
      try {
        if (!element.matches(rule.selectorText)) return []
      } catch {
        // jsdom cannot parse every selector emitted by Tailwind v4 (for example dark-mode :is()).
        return []
      }
      if (!rule.style.display || rule.style.display === expectedDisplay) return []
      return [rule.selectorText]
    })
}

function effectiveFontFamily(element: HTMLElement): string {
  let current: HTMLElement | null = element

  while (current) {
    const family = getComputedStyle(current).fontFamily.trim()
    if (family && family !== 'inherit') return family
    current = current.parentElement
  }

  return ''
}

function renderSidebar(overrides: Partial<SidebarProps> = {}) {
  const callbacks = {
    onCollapsedChange: overrides.onCollapsedChange ?? vi.fn(),
    onFilterChange: overrides.onFilterChange ?? vi.fn(),
    onNew: overrides.onNew ?? vi.fn(),
    onOpen: overrides.onOpen ?? vi.fn(),
    onQueryChange: overrides.onQueryChange ?? vi.fn()
  }
  const props: SidebarProps = {
    articles,
    categories,
    collapsed: false,
    currentPath: articles[0].path,
    filter: 'all',
    loading: false,
    query: '',
    ...overrides,
    ...callbacks
  }

  render(
    <>
      <style>{stylesheet}</style>
      <div className={'workspace ' + (props.collapsed ? 'workspace--sidebar-collapsed' : '')}>
        <ArticleSidebar {...props} />
        <div />
        <div />
      </div>
    </>
  )
  return callbacks
}

describe('ArticleSidebar', () => {
  it('renders the all view as a flat article stream with category metadata', () => {
    renderSidebar()

    const article = screen.getByRole('button', { name: /一篇文章/ })

    expect(screen.queryByRole('list', { name: '文章目录' })).not.toBeInTheDocument()
    expect(within(article).getByText('随笔')).toHaveClass('article-row__category')
  })

  it('shows the article library by default and requests collapse', async () => {
    const { onCollapsedChange } = renderSidebar()
    expect(screen.getByRole('complementary', { name: '文章列表' })).toBeVisible()
    expect(screen.getByText('一篇文章')).toBeVisible()

    const collapse = screen.getByRole('button', { name: '收起文章列表' })
    expect(collapse).toHaveClass('sidebar-toggle-button')
    expect(collapse.querySelector('svg')).toBeInTheDocument()
    expect(collapse).toHaveAttribute('aria-expanded', 'true')
    expect(getComputedStyle(collapse).position).toBe('absolute')

    await userEvent.click(collapse)
    expect(onCollapsedChange).toHaveBeenCalledWith(true)
  })

  it('animates the sidebar while keeping the compact collapse control discoverable on interaction', () => {
    renderSidebar()

    const workspace = document.querySelector('.workspace') as HTMLElement
    const collapse = screen.getByRole('button', { name: '收起文章列表' })
    const heading = screen.getByText('LIBRARY').parentElement as HTMLElement
    const collapseStyle = getComputedStyle(collapse)
    const workspaceRule = styleRule('.workspace', 'grid-template-columns 220ms')
    const contentRule = styleRule(
      '.article-sidebar:not(.article-sidebar--collapsed) > :not(.sidebar-toggle-button)',
      'sidebar-content-in 180ms'
    )
    const reducedMotionRule = mediaRule('(prefers-reduced-motion: reduce)')
    const reducedMotionStyles = reducedMotionRule
      ? collectStyleRules(reducedMotionRule.cssRules)
      : []
    const interactionRule = Array.from(document.styleSheets)
      .flatMap((sheet) => collectStyleRules(sheet.cssRules))
      .find(
        (rule) =>
          rule.selectorText.includes('.article-sidebar:hover') &&
          rule.selectorText.includes(':focus-visible')
      )

    expect(workspace).toBeVisible()
    expect(heading).toBeVisible()
    expect(workspaceRule?.cssText).toContain('grid-template-columns 220ms')
    expect(collapseStyle.width).toBe('18px')
    expect(collapseStyle.opacity).toBe('0')
    expect(styleRule('.sidebar-toggle-button', 'opacity 140ms')?.cssText).toContain('opacity 140ms')
    expect(contentRule?.cssText).toContain('sidebar-content-in 180ms')
    expect(interactionRule?.cssText).toContain('opacity: 1')
    expect(
      reducedMotionStyles.find((rule) => rule.selectorText.includes('.workspace'))?.cssText
    ).toContain('transition: none')
    expect(
      reducedMotionStyles.find((rule) => rule.selectorText.includes('.article-sidebar:not'))?.cssText
    ).toContain('animation: none')

    collapse.focus()
    expect(document.activeElement).toBe(collapse)
  })

  it('renders a compact rail that can restore the article list', async () => {
    const { onCollapsedChange } = renderSidebar({ collapsed: true })
    expect(screen.queryByText('一篇文章')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新建文章' })).not.toBeInTheDocument()

    const workspace = document.querySelector('.workspace--sidebar-collapsed') as HTMLElement
    const sidebar = screen.getByRole('complementary', { name: '文章列表' })

    const expand = screen.getByRole('button', { name: '展开文章列表' })
    expect(expand).toHaveClass('sidebar-toggle-button')
    expect(expand.querySelector('svg')).toBeInTheDocument()
    expect(expand).toHaveAttribute('aria-expanded', 'false')
    expect(getComputedStyle(expand).position).toBe('absolute')
    expect(getComputedStyle(workspace).gridTemplateColumns).toMatch(/^6px\s/)
    expect(getComputedStyle(sidebar).overflow).toBe('visible')
    expect(getComputedStyle(sidebar).padding).toBe('0px')
    expect(getComputedStyle(expand).left).toBe('100%')
    expect(getComputedStyle(expand).right).toBe('auto')
    expect(getComputedStyle(expand).width).toBe('18px')
    expect(getComputedStyle(expand).height).toBe('34px')

    await userEvent.click(expand)
    expect(onCollapsedChange).toHaveBeenCalledWith(false)
  })

  it('keeps nested and hidden categories available in compact filter options', () => {
    expect(articleCategoryFilterOptions(articles, categories)).toEqual([
      { value: 'all', label: '全部文章', count: 1 },
      { value: 'essay', label: '随笔', count: 1 },
      { value: 'skill', label: '技术文章', count: 0 }
    ])
  })

  it('keeps the article stream in the scrolling list instead of the filter control', () => {
    renderSidebar()
    const filterControl = screen.getByRole('combobox', { name: '文章分类' })
    const article = screen.getByRole('button', { name: /一篇文章/ })

    expect(filterControl).not.toContainElement(article)
    expect(document.querySelector('.article-list')).toContainElement(article)
  })

  it.each([
    { filter: 'all' as const, query: '', selected: '全部文章 · 1' },
    { filter: 'essay' as const, query: '', selected: '随笔 · 1' },
    { filter: 'all' as const, query: '文章', selected: '全部文章 · 1' }
  ])(
    'keeps the complete filter set stable for $filter with query "$query"',
    ({ filter, query, selected }) => {
      renderSidebar({ filter, query })
      const select = screen.getByRole('combobox', { name: '文章分类' })

      expect(select).toHaveTextContent(selected)
      expect(articleCategoryFilterOptions(articles, categories).map((option) => `${option.label} · ${option.count}`)).toEqual([
        '全部文章 · 1',
        '随笔 · 1',
        '技术文章 · 0'
      ])
    }
  )

  it('uses one full-width filter row and clips long selected labels', async () => {
    const longLabel = 'category-with-an-extremely-long-unbreakable-name'
    const manyCategories: CategoryDefinition[] = [
      categories[0],
      categories[1],
      { id: 'book', label: '读书', description: '', directory: 'docs/zh/book', depth: 0, status: 'active' },
      { id: 'work', label: '工作', description: '', directory: 'docs/zh/work', depth: 0, status: 'active' },
      { id: 'long', label: longLabel, description: '', directory: 'docs/zh/long', depth: 2, status: 'active' }
    ]
    renderSidebar({ articles: [], categories: manyCategories, currentPath: undefined, filter: 'long' })

    const select = screen.getByRole('combobox', { name: '文章分类' })
    expect(select).toHaveClass('category-filter__trigger')
    expect(getComputedStyle(select).width).toBe('100%')
    expect(getComputedStyle(select).minWidth).toMatch(/^0(?:px)?$/)
    expect(select).toHaveTextContent(`${longLabel} · 0`)
    expect(articleCategoryFilterOptions([], manyCategories)).toHaveLength(6)
  })

  it('uses one CJK sans family for mixed Chinese and Latin sidebar text', () => {
    const mixedTitle = '中文 English title'
    renderSidebar({ articles: [{ ...articles[0], title: mixedTitle }] })

    const filterControl = screen.getByRole('combobox', { name: '文章分类' })
    const bodyFamily = effectiveFontFamily(document.body)
    const representativeText = [
      screen.getByText('LIBRARY'),
      screen.getByRole('heading', { name: '文章' }),
      filterControl,
      screen.getByText(mixedTitle)
    ]

    expect(bodyFamily.split(',')[0]?.trim()).toBe('"Noto Sans SC"')
    expect(bodyFamily).not.toMatch(/\bInter\b|Georgia|Times New Roman|Songti SC|STSong/)
    for (const element of representativeText) {
      expect(effectiveFontFamily(element)).toBe(bodyFamily)
    }
  })

  it('omits the repeated category label from a filtered article but keeps draft state', () => {
    renderSidebar({ filter: 'essay' })
    const article = screen.getByRole('button', { name: /一篇文章/ })

    expect(within(article).queryByText('随笔')).not.toBeInTheDocument()
    expect(within(article).getByText('草稿')).toBeVisible()
  })

  it('does not apply filter-button layout rules to article rows', () => {
    renderSidebar()
    const article = screen.getByRole('button', { name: /一篇文章/ })

    expect(conflictingDisplaySelectors(article, 'grid')).toEqual([])
    expect(getComputedStyle(article).display).toBe('grid')
  })

  it('clips long category names and titles in the all-article stream', () => {
    const longCategory = 'category-with-an-extremely-long-unbreakable-name'
    const longTitle = 'title-with-an-extremely-long-unbreakable-name-that-must-not-overflow'
    renderSidebar({
      articles: [{ ...articles[0], draft: false, title: longTitle }],
      categories: [{ ...categories[0], label: longCategory }],
      filter: 'all'
    })

    const article = screen.getByRole('button', { name: new RegExp(longTitle) })
    const category = within(article).getByText(longCategory, { exact: true })
    const list = document.querySelector('.article-list') as HTMLElement

    expect(category).toHaveClass('article-row__category')
    expect(getComputedStyle(category).overflow).toBe('hidden')
    expect(getComputedStyle(category).textOverflow).toBe('ellipsis')
    expect(getComputedStyle(category).whiteSpace).toBe('nowrap')
    expect(getComputedStyle(within(article).getByText(longTitle)).overflow).toBe('hidden')
    expect(getComputedStyle(list).overflowX).toBe('hidden')
  })

  it('renders a dense two-line article row with the full title available on hover', () => {
    const longTitle = '为什么我自己开发一个能发送请求的网页，无法保存到本地直接使用？'
    renderSidebar({
      articles: [{ ...articles[0], draft: false, title: longTitle }],
      filter: 'essay'
    })

    const article = screen.getByRole('button', { name: new RegExp(longTitle) })
    const title = within(article).getByText(longTitle)
    const meta = article.querySelector('.article-row__meta') as HTMLElement
    const date = within(article).getByText('2026-09-01')
    const titleStyle = getComputedStyle(title)

    expect(article).toHaveAttribute('title', longTitle)
    expect(meta).toContainElement(date)
    expect(date).toHaveClass('article-row__date')
    expect(titleStyle.display).toBe('block')
    expect(titleStyle.overflow).toBe('hidden')
    expect(titleStyle.textOverflow).toBe('ellipsis')
    expect(titleStyle.whiteSpace).toBe('nowrap')
    expect(titleStyle.fontSize).toBe('var(--text-md)')
    expect(getComputedStyle(article).height).toBe('auto')
    expect(getComputedStyle(article).whiteSpace).toBe('normal')
    expect(getComputedStyle(article).textAlign).toBe('left')
    expect(getComputedStyle(article).alignItems).toBe('stretch')
    expect(getComputedStyle(article).justifyContent).toBe('stretch')
    expect(getComputedStyle(date).marginLeft).toBe('auto')
    expect(getComputedStyle(article).paddingTop).toBe('0.25rem')
    expect(getComputedStyle(article).paddingBottom).toBe('0.25rem')
  })

  it('keeps date metadata in compact flat article rows', () => {
    const title = '列表中的普通文章'
    renderSidebar({ articles: [{ ...articles[0], draft: false, title }] })

    const article = screen.getByRole('button', { name: new RegExp(title) })
    const meta = article.querySelector('.article-row__meta') as HTMLElement
    const date = within(article).getByText('2026-09-01')

    expect(meta).toContainElement(date)
    expect(article).toHaveAttribute('title', title)
    expect(getComputedStyle(article).paddingTop).toBe('0.25rem')
    expect(getComputedStyle(article).paddingBottom).toBe('0.25rem')
  })

  it('reports search, category, and article actions', async () => {
    const { onFilterChange, onOpen, onQueryChange } = renderSidebar()

    await userEvent.type(screen.getByRole('searchbox', { name: '搜索文章' }), 'P')
    fireEvent.click(screen.getByRole('button', { name: /一篇文章/ }))
    const categorySelect = screen.getByRole('combobox', { name: '文章分类' })
    fireEvent.keyDown(categorySelect, { key: 'ArrowDown', code: 'ArrowDown' })
    fireEvent.click(screen.getByRole('option', { name: '随笔 · 1' }))

    expect(onQueryChange).toHaveBeenCalledWith('P')
    expect(onFilterChange).toHaveBeenCalledWith('essay')
    expect(onOpen).toHaveBeenCalledWith('docs/zh/essay/note.md')
  })

  it('shows loading without exposing a malformed directory list', () => {
    renderSidebar({ articles: [], categories: [], currentPath: undefined, loading: true })

    expect(screen.getByText('正在读取文章…')).toBeVisible()
    expect(screen.queryByRole('list', { name: '文章目录' })).not.toBeInTheDocument()
  })

  it('shows the empty-category state', () => {
    renderSidebar({ articles: [], categories: [], currentPath: undefined })

    expect(screen.getByText('当前没有可显示的栏目。')).toBeVisible()
  })

  it('shows the empty filtered result state', () => {
    renderSidebar({ articles: [], currentPath: undefined, filter: 'essay' })

    expect(screen.getByText('这里还没有匹配的文章。')).toBeVisible()
  })
})
