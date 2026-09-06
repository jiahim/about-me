import type { SettingsPreviewModel } from '@jiahim/site-schema'
import { useState } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ArtifactPreviewProps { model: SettingsPreviewModel }

export function ArtifactPreview({ model }: ArtifactPreviewProps) {
  const artifacts = [
    ['robots', 'robots.txt', model.artifacts.robots],
    ['sitemap', 'sitemap.xml', model.artifacts.sitemap],
    ['feed', 'Feed', model.artifacts.feed],
    ['llms', 'llms.txt', model.artifacts.llmsTxt ?? '当前未生成 llms.txt'],
    ['website', 'Website JSON-LD', model.artifacts.websiteJsonLd],
    ['person', 'Person JSON-LD', model.artifacts.personJsonLd]
  ] as const
  const [tab, setTab] = useState<string>(artifacts[0][0])
  return <Tabs value={tab} onValueChange={setTab}>
    <TabsList className="settings-artifact-tabs">{artifacts.map(([id, label]) => <TabsTrigger key={id} value={id}>{label}</TabsTrigger>)}</TabsList>
    {artifacts.map(([id, label, content]) => <TabsContent key={id} value={id}><pre aria-label={`${label} 预览`} className="settings-artifact-preview">{content}</pre></TabsContent>)}
  </Tabs>
}
