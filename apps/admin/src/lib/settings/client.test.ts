import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requestSettingsJson, SETTINGS_SESSION_STORAGE_KEY } from './client'

describe('settings client session header', () => {
  beforeEach(() => sessionStorage.clear())

  it('sends the stored opaque session and refreshes it from safe response status', async () => {
    sessionStorage.setItem(SETTINGS_SESSION_STORAGE_KEY, 'old-session')
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      session: { id: 'new-session', publishablePaths: [], rejectedPaths: [], expiresAt: 1 }
    }), { status: 200 }))
    await requestSettingsJson('/api/settings', {}, fetcher)
    expect((fetcher.mock.calls[0][1].headers as Headers).get('x-settings-session')).toBe('old-session')
    expect(sessionStorage.getItem(SETTINGS_SESSION_STORAGE_KEY)).toBe('new-session')
  })

  it('removes a server-rejected session while leaving browser drafts untouched', async () => {
    sessionStorage.setItem(SETTINGS_SESSION_STORAGE_KEY, 'expired-session')
    localStorage.setItem('jiahim:site-settings-draft:v1', 'draft')
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: '设置发布会话已过期，请重新加载设置' }), { status: 409 }))
    await expect(requestSettingsJson('/api/settings/session', {}, fetcher)).rejects.toThrow(/过期/)
    expect(sessionStorage.getItem(SETTINGS_SESSION_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem('jiahim:site-settings-draft:v1')).toBe('draft')
  })
})
