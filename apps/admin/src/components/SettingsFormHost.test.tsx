import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SettingsFormHost } from './SettingsFormHost'

function renderGroup(group: Parameters<typeof SettingsFormHost>[0]['group']) {
  const onChange = vi.fn()
  const result = render(
    <SettingsFormHost
      busy={false}
      config={createDefaultSiteConfiguration()}
      environmentRequirements={[]}
      group={group}
      normalizedJson="{}\n"
      saveDisabled={false}
      onChange={onChange}
      onSave={vi.fn()}
    />
  )
  return { ...result, onChange }
}

describe('SettingsFormHost', () => {
  it.each([
    ['Logo 路径', ['branding', 'logo', 'src']],
    ['分享图路径', ['branding', 'shareImage', 'src']],
    ['Favicon 路径', ['branding', 'favicon', 'src']],
    ['Apple Touch Icon 路径', ['branding', 'appleTouchIcon', 'src']]
  ] as const)('allows editing %s without rewriting an absolute URL', (label, path) => {
    const { onChange } = renderGroup('branding')
    const input = screen.getByRole('textbox', { name: label })

    expect(input).not.toHaveAttribute('readonly')
    fireEvent.change(input, { target: { value: 'https://cdn.example.com/image.png' } })
    expect(onChange).toHaveBeenLastCalledWith(path, 'https://cdn.example.com/image.png')
  })

  it('only renders branding fields that remain authoritative in schema v2', () => {
    renderGroup('branding')

    expect(screen.queryByRole('textbox', { name: 'Favicon 替代文本' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Apple Touch Icon 替代文本' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '分享图路径' })).toBeInTheDocument()
  })

  it('edits author sameAs as canonical URL values', () => {
    const { onChange } = renderGroup('author')
    const input = screen.getByRole('textbox', { name: '作者主页 1 URL' })

    fireEvent.change(input, { target: { value: 'https://example.com/profile' } })

    expect(onChange).toHaveBeenLastCalledWith(
      ['author', 'sameAs', 0],
      'https://example.com/profile'
    )
    expect(screen.queryByRole('textbox', { name: '头像替代文本' })).not.toBeInTheDocument()
    expect(screen.queryByText('新窗口打开')).not.toBeInTheDocument()
    expect(screen.getByText(/Person JSON-LD/)).toBeInTheDocument()
    expect(screen.getByText(/页脚与社交/)).toBeInTheDocument()
  })

  it('routes navigation through the full CRUD manager and uses the shared save button', () => {
    const { container } = renderGroup('navigation')

    expect(screen.getByRole('button', { name: '保存设置' })).toHaveAttribute('data-slot', 'button')
    expect(screen.getByRole('button', { name: '添加栏目导航' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '添加外部链接' })).toBeInTheDocument()
    expect(container.querySelector('.primary-button')).toBeNull()
  })

  it('uses branding share image as the sole Open Graph image setting', () => {
    renderGroup('seo-geo')

    expect(screen.queryByRole('textbox', { name: 'Open Graph 图片路径' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Open Graph 类型' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Open Graph 站点名' })).toBeInTheDocument()
  })

  it('edits schema v2 social links without a dead new-tab field', () => {
    const { onChange } = renderGroup('footer-social')

    fireEvent.change(screen.getByRole('textbox', { name: '社交链接 1 名称' }), {
      target: { value: 'Source code' }
    })

    expect(onChange).toHaveBeenLastCalledWith(['footer', 'social'], [
      {
        provider: 'github',
        label: 'Source code',
        href: 'https://github.com/xiexin12138'
      }
    ])
    expect(within(screen.getByRole('group', { name: '社交链接 1' })).queryByText('新窗口打开')).not.toBeInTheDocument()
  })

  it('renders advanced settings as ordered full-width semantic blocks', () => {
    const { container } = renderGroup('advanced')
    const grid = container.querySelector('.settings-form-grid') as HTMLElement
    const blocks = Array.from(grid.children) as HTMLElement[]

    expect(grid).toHaveClass('settings-form-grid--advanced')
    expect(blocks.map((block) => block.dataset.settingsAdvancedBlock)).toEqual([
      'schema',
      'languages',
      'environment',
      'json'
    ])
    for (const block of blocks) expect(block).toHaveClass('settings-advanced-section')
  })
})
