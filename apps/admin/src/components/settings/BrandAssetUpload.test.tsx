import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { BrandAssetUpload } from './BrandAssetUpload'

describe('BrandAssetUpload', () => {
  it('uploads a selected file and returns safe metadata for field updates', async () => {
    const user = userEvent.setup()
    const onUploaded = vi.fn()
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      path: 'docs/public/images/site/logo-me-deadbeef.png',
      publicUrl: '/images/site/logo-me-deadbeef.png',
      mimeType: 'image/png',
      suggestedAlt: 'me',
      changedPaths: ['docs/public/images/site/logo-me-deadbeef.png']
    }), { status: 201, headers: { 'Content-Type': 'application/json' } })) as typeof fetch
    render(<BrandAssetUpload kind="logo" label="上传 Logo" fetcher={fetcher} onUploaded={onUploaded} />)

    await user.upload(screen.getByLabelText('上传 Logo'), new File(['png'], 'me.png', { type: 'image/png' }))

    expect(fetcher).toHaveBeenCalledWith('/api/settings/assets', expect.objectContaining({ method: 'POST' }))
    expect(onUploaded).toHaveBeenCalledWith(expect.objectContaining({ publicUrl: '/images/site/logo-me-deadbeef.png', mimeType: 'image/png', suggestedAlt: 'me' }))
  })
})
