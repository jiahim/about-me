import { Expand, Focus, Monitor, Smartphone, Tablet } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { SettingsPreviewMode, SettingsPreviewPreferences, SettingsPreviewViewport, SettingsPreviewZoom } from '@/lib/settings-preview/preferences'

interface PreviewToolbarProps {
  preferences: SettingsPreviewPreferences
  onModeChange: (mode: SettingsPreviewMode) => void
  onViewportChange: (viewport: SettingsPreviewViewport) => void
  onZoomChange: (zoom: SettingsPreviewZoom) => void
  onFullscreen: () => void
}

export function PreviewToolbar({ preferences, onModeChange, onViewportChange, onZoomChange, onFullscreen }: PreviewToolbarProps) {
  const viewports: Array<[SettingsPreviewViewport, string, React.ReactNode]> = [
    ['responsive', '自适应', <Expand aria-hidden="true" className="size-4" />],
    ['desktop', '桌面', <Monitor aria-hidden="true" className="size-4" />],
    ['tablet', '平板', <Tablet aria-hidden="true" className="size-4" />],
    ['mobile', '手机', <Smartphone aria-hidden="true" className="size-4" />]
  ]
  return <div className="settings-preview-toolbar" aria-label="网站预览控制">
    <Button size="sm" variant={preferences.mode === 'focus' ? 'secondary' : 'ghost'} onClick={() => onModeChange('focus')}><Focus aria-hidden="true" />聚焦模块</Button>
    <Button size="sm" variant={preferences.mode === 'page' ? 'secondary' : 'ghost'} onClick={() => onModeChange('page')}>完整页面</Button>
    <span className="settings-preview-toolbar__divider" aria-hidden="true" />
    {viewports.map(([value, label, icon]) => <Button aria-label={label} key={value} size="icon" variant={preferences.viewport === value ? 'secondary' : 'ghost'} onClick={() => onViewportChange(value)}>{icon}</Button>)}
    <span className="settings-preview-toolbar__divider" aria-hidden="true" />
    {(['fit', 75, 100, 125] as const).map((zoom) => <Button key={zoom} size="sm" variant={preferences.zoom === zoom ? 'secondary' : 'ghost'} onClick={() => onZoomChange(zoom)}>{zoom === 'fit' ? '适应' : `${zoom}%`}</Button>)}
    <Button aria-label="全屏预览" className="ml-auto" size="icon" variant="outline" onClick={onFullscreen}><Expand aria-hidden="true" /></Button>
  </div>
}
