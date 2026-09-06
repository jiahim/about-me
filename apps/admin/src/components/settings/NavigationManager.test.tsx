import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NavigationManager } from './NavigationManager'

describe('NavigationManager', () => {
  it('disables an empty section picker and explains how to make a section available again', () => {
    render(<NavigationManager config={createDefaultSiteConfiguration()} onChange={vi.fn()} />)

    const trigger = screen.getByRole('button', { name: '添加栏目导航' })
    expect(trigger).toBeDisabled()
    expect(screen.getByText('所有启用的顶级栏目均已加入当前语言导航。删除某个导航项后，可在这里重新添加；仅关闭“显示”不会释放它。')).toBeInTheDocument()

    fireEvent.click(trigger)
    expect(screen.queryByRole('dialog', { name: '添加栏目导航' })).not.toBeInTheDocument()
  })

  it('opens on another enabled language when only that language has an available section', () => {
    const config = createDefaultSiteConfiguration()
    config.locales.en.enabled = true
    config.sections.push({
      id: 'notes-en',
      locale: 'en',
      name: 'Notes',
      description: 'English notes',
      directory: 'docs/en/notes',
      route: '/en/notes/',
      order: 0,
      navigation: { header: false, sidebar: true, collapsed: false },
      status: 'active'
    })
    render(<NavigationManager config={config} onChange={vi.fn()} />)

    const trigger = screen.getByRole('button', { name: '添加栏目导航' })
    expect(trigger).toBeEnabled()
    fireEvent.click(trigger)

    expect(screen.getByRole('combobox', { name: '栏目导航语言' })).toHaveTextContent('English')
    expect(screen.getByRole('combobox', { name: '选择栏目' })).toHaveTextContent('Notes')
  })

  it('renders shadcn actions and supports editing, visibility, movement, and removal', () => {
    const onChange = vi.fn()
    const config = createDefaultSiteConfiguration()
    render(<NavigationManager config={config} onChange={onChange} />)

    expect(screen.getByRole('button', { name: '添加栏目导航' })).toHaveAttribute('data-slot', 'button')
    expect(screen.getByRole('button', { name: '添加外部链接' })).toHaveAttribute('data-slot', 'button')

    fireEvent.change(screen.getByRole('textbox', { name: '导航 1 标签' }), { target: { value: '阅读' } })
    expect(onChange).toHaveBeenCalledWith([], expect.objectContaining({
      navigation: expect.arrayContaining([expect.objectContaining({ id: 'nav-book', label: '阅读' })])
    }))

    fireEvent.click(screen.getByRole('switch', { name: '显示导航 1' }))
    expect(onChange).toHaveBeenCalledWith([], expect.objectContaining({
      sections: expect.arrayContaining([expect.objectContaining({
        id: 'book',
        navigation: expect.objectContaining({ header: false })
      })])
    }))

    fireEvent.click(screen.getByRole('button', { name: '下移导航 1' }))
    expect(onChange).toHaveBeenCalledWith([], expect.objectContaining({
      navigation: expect.arrayContaining([expect.objectContaining({ id: 'nav-book', order: 1 })])
    }))

    fireEvent.click(screen.getByRole('button', { name: '删除导航 1' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '确认删除' }))
    expect(onChange).toHaveBeenCalledWith([], expect.objectContaining({
      navigation: expect.not.arrayContaining([expect.objectContaining({ id: 'nav-book' })])
    }))
  })

  it('opens typed dialogs for section and external-link creation', () => {
    const config = createDefaultSiteConfiguration()
    config.navigation = config.navigation.slice(1).map((item, order) => ({ ...item, order }))
    config.sections[0].navigation.header = false
    render(<NavigationManager config={config} onChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '添加栏目导航' }))
    expect(screen.getByRole('dialog', { name: '添加栏目导航' })).toBeInTheDocument()
    expect(screen.getByText('读书')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    fireEvent.click(screen.getByRole('button', { name: '添加外部链接' }))
    expect(screen.getByRole('dialog', { name: '添加外部链接' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '外链名称' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '外链 URL' })).toBeInTheDocument()
  })
})
