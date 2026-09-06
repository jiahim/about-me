import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const stylesheet = readFileSync(
  resolve(process.cwd(), 'src/app/globals.css'),
  'utf8'
)

function resolvedFontSize(element: Element): number {
  const rootStyle = getComputedStyle(document.documentElement)
  const rawValue = getComputedStyle(element).fontSize.trim()
  const token = rawValue.match(/^var\((--[^)]+)\)$/)?.[1]
  const value = token ? rootStyle.getPropertyValue(token).trim() : rawValue

  if (value.endsWith('rem')) {
    const rootSize = rootStyle.fontSize.endsWith('%')
      ? 16 * Number.parseFloat(rootStyle.fontSize) / 100
      : Number.parseFloat(rootStyle.fontSize)
    return Number.parseFloat(value) * rootSize
  }

  return Number.parseFloat(value)
}

function relativeLuminance(color: string): number {
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? []
  const [red = 0, green = 0, blue = 0] = channels.map((channel) => {
    const value = channel / 255
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('admin typography', () => {
  it('uses a legible rem hierarchy across the application chrome', () => {
    const { container } = render(
      <>
        <style>{stylesheet}</style>
        <div className="brand-lockup"><strong>Jia him</strong></div>
        <Tabs value="articles"><TabsList className="workspace-mode-tabs"><TabsTrigger value="articles">文章管理</TabsTrigger></TabsList></Tabs>
        <Button>主要操作</Button>
        <aside className="article-sidebar">
          <div className="sidebar-heading"><h1>文章</h1></div>
          <button className="new-button">新建</button>
          <label className="search-field"><input aria-label="搜索文章" /></label>
          <div className="category-filter"><button className="category-filter__trigger text-sm">全部文章 · 21</button></div>
          <button className="article-row">
            <strong>文章标题</strong>
            <span className="article-row__meta">
              <span className="article-row__category">读书</span>
              <small>2026-09-02</small>
            </span>
          </button>
        </aside>
        <button className="settings-sidebar__item">基础信息</button>
        <section className="settings-form-pane__toolbar"><h1>站点设置</h1></section>
        <p className="dialog-copy">发布说明</p>
      </>
    )

    const sizes = Object.fromEntries(
      [
        ['brand', '.brand-lockup strong'],
        ['workspaceTab', '.workspace-mode-tabs [data-slot="tabs-trigger"]'],
        ['sidebarTitle', '.sidebar-heading h1'],
        ['primaryAction', '.article-sidebar .new-button'],
        ['search', '.search-field input'],
        ['filter', '.category-filter__trigger'],
        ['category', '.article-row__category'],
        ['articleTitle', '.article-row strong'],
        ['articleMeta', '.article-row__meta'],
        ['settingsNav', '.settings-sidebar__item'],
        ['settingsTitle', '.settings-form-pane__toolbar h1'],
        ['dialogCopy', '.dialog-copy']
      ].map(([name, selector]) => [
        name,
        resolvedFontSize(container.querySelector(selector) as Element)
      ])
    )

    expect(getComputedStyle(document.documentElement).fontSize).toBe('100%')
    expect(sizes).toEqual({
      brand: 14,
      workspaceTab: 14,
      sidebarTitle: 24,
      primaryAction: 14,
      search: 14,
      filter: 14,
      category: 12,
      articleTitle: 14,
      articleMeta: 12,
      settingsNav: 14,
      settingsTitle: 20,
      dialogCopy: 14
    })

    const sidebarBackground = 'rgb(235, 229, 217)'
    const date = container.querySelector('.article-row small') as Element

    expect(contrastRatio(getComputedStyle(date).color, sidebarBackground)).toBeGreaterThanOrEqual(4.5)
    const primaryAction = container.querySelector('[data-slot="button"]') as Element
    expect(primaryAction.className).toContain('bg-primary')
    expect(primaryAction.className).not.toContain('primary-button')
    expect(['', 'none']).toContain(
      getComputedStyle(container.querySelector('.workspace-mode-tabs [data-slot="tabs-trigger"]') as Element).boxShadow
    )
  })
})
