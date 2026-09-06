// @vitest-environment jsdom

import { createDefaultSiteConfiguration, createSettingsPreviewModel } from '@jiahim/site-schema'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { installSettingsPreviewBridge } from './bridge'

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('settings preview bridge', () => {
  it('accepts only the exact parent, origin, version, and session', () => {
    const parent = { postMessage: vi.fn() }
    const applyModel = vi.fn(() => vi.fn())
    const bridgeWindow = {
      parent,
      location: new URL('http://127.0.0.1:5173/zh/?site-preview=1'),
      addEventListener: window.addEventListener.bind(window),
      removeEventListener: window.removeEventListener.bind(window)
    }
    const model = createSettingsPreviewModel(createDefaultSiteConfiguration(), 'homepage', [])
    const cleanup = installSettingsPreviewBridge({
      window: bridgeWindow,
      document,
      allowedOrigins: ['http://192.168.5.21:3000'],
      parentOrigin: 'http://192.168.5.21:3000',
      sessionId: 'session-1',
      applyModel
    })
    const valid = { kind: 'settings-preview:update', version: 1, sessionId: 'session-1', model }

    window.dispatchEvent(new MessageEvent('message', { data: valid, origin: 'http://evil.test', source: parent as never }))
    window.dispatchEvent(new MessageEvent('message', { data: valid, origin: 'http://192.168.5.21:3000', source: window }))
    window.dispatchEvent(new MessageEvent('message', { data: { ...valid, version: 2 }, origin: 'http://192.168.5.21:3000', source: parent as never }))
    window.dispatchEvent(new MessageEvent('message', { data: { ...valid, sessionId: 'other' }, origin: 'http://192.168.5.21:3000', source: parent as never }))
    window.dispatchEvent(new MessageEvent('message', { data: valid, origin: 'http://192.168.5.21:3000', source: parent as never }))

    expect(parent.postMessage).toHaveBeenCalledWith(
      { kind: 'settings-preview:ready', version: 1, sessionId: 'session-1' },
      'http://192.168.5.21:3000'
    )
    expect(applyModel).toHaveBeenCalledTimes(1)

    cleanup()
    window.dispatchEvent(new MessageEvent('message', { data: valid, origin: 'http://192.168.5.21:3000', source: parent as never }))
    expect(applyModel).toHaveBeenCalledTimes(1)
  })

  it('cleans the previous runtime projection before applying a new one', () => {
    const firstCleanup = vi.fn()
    const secondCleanup = vi.fn()
    const applyModel = vi.fn().mockReturnValueOnce(firstCleanup).mockReturnValueOnce(secondCleanup)
    const parent = { postMessage: vi.fn() }
    const model = createSettingsPreviewModel(createDefaultSiteConfiguration(), 'appearance', [])
    const cleanup = installSettingsPreviewBridge({
      window: {
        parent,
        location: new URL('http://127.0.0.1:5173/'),
        addEventListener: window.addEventListener.bind(window),
        removeEventListener: window.removeEventListener.bind(window)
      },
      document,
      allowedOrigins: ['http://127.0.0.1:3000'],
      parentOrigin: 'http://127.0.0.1:3000',
      sessionId: 's',
      applyModel
    })
    const message = { kind: 'settings-preview:update', version: 1, sessionId: 's', model }

    for (let index = 0; index < 2; index += 1) {
      window.dispatchEvent(new MessageEvent('message', { data: message, origin: 'http://127.0.0.1:3000', source: parent as never }))
    }
    expect(firstCleanup).toHaveBeenCalledOnce()
    cleanup()
    expect(secondCleanup).toHaveBeenCalledOnce()
  })

  it('retries the ready handshake until the first valid update arrives', () => {
    vi.useFakeTimers()
    const parent = { postMessage: vi.fn() }
    const applyModel = vi.fn(() => vi.fn())
    const model = createSettingsPreviewModel(createDefaultSiteConfiguration(), 'homepage', [])
    const bridgeWindow = {
      parent,
      location: new URL('http://127.0.0.1:5173/zh/?site-preview=1'),
      addEventListener: window.addEventListener.bind(window),
      removeEventListener: window.removeEventListener.bind(window)
    }
    const cleanup = installSettingsPreviewBridge({
      window: bridgeWindow,
      document,
      allowedOrigins: ['http://127.0.0.1:3000'],
      parentOrigin: 'http://127.0.0.1:3000',
      sessionId: 'retry-session',
      applyModel
    })

    expect(parent.postMessage).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(2_000)
    expect(parent.postMessage).toHaveBeenCalledTimes(3)

    window.dispatchEvent(new MessageEvent('message', {
      data: { kind: 'settings-preview:update', version: 1, sessionId: 'retry-session', model },
      origin: 'http://127.0.0.1:3000',
      source: parent as never
    }))
    vi.advanceTimersByTime(2_000)
    expect(parent.postMessage).toHaveBeenCalledTimes(3)
    expect(applyModel).toHaveBeenCalledOnce()

    cleanup()
  })
})
