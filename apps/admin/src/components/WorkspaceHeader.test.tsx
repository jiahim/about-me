import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WorkspaceHeader } from './WorkspaceHeader'

const stylesheet = readFileSync(
  resolve(process.cwd(), 'src/app/globals.css'),
  'utf8'
)

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
      rule.selectorText.split(',').map((part) => part.trim()).includes(selector)
  )
  style.remove()
  return result
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

describe('WorkspaceHeader 模式切换', () => {
  it('使用可访问 tablist 切换文章与设置动作', async () => {
    const onModeChange = vi.fn()
    render(
      <WorkspaceHeader
        busy={false}
        dirty
        gitStatus={null}
        hasArticle
        mergeEnabled={false}
        mode="settings"
        publishEnabled={false}
        settingsLoaded
        onDiff={vi.fn()}
        onMerge={vi.fn()}
        onModeChange={onModeChange}
        onPublish={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(screen.getByRole('tab', { name: '站点设置' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.queryByRole('button', { name: '提交并推送' })).toBeNull()
    await userEvent.click(screen.getByRole('tab', { name: '文章管理' }))
    expect(onModeChange).toHaveBeenCalledWith('articles')
  })

  it('keeps the workspace mode tabs on one horizontal row', () => {
    render(
      <>
        <style>{stylesheet}</style>
        <WorkspaceHeader
          busy={false}
          dirty={false}
          gitStatus={null}
          hasArticle={false}
          mergeEnabled={false}
          mode="articles"
          publishEnabled={false}
          settingsLoaded={false}
          onDiff={vi.fn()}
          onMerge={vi.fn()}
          onModeChange={vi.fn()}
          onPublish={vi.fn()}
          onSave={vi.fn()}
        />
      </>
    )

    const tabs = screen.getByRole('tablist', { name: '工作区模式' })
    expect(getComputedStyle(tabs).display).toBe('flex')
    expect(getComputedStyle(tabs).flexDirection).toBe('row')

    const desktopDisplayOverrides = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .flatMap((rule) => {
        if (!(rule instanceof CSSStyleRule)) return []
        if (rule.selectorText.includes('@custom-variant')) return []
        try {
          if (!tabs.matches(rule.selectorText)) return []
        } catch {
          return []
        }
        if (!rule.style.display || rule.style.display === 'flex') return []
        return [rule.selectorText]
      })

    expect(desktopDisplayOverrides).toEqual([])
  })

  it('uses the shared CJK sans family for Chinese and Latin header text', () => {
    render(
      <>
        <style>{stylesheet}</style>
        <WorkspaceHeader
          busy={false}
          dirty={false}
          gitStatus={null}
          hasArticle
          mergeEnabled={false}
          mode="articles"
          publishEnabled={false}
          settingsLoaded
          onDiff={vi.fn()}
          onMerge={vi.fn()}
          onModeChange={vi.fn()}
          onPublish={vi.fn()}
          onSave={vi.fn()}
        />
      </>
    )

    const bodyFamily = effectiveFontFamily(document.body)
    const representativeText = [
      screen.getByText('Jia him'),
      screen.getByRole('tab', { name: '文章管理' }),
      screen.getByRole('button', { name: '保存' })
    ]

    expect(bodyFamily.split(',')[0]?.trim()).toBe('"Noto Sans SC"')
    expect(bodyFamily).not.toMatch(/\bInter\b|Georgia|Times New Roman|Songti SC|STSong/)
    for (const element of representativeText) {
      expect(effectiveFontFamily(element)).toBe(bodyFamily)
    }
  })

  it('uses the unified semantic component layer for direct and overflow actions', async () => {
    const onSave = vi.fn()
    const { container } = render(
      <WorkspaceHeader
        busy={false}
        dirty
        gitStatus={{
          branch: 'codex/editorial-cms',
          changedFiles: [{
            path: 'config/site.config.json',
            indexStatus: ' ',
            worktreeStatus: 'M',
            kind: 'ordinary'
          }],
          ahead: 0,
          behind: 0,
          conflicts: [],
          defaultBranch: 'main',
          remote: 'origin',
          operation: 'none',
          canWrite: true,
          blockReason: '请先同步远端变更'
        }}
        hasArticle
        mergeEnabled={false}
        mode="articles"
        publishEnabled={false}
        settingsLoaded
        onDiff={vi.fn()}
        onMerge={vi.fn()}
        onModeChange={vi.fn()}
        onPublish={vi.fn()}
        onSave={onSave}
      />
    )

    expect(container.querySelector('.primary-button')).toBeNull()
    expect(container.querySelector('.quiet-button')).toBeNull()
    expect(container.querySelector('.workspace-mode-tab')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onSave).toHaveBeenCalledOnce()

    const publish = screen.getByRole('button', { name: '提交并推送' })
    expect(publish).toBeDisabled()
    expect(publish.parentElement).toHaveAttribute('data-tooltip', '请先同步远端变更')

    fireEvent.pointerDown(screen.getByRole('button', { name: '更多操作' }), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse'
    })
    expect(Array.from(document.querySelectorAll('[role="menuitem"]')).some((item) => item.textContent === '查看差异')).toBe(true)
  })

  it('moves secondary metadata and merge action into compact affordances at medium widths', () => {
    const onMerge = vi.fn()
    const { container } = render(
      <WorkspaceHeader
        busy={false}
        dirty={false}
        gitStatus={{
          branch: 'codex/editorial-cms', changedFiles: [], ahead: 0, behind: 0,
          conflicts: [], defaultBranch: 'main', remote: 'origin', operation: 'none', canWrite: true
        }}
        hasArticle
        mergeEnabled
        mode="articles"
        publishEnabled
        settingsLoaded
        onDiff={vi.fn()}
        onMerge={onMerge}
        onModeChange={vi.fn()}
        onPublish={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(container.querySelector('.topbar-merge-action')).toHaveTextContent('合并并发布')
    expect(mediaStyleRule('(max-width: 1100px)', '.brand-lockup > .mode-badge')?.style.display).toBe('none')
    expect(mediaStyleRule('(max-width: 1100px)', '.brand-lockup > .branch-badge')?.style.display).toBe('none')
    expect(mediaStyleRule('(max-width: 1100px)', '.topbar-actions > .topbar-merge-action')?.style.display).toBe('none')
    expect(mediaStyleRule('(max-width: 1100px)', '.topbar-publish-action__full')?.style.display).toBe('none')
    expect(mediaStyleRule('(max-width: 1100px)', '.topbar-publish-action__short')?.style.display).toBe('inline')

    fireEvent.pointerDown(screen.getByRole('button', { name: '更多操作' }), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse'
    })
    fireEvent.click(screen.getByRole('menuitem', { name: '合并并发布' }))
    expect(onMerge).toHaveBeenCalledOnce()
  })

  it('offers system, light, and dark themes from a keyboard-operable menu', async () => {
    render(
      <WorkspaceHeader
        busy={false}
        dirty={false}
        gitStatus={null}
        hasArticle
        mergeEnabled={false}
        mode="settings"
        publishEnabled={false}
        settingsLoaded
        onDiff={vi.fn()}
        onMerge={vi.fn()}
        onModeChange={vi.fn()}
        onPublish={vi.fn()}
        onSave={vi.fn()}
      />
    )

    const trigger = screen.getByRole('button', { name: '切换主题' })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    expect(Array.from(document.querySelectorAll('[role="menuitemradio"]')).map((item) => item.textContent)).toEqual([
      '跟随系统',
      '浅色',
      '深色'
    ])
  })
})
