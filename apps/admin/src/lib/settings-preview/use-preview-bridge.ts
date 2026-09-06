'use client'

import {
  createSettingsPreviewModel,
  parseSettingsPreviewMessage,
  type EnvironmentReadiness,
  type SettingsPreviewGroup,
  type SettingsPreviewModel,
  type SiteConfiguration
} from '@jiahim/site-schema'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { siteOriginFromUrl } from './origin'

export type SettingsPreviewConnectionStatus = 'ready' | 'loading' | 'stale' | 'disconnected'

interface UseSettingsPreviewBridgeOptions {
  config: SiteConfiguration
  group: SettingsPreviewGroup
  iframeRef: RefObject<HTMLIFrameElement | null>
  readiness: readonly EnvironmentReadiness[]
  siteUrl: string
  path: string
  onNavigate?: (href: string) => void
}

function project(config: SiteConfiguration, group: SettingsPreviewGroup, readiness: readonly EnvironmentReadiness[]): SettingsPreviewModel | null {
  try {
    return createSettingsPreviewModel(config, group, readiness)
  } catch {
    return null
  }
}

export function useSettingsPreviewBridge({ config, group, iframeRef, readiness, siteUrl, path, onNavigate }: UseSettingsPreviewBridgeOptions) {
  const [sessionId] = useState(() => crypto.randomUUID())
  const [ready, setReady] = useState(false)
  const initialModel = useMemo(() => project(config, group, readiness), [])
  const [model, setModel] = useState<SettingsPreviewModel | null>(initialModel)
  const [currentValid, setCurrentValid] = useState(Boolean(initialModel))
  const modelRef = useRef(model)
  modelRef.current = model

  let siteOrigin = ''
  try {
    siteOrigin = siteOriginFromUrl(siteUrl)
  } catch {
    siteOrigin = ''
  }

  const iframeUrl = useMemo(() => {
    if (!siteOrigin) return ''
    const target = new URL(path || '/', `${siteOrigin}/`)
    target.searchParams.set('site-preview', '1')
    target.searchParams.set('previewSession', sessionId)
    return target.toString()
  }, [path, sessionId, siteOrigin])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextModel = project(config, group, readiness)
      setCurrentValid(Boolean(nextModel))
      if (!nextModel) return
      modelRef.current = nextModel
      setModel(nextModel)
      if (ready && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { kind: 'settings-preview:update', version: 1, sessionId, model: nextModel },
          siteOrigin
        )
      }
    }, 150)
    return () => window.clearTimeout(timer)
  }, [config, group, iframeRef, readiness, ready, sessionId, siteOrigin])

  useEffect(() => {
    if (!siteOrigin) return
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== siteOrigin || event.source !== iframeRef.current?.contentWindow) return
      let message
      try {
        message = parseSettingsPreviewMessage(event.data)
      } catch {
        return
      }
      if (message.sessionId !== sessionId) return
      if (message.kind === 'settings-preview:ready') {
        setReady(true)
        if (modelRef.current) {
          iframeRef.current?.contentWindow?.postMessage(
            { kind: 'settings-preview:update', version: 1, sessionId, model: modelRef.current },
            siteOrigin
          )
        }
      } else if (message.kind === 'settings-preview:navigate') {
        onNavigate?.(message.href)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [iframeRef, onNavigate, sessionId, siteOrigin])

  const status: SettingsPreviewConnectionStatus = !siteOrigin
    ? 'disconnected'
    : !currentValid
      ? 'stale'
      : ready
        ? 'ready'
        : 'loading'

  return { iframeUrl, model, sessionId, status }
}
