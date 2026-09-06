import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { act, renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useSettingsPreviewBridge } from './use-preview-bridge'

describe('useSettingsPreviewBridge', () => {
  it('uses an exact origin and posts the latest model only to the ready iframe', async () => {
    vi.useFakeTimers()
    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    const iframeRef = createRef<HTMLIFrameElement>()
    Object.defineProperty(iframeRef, 'current', { value: iframe })
    const postMessage = vi.spyOn(iframe.contentWindow!, 'postMessage')
    const config = createDefaultSiteConfiguration()
    const { result, rerender } = renderHook(
      ({ value }) => useSettingsPreviewBridge({ config: value, group: 'basic', iframeRef, readiness: [], siteUrl: 'http://192.168.5.21:5173', path: '/zh/' }),
      { initialProps: { value: config } }
    )

    expect(result.current.iframeUrl).toContain('site-preview=1')
    expect(result.current.iframeUrl).toContain('previewSession=')
    act(() => window.dispatchEvent(new MessageEvent('message', {
      data: { kind: 'settings-preview:ready', version: 1, sessionId: result.current.sessionId },
      origin: 'http://192.168.5.21:5173',
      source: iframe.contentWindow
    })))
    expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'settings-preview:update' }), 'http://192.168.5.21:5173')

    rerender({ value: { ...config, site: { ...config.site, name: '新预览名称' } } })
    await act(() => vi.advanceTimersByTimeAsync(150))
    expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ model: expect.objectContaining({ site: expect.objectContaining({ name: '新预览名称' }) }) }), 'http://192.168.5.21:5173')
    vi.useRealTimers()
  })
})
