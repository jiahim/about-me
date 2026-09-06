import {
  SETTINGS_PREVIEW_PROTOCOL_VERSION,
  parseSettingsPreviewMessage,
  type SettingsPreviewModel
} from '@jiahim/site-schema'

import { applySettingsPreviewModel } from './runtime-projection'

interface PreviewWindow {
  parent: Pick<Window, 'postMessage'> | Window
  location: Pick<Location, 'origin' | 'search'> | URL
  addEventListener: Window['addEventListener']
  removeEventListener: Window['removeEventListener']
}

export interface InstallSettingsPreviewBridgeOptions {
  window: PreviewWindow
  document: Document
  allowedOrigins: readonly string[]
  parentOrigin: string
  sessionId: string
  applyModel?: (document: Document, model: SettingsPreviewModel) => () => void
}

function normalizeAllowedOrigins(values: readonly string[]): Set<string> {
  return new Set(values.flatMap((value) => {
    try {
      return [new URL(value).origin]
    } catch {
      return []
    }
  }))
}

export function installSettingsPreviewBridge(options: InstallSettingsPreviewBridgeOptions): () => void {
  const allowedOrigins = normalizeAllowedOrigins(options.allowedOrigins)
  if (!options.sessionId || !allowedOrigins.has(options.parentOrigin)) return () => undefined

  let projectionCleanup: (() => void) | undefined
  let readyTimer: number | undefined
  const applyModel = options.applyModel ?? applySettingsPreviewModel
  const postReady = () => {
    options.window.parent.postMessage(
      { kind: 'settings-preview:ready', version: SETTINGS_PREVIEW_PROTOCOL_VERSION, sessionId: options.sessionId },
      options.parentOrigin
    )
  }
  const stopReadyHandshake = () => {
    if (readyTimer === undefined) return
    window.clearInterval(readyTimer)
    readyTimer = undefined
  }
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== options.parentOrigin || event.source !== options.window.parent) return
    let message
    try {
      message = parseSettingsPreviewMessage(event.data)
    } catch {
      return
    }
    if (message.sessionId !== options.sessionId || message.kind !== 'settings-preview:update') return
    stopReadyHandshake()
    projectionCleanup?.()
    projectionCleanup = applyModel(options.document, message.model)
  }
  const onClick = (event: MouseEvent) => {
    const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!anchor || anchor.target === '_blank') return
    const target = new URL(anchor.href, options.window.location.origin)
    if (target.origin !== options.window.location.origin) return
    event.preventDefault()
    options.window.parent.postMessage(
      { kind: 'settings-preview:navigate', version: SETTINGS_PREVIEW_PROTOCOL_VERSION, sessionId: options.sessionId, href: `${target.pathname}${target.search}${target.hash}` },
      options.parentOrigin
    )
  }

  options.window.addEventListener('message', onMessage)
  options.document.addEventListener('click', onClick)
  postReady()
  readyTimer = window.setInterval(postReady, 1_000)

  return () => {
    stopReadyHandshake()
    options.window.removeEventListener('message', onMessage)
    options.document.removeEventListener('click', onClick)
    projectionCleanup?.()
  }
}

export function activateSettingsPreviewBridge(): () => void {
  const parameters = new URLSearchParams(window.location.search)
  const sessionId = parameters.get('previewSession') ?? ''
  if (parameters.get('site-preview') !== '1' || !sessionId || !document.referrer) return () => undefined

  let parentOrigin: string
  try {
    parentOrigin = new URL(document.referrer).origin
  } catch {
    return () => undefined
  }
  const allowedOrigins = String(import.meta.env.VITE_SETTINGS_PREVIEW_ADMIN_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return installSettingsPreviewBridge({ window, document, allowedOrigins, parentOrigin, sessionId })
}
