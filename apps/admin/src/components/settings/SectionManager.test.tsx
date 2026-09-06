import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { describe, expect, it, vi } from 'vitest'

import { SectionManager } from './SectionManager'

describe('SectionManager', () => {
  it('previews and submits a new nested section', async () => {
    const user = userEvent.setup()
    const onApplied = vi.fn()
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      config: createDefaultSiteConfiguration(), baseHash: 'b'.repeat(64), changedPaths: []
    }), { status: 201, headers: { 'Content-Type': 'application/json' } })) as typeof fetch

    render(<SectionManager baseHash={'a'.repeat(64)} config={createDefaultSiteConfiguration()} fetcher={fetcher} onApplied={onApplied} />)
    await user.click(screen.getByRole('button', { name: '新增栏目' }))
    fireEvent.change(screen.getByLabelText('新栏目名称'), { target: { value: 'Vue 深入' } })
    fireEvent.change(screen.getByLabelText('新栏目 slug'), { target: { value: 'vue-deep' } })
    fireEvent.keyDown(screen.getByRole('combobox', { name: '父栏目' }), { key: '技' })

    expect(screen.getByText('/zh/skill/vue-deep/')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认创建栏目' }))
    expect(fetcher).toHaveBeenCalledWith('/api/settings/sections', expect.objectContaining({ method: 'POST' }))
    expect(onApplied).toHaveBeenCalledOnce()
  }, 15_000)

  it('submits navigation choices and reports article count in an AlertDialog before archive confirmation', async () => {
    const user = userEvent.setup()
    const config = createDefaultSiteConfiguration()
    const fetcher = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/settings/sections/skill') {
        return new Response(JSON.stringify({ articleCount: 7 }), { headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ config, baseHash: 'b'.repeat(64), changedPaths: [], articleCount: 7 }), { headers: { 'Content-Type': 'application/json' } })
    })

    render(<SectionManager baseHash={'a'.repeat(64)} config={config} fetcher={fetcher as typeof fetch} onApplied={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '新增栏目' }))
    await user.type(screen.getByLabelText('新栏目名称'), '项目')
    await user.type(screen.getByLabelText('新栏目 slug'), 'projects')
    await user.click(screen.getByLabelText('新栏目显示在顶部导航'))
    await user.click(screen.getByRole('button', { name: '确认创建栏目' }))
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({ header: true, sidebar: true, collapsed: false })

    await user.click(screen.getAllByRole('button', { name: '归档栏目' })[1])
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('7 篇文章')
    await user.click(screen.getByRole('button', { name: '确认归档' }))
    expect(fetcher).toHaveBeenCalledWith('/api/settings/sections/skill', expect.anything())
    expect(fetcher).toHaveBeenCalledWith('/api/settings/sections/skill/archive', expect.objectContaining({ method: 'POST' }))
  })

  it('uses the shared Button layer and keeps archive spacing inside each section item', () => {
    const { container } = render(<SectionManager baseHash={'a'.repeat(64)} config={createDefaultSiteConfiguration()} fetcher={vi.fn() as typeof fetch} onApplied={vi.fn()} />)
    expect(screen.getByRole('button', { name: '新增栏目' })).toHaveAttribute('data-slot', 'button')
    expect(screen.getAllByRole('button', { name: '归档栏目' })[0]?.closest('[data-section-item]')).toHaveClass('gap-3')
    expect(container.querySelector('.primary-button')).toBeNull()
    expect(container.querySelector('.quiet-button')).toBeNull()
  })

  it('blocks section transactions while an unsaved settings draft exists', () => {
    render(<SectionManager baseHash={'a'.repeat(64)} config={createDefaultSiteConfiguration()} disabled fetcher={vi.fn() as typeof fetch} onApplied={vi.fn()} />)
    expect(screen.getByRole('button', { name: '新增栏目' })).toBeDisabled()
    expect(screen.getByText(/先保存或放弃当前设置草稿/)).toBeInTheDocument()
  })
})
