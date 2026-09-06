import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { SettingsSectionCard } from './SettingsSectionCard'

it('explains section state and protected fields in product language', () => {
  const section = createDefaultSiteConfiguration().sections[0]
  render(<SettingsSectionCard index={0} section={section} onChange={vi.fn()} />)

  expect(screen.getByText('已启用')).toBeVisible()
  expect(screen.getByText('排序第 1 位')).toBeVisible()
  expect(screen.getByText('顶级栏目')).toBeVisible()
  expect(screen.queryByText('book · active · order 0')).not.toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: '栏目名称' })).toBeVisible()
  expect(screen.getByRole('textbox', { name: '栏目描述' })).toBeVisible()
  expect(screen.getByRole('textbox', { name: '内容目录（只读）' })).toHaveAttribute('readonly')
  expect(screen.getByRole('textbox', { name: '公开路由（只读）' })).toHaveAttribute('readonly')
  expect(screen.queryByRole('switch', { name: '显示在顶部导航' })).not.toBeInTheDocument()
  expect(screen.getByText(/请在“导航”模块管理/)).toBeVisible()
})
