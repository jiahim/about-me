import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import { createRef } from 'react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SettingsWorkspace, type SettingsWorkspaceHandle } from './SettingsWorkspace'

const stylesheet = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

function collectStyleRules(rules: CSSRuleList): CSSStyleRule[] {
  return Array.from(rules).flatMap((rule) => {
    if (rule instanceof CSSStyleRule) return [rule]
    const nestedRules = (rule as CSSRule & { cssRules?: CSSRuleList }).cssRules
    return nestedRules ? collectStyleRules(nestedRules) : []
  })
}

function stylesheetRule(selector: string): CSSStyleRule | undefined {
  const style = document.createElement('style')
  style.textContent = stylesheet
  document.head.append(style)
  const rule = collectStyleRules(style.sheet?.cssRules ?? ([] as unknown as CSSRuleList))
    .find((candidate) => candidate.selectorText === selector)
  style.remove()
  return rule
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
      rule.selectorText.split(',').map((part) => part.trim()).includes(selector)
  )
  style.remove()
  return result
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

describe('SettingsWorkspace', () => {
  const session = { id: '11111111-1111-4111-8111-111111111111', expiresAt: Date.now() + 60_000, publishablePaths: [], rejectedPaths: [] }

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('显式校验后携带 baseHash 保存并刷新 Diff', async () => {
    const config = createDefaultSiteConfiguration()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ config, baseHash: 'base-1', normalizedJson: '{}\n', validation: { valid: true, issues: [] }, session }))
      .mockResolvedValueOnce(response({ requirements: [] }))
      .mockResolvedValueOnce(response({ config: { ...config, site: { ...config.site, name: '新站名' } }, normalizedJson: '{}\n', validation: { valid: true, issues: [] } }))
      .mockResolvedValueOnce(response({ config: { ...config, site: { ...config.site, name: '新站名' } }, baseHash: 'base-2', normalizedJson: '{}\n', validation: { valid: true, issues: [] }, session: { ...session, publishablePaths: ['config/site.config.json'] } }))
      .mockResolvedValueOnce(response({ text: 'settings diff', files: [{ path: 'config/site.config.json', kind: 'text', status: 'modified' }] }))
    vi.stubGlobal('fetch', fetchMock)

    render(<SettingsWorkspace active onGitStatusRefresh={vi.fn()} onStateChange={vi.fn()} />)
    const name = await screen.findByRole('textbox', { name: '站点名称' })
    await userEvent.clear(name)
    await userEvent.type(name, '新站名')
    await userEvent.click(screen.getByRole('button', { name: '保存设置' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5))
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toMatchObject({ baseHash: 'base-1' })
    expect((fetchMock.mock.calls[3][1].headers as Headers).get('x-settings-session')).toBe(session.id)
    expect(await screen.findByText('settings diff')).toBeInTheDocument()
  })

  it('保存提示保留在设置工作区的正常布局流中', async () => {
    const config = createDefaultSiteConfiguration()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ config, baseHash: 'base-1', normalizedJson: '{}\n', validation: { valid: true, issues: [] }, session }))
      .mockResolvedValueOnce(response({ requirements: [] }))
      .mockResolvedValueOnce(response({ config: { ...config, site: { ...config.site, name: '新站名' } }, normalizedJson: '{}\n', validation: { valid: true, issues: [] } }))
      .mockResolvedValueOnce(response({ config: { ...config, site: { ...config.site, name: '新站名' } }, baseHash: 'base-2', normalizedJson: '{}\n', validation: { valid: true, issues: [] }, session: { ...session, publishablePaths: ['config/site.config.json'] } }))
      .mockResolvedValueOnce(response({ text: '', files: [] }))
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(
      <>
        <style>{stylesheet}</style>
        <SettingsWorkspace active onGitStatusRefresh={vi.fn()} onStateChange={vi.fn()} />
      </>
    )
    const name = await screen.findByRole('textbox', { name: '站点名称' })
    await userEvent.clear(name)
    await userEvent.type(name, '新站名')
    await userEvent.click(screen.getByRole('button', { name: '保存设置' }))

    const notice = await screen.findByText('设置已保存到本地。请查看差异，确认后可提交并推送。')
    const workspace = container.querySelector('.settings-workspace') as HTMLElement
    const status = notice.closest('.global-status') as HTMLElement
    expect(getComputedStyle(workspace).display).toBe('grid')
    expect(getComputedStyle(status).position).not.toBe('absolute')
    expect(getComputedStyle(status).flexWrap).toBe('wrap')
    expect(status.nextElementSibling).toHaveClass('settings-layout')
  })

  it('在禁用发布动作时直接展示可操作原因，而不是只依赖按钮提示', async () => {
    const config = createDefaultSiteConfiguration()
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ config, baseHash: 'base-1', normalizedJson: '{}\n', validation: { valid: true, issues: [] }, session }))
      .mockResolvedValueOnce(response({ requirements: [] })))

    render(<SettingsWorkspace active publishGuidance={{ tone: 'blocked', message: '暂时无法发布：当前分支为 codex/editorial-cms，设置只允许从 main 提交并推送。' }} onGitStatusRefresh={vi.fn()} onStateChange={vi.fn()} />)

    expect(await screen.findByRole('status', { name: '设置发布状态' })).toHaveTextContent('当前分支为 codex/editorial-cms')
  })

  it('409 时保留编辑内容并提示并发冲突', async () => {
    const config = createDefaultSiteConfiguration()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ config, baseHash: 'base-1', normalizedJson: '{}\n', validation: { valid: true, issues: [] }, session }))
      .mockResolvedValueOnce(response({ requirements: [] }))
      .mockResolvedValueOnce(response({ config, normalizedJson: '{}\n', validation: { valid: true, issues: [] } }))
      .mockResolvedValueOnce(response({ error: '配置已被其他进程修改' }, 409))
    vi.stubGlobal('fetch', fetchMock)

    render(<SettingsWorkspace active onGitStatusRefresh={vi.fn()} onStateChange={vi.fn()} />)
    const name = await screen.findByRole('textbox', { name: '站点名称' })
    await userEvent.clear(name)
    await userEvent.type(name, '保留的站名')
    expect(screen.getByRole('textbox', { name: '站点名称' })).toHaveValue('保留的站名')
    await userEvent.click(screen.getByRole('button', { name: '保存设置' }))

    expect(await screen.findByText(/配置已被其他进程修改/)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '站点名称' })).toHaveValue('保留的站名')
  })

  it('初始加载失败后不自动无限重试', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('暂时不可用'))
    vi.stubGlobal('fetch', fetchMock)

    render(<SettingsWorkspace active onGitStatusRefresh={vi.fn()} onStateChange={vi.fn()} />)

    expect(await screen.findByText('暂时不可用')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('旧哈希草稿只供对照，不直接覆盖服务器配置', async () => {
    const config = createDefaultSiteConfiguration()
    localStorage.setItem('jiahim:site-settings-draft:v1', JSON.stringify({
      version: 1,
      baseHash: 'old-base',
      savedAt: Date.now(),
      config: { ...config, site: { ...config.site, name: '旧草稿站名' } }
    }))
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ config, baseHash: 'new-base', normalizedJson: '{}\n', validation: { valid: true, issues: [] }, session }))
      .mockResolvedValueOnce(response({ requirements: [] }))
    vi.stubGlobal('fetch', fetchMock)

    render(<SettingsWorkspace active onGitStatusRefresh={vi.fn()} onStateChange={vi.fn()} />)
    const name = await screen.findByRole('textbox', { name: '站点名称' })
    expect(name).toHaveValue(config.site.name)
    await userEvent.click(screen.getByRole('button', { name: '查看旧草稿供人工对照' }))

    expect(name).toHaveValue(config.site.name)
    expect(await screen.findByText(/旧草稿站名/)).toBeInTheDocument()
  })

  it('发布确认只发送意图字段并展示成功的 Pull Request 链接', async () => {
    const config = createDefaultSiteConfiguration()
    const publishSession = { ...session, publishablePaths: ['config/site.config.json'] }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ config, baseHash: 'base-1', normalizedJson: '{}\n', validation: { valid: true, issues: [] }, session: publishSession }))
      .mockResolvedValueOnce(response({ requirements: [] }))
      .mockResolvedValueOnce(response({ url: 'https://github.com/jiahim/about-me/pull/42', message: '已提交并推送，Pull Request 等待预览与合并。' }))
    vi.stubGlobal('fetch', fetchMock)
    const ref = createRef<SettingsWorkspaceHandle>()
    render(<SettingsWorkspace active ref={ref} gitRemote="origin" defaultBranch="main" onGitStatusRefresh={vi.fn()} onStateChange={vi.fn()} />)
    await screen.findByRole('textbox', { name: '站点名称' })
    act(() => ref.current?.openPublish())
    await userEvent.click(await screen.findByRole('button', { name: '确认提交并推送' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    const publishCall = fetchMock.mock.calls[2]
    expect(JSON.parse(publishCall[1].body)).toEqual({
      scope: 'settings',
      message: '[Human] config: update site settings',
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    })
    expect((publishCall[1].headers as Headers).get('x-settings-session')).toBe(session.id)
    expect(await screen.findByRole('link', { name: '查看 Pull Request' })).toHaveAttribute('href', 'https://github.com/jiahim/about-me/pull/42')
    expect(sessionStorage.getItem('jiahim:settings-session:v1')).toBeNull()
  })

  it('窄屏入口用 Sheet 分别承载设置分组和真实预览', async () => {
    const config = createDefaultSiteConfiguration()
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ config, baseHash: 'base-1', normalizedJson: '{}\n', validation: { valid: true, issues: [] }, session }))
      .mockResolvedValueOnce(response({ requirements: [] })))
    render(<SettingsWorkspace active onGitStatusRefresh={vi.fn()} onStateChange={vi.fn()} />)
    await screen.findByRole('textbox', { name: '站点名称' })

    await userEvent.click(screen.getByRole('button', { name: '设置分组' }))
    const navigationSheet = screen.getByRole('dialog', { name: '站点设置分组' })
    await userEvent.click(within(navigationSheet).getByRole('button', { name: '导航' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '站点设置分组' })).not.toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: '预览当前模块' }))
    expect(screen.getByRole('dialog', { name: '预览当前模块' })).toBeInTheDocument()
  })

  it('固定设置表单、拖拽条和预览的网格列，避免通用拖拽样式改写排位', () => {
    expect(stylesheetRule('.settings-form-panel')?.style.getPropertyValue('grid-column')).toBe('1')
    expect(stylesheetRule('.settings-resize-handle')?.style.getPropertyValue('grid-column')).toBe('2')
    expect(stylesheetRule('.settings-preview-panel')?.style.getPropertyValue('grid-column')).toBe('3')
  })

  it('把长设置内容限制在可滚动的语义表单区域内', () => {
    const panel = stylesheetRule('.settings-form-panel')
    const scrollRegion = stylesheetRule('.settings-form-panel > .settings-form-pane')

    expect(panel?.style.getPropertyValue('min-height')).toBe('0')
    expect(scrollRegion?.style.height).toBe('100%')
    expect(scrollRegion?.style.overflow).toBe('auto')
  })

  it('在中等宽度切换到单列表单，并通过 Sheet 提供分组与预览', () => {
    const breakpoint = '(max-width: 1024px)'

    expect(mediaStyleRule(breakpoint, '.settings-mobile-actions')?.style.display).toBe('flex')
    expect(mediaStyleRule(breakpoint, '.settings-layout')?.style.getPropertyValue('grid-template-columns')).toContain('minmax(0, 1fr)')
    expect(mediaStyleRule(breakpoint, '.settings-layout > .settings-sidebar')?.style.display).toBe('none')
    expect(mediaStyleRule(breakpoint, '.settings-main-panels > .settings-preview-panel')?.style.display).toBe('none')
    expect(mediaStyleRule(breakpoint, '.settings-main-panels')?.style.display).toBe('block')
  })
})
