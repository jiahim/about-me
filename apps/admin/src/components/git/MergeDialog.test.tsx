import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { MergeDialog } from './MergeDialog'

it('binds merge confirmation to the displayed PR head OID', async () => {
  const confirm = vi.fn()
  const oid = '0123456789abcdef0123456789abcdef01234567'
  render(<MergeDialog busy={false} open pullRequest={{ number: 42, url: 'https://example.test/42', state: 'OPEN', baseRefName: 'main', headRefName: 'content/settings', headRefOid: oid, mergeStateStatus: 'CLEAN' }} onClose={vi.fn()} onConfirm={confirm} />)
  expect(screen.getByText(oid)).toBeInTheDocument()
  expect(screen.getByText('content/settings')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '确认合并并发布' }))
  expect(confirm).toHaveBeenCalledWith(oid)
})
