import type { RefObject } from 'react'

import { ScrollArea } from '@/components/ui/scroll-area'
import type { SettingsPreviewConnectionStatus } from '@/lib/settings-preview/use-preview-bridge'
import type { SettingsPreviewViewport, SettingsPreviewZoom } from '@/lib/settings-preview/preferences'

const VIEWPORT_WIDTHS: Record<Exclude<SettingsPreviewViewport, 'responsive'>, number> = { desktop: 1280, tablet: 768, mobile: 390 }

interface PreviewCanvasProps {
  iframeRef: RefObject<HTMLIFrameElement | null>
  iframeUrl: string
  status: SettingsPreviewConnectionStatus
  title: string
  viewport: SettingsPreviewViewport
  zoom: SettingsPreviewZoom
}

export function PreviewCanvas({ iframeRef, iframeUrl, status, title, viewport, zoom }: PreviewCanvasProps) {
  const width = viewport === 'responsive' ? '100%' : `${VIEWPORT_WIDTHS[viewport]}px`
  const numericZoom = zoom === 'fit' ? (viewport === 'responsive' ? 1 : 0.75) : zoom / 100
  return <div className="settings-preview-canvas" data-status={status}>
    {status === 'stale' && <p className="settings-preview-status settings-preview-status--warning">预览仍为上次有效版本</p>}
    {status === 'disconnected' && <p className="settings-preview-status settings-preview-status--error">站点预览地址不可用</p>}
    {status === 'loading' && <p className="settings-preview-status">正在连接真实网站预览…</p>}
    <ScrollArea className="settings-preview-scroll-area">
      <div
        className="settings-preview-device"
        data-testid="settings-preview-device"
        style={{ width, transform: `scale(${numericZoom})`, transformOrigin: 'top left' }}
      >
        {iframeUrl && <iframe
          ref={iframeRef}
          allow=""
          referrerPolicy="strict-origin"
          sandbox="allow-scripts allow-same-origin"
          src={iframeUrl}
          title={title}
        />}
      </div>
    </ScrollArea>
  </div>
}
