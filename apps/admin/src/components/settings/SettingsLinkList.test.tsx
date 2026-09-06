import type { PublicLink } from '@jiahim/site-schema'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, it } from 'vitest'

import { SettingsLinkList } from './SettingsLinkList'

const initialLinks: PublicLink[] = [
  { label: 'First', href: 'https://first.example', newTab: false },
  { label: 'Second', href: 'https://second.example', newTab: true }
]

function Harness() {
  const [links, setLinks] = useState(initialLinks)
  return (
    <SettingsLinkList
      itemLabel="普通链接"
      links={links}
      title="普通链接"
      onChange={setLinks}
    />
  )
}

it('adds, deletes and reorders complete link objects with guarded boundaries', async () => {
  const user = userEvent.setup()
  render(<Harness />)

  expect(screen.getByRole('button', { name: '上移普通链接 1' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '下移普通链接 2' })).toBeDisabled()

  await user.click(screen.getByRole('button', { name: '上移普通链接 2' }))
  const firstCard = screen.getByRole('group', { name: '普通链接 1' })
  expect(within(firstCard).getByRole('textbox', { name: '普通链接 1 名称' }))
    .toHaveValue('Second')
  expect(within(firstCard).getByRole('checkbox', { name: '新窗口打开' }))
    .toBeChecked()

  await user.click(screen.getByRole('button', { name: '新增普通链接' }))
  expect(screen.getByRole('group', { name: '普通链接 3' })).toBeVisible()
  expect(screen.getByRole('textbox', { name: '普通链接 3 名称' })).toHaveValue('')

  await user.click(screen.getByRole('button', { name: '删除普通链接 2' }))
  expect(screen.queryByDisplayValue('First')).not.toBeInTheDocument()
  expect(screen.getByDisplayValue('Second')).toBeVisible()
})
