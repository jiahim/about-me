'use client'

import { createSettingsPreviewModel, type EnvironmentReadiness, type SettingsPreviewGroup, type SiteConfiguration } from '@jiahim/site-schema'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DEFAULT_SETTINGS_PREVIEW_PREFERENCES, readSettingsPreviewPreferences, writeSettingsPreviewPreferences, type SettingsPreviewMode, type SettingsPreviewPreferences, type SettingsPreviewViewport, type SettingsPreviewZoom } from '@/lib/settings-preview/preferences'
import { useSettingsPreviewBridge } from '@/lib/settings-preview/use-preview-bridge'
import { ArtifactPreview } from './ArtifactPreview'
import { PreviewCanvas } from './PreviewCanvas'
import { PreviewToolbar } from './PreviewToolbar'

const GROUP_LABELS: Record<SettingsPreviewGroup, string> = {
  basic: '基础', branding: '品牌', author: '作者', sections: '栏目', navigation: '导航', homepage: '首页', appearance: '外观', 'seo-geo': 'SEO / GEO', 'footer-social': '页脚与社交', integrations: '公开集成', advanced: '高级'
}

interface SettingsPreviewWorkbenchProps {
  config: SiteConfiguration
  group: SettingsPreviewGroup
  issues: readonly unknown[]
  readiness: readonly EnvironmentReadiness[]
  siteUrl: string
  representativePath?: string
}

function previewPathForGroup(group: SettingsPreviewGroup, representativePath: string): string {
  return group === 'homepage' || group === 'sections' || group === 'footer-social' ? '/' : representativePath
}

export function SettingsPreviewWorkbench({ config, group, readiness, siteUrl, representativePath = '/zh/' }: SettingsPreviewWorkbenchProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [path, setPath] = useState(() => previewPathForGroup(group, representativePath))
  const [preferences, setPreferences] = useState<SettingsPreviewPreferences>(() => typeof window === 'undefined' ? { ...DEFAULT_SETTINGS_PREVIEW_PREFERENCES } : readSettingsPreviewPreferences(localStorage))
  const [showPageForArtifact, setShowPageForArtifact] = useState(false)
  const previewGroup = preferences.mode === 'page' ? 'advanced' : group
  const bridge = useSettingsPreviewBridge({ config, group: previewGroup, iframeRef, readiness, siteUrl, path, onNavigate: setPath })
  const artifactFirst = group === 'seo-geo' || group === 'integrations' || group === 'advanced'
  let artifactModel = bridge.model
  if (!artifactModel) {
    try { artifactModel = createSettingsPreviewModel(config, group, readiness) } catch { artifactModel = null }
  }

  useEffect(() => { writeSettingsPreviewPreferences(localStorage, preferences) }, [preferences])
  useEffect(() => { setPath(previewPathForGroup(group, representativePath)) }, [group, representativePath])
  const update = useCallback(<K extends keyof SettingsPreviewPreferences>(key: K, value: SettingsPreviewPreferences[K]) => setPreferences((current) => ({ ...current, [key]: value })), [])
  const canvas = <PreviewCanvas iframeRef={iframeRef} iframeUrl={bridge.iframeUrl} status={bridge.status} title={`${GROUP_LABELS[group]}网站预览`} viewport={preferences.viewport} zoom={preferences.zoom} />

  return <section className="settings-preview-workbench" aria-label={`${GROUP_LABELS[group]}设置预览`}>
    {artifactFirst && artifactModel && <div className="settings-preview-kind-switch"><Button size="sm" variant={!showPageForArtifact ? 'secondary' : 'ghost'} onClick={() => setShowPageForArtifact(false)}>配置产物</Button><Button size="sm" variant={showPageForArtifact ? 'secondary' : 'ghost'} onClick={() => setShowPageForArtifact(true)}>真实页面</Button></div>}
    {(!artifactFirst || showPageForArtifact) && <>
      <PreviewToolbar preferences={preferences} onModeChange={(value: SettingsPreviewMode) => update('mode', value)} onViewportChange={(value: SettingsPreviewViewport) => update('viewport', value)} onZoomChange={(value: SettingsPreviewZoom) => update('zoom', value)} onFullscreen={() => update('fullscreen', true)} />
      {!preferences.fullscreen && canvas}
    </>}
    {artifactFirst && !showPageForArtifact && artifactModel && <ArtifactPreview model={artifactModel} />}
    <Sheet open={preferences.fullscreen} onOpenChange={(open) => update('fullscreen', open)}>
      <SheetContent className="w-screen max-w-none p-4" side="right">
        <SheetHeader><SheetTitle>{GROUP_LABELS[group]}全屏预览</SheetTitle><SheetDescription>可滚动查看真实网站模块，按 Escape 退出。</SheetDescription></SheetHeader>
        <PreviewCanvas iframeRef={iframeRef} iframeUrl={bridge.iframeUrl} status={bridge.status} title={`${GROUP_LABELS[group]}全屏网站预览`} viewport={preferences.viewport} zoom={preferences.zoom} />
      </SheetContent>
    </Sheet>
  </section>
}
