import type { EnvironmentReadiness, SettingsPreviewGroup, SiteConfiguration } from '@jiahim/site-schema'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SettingsPreviewWorkbench } from './settings-preview/SettingsPreviewWorkbench'

export interface SettingsIssue {
  path: string
  code: string
  message: string
}

export type SettingsInspectorTab = 'preview' | 'issues' | 'diff'

interface SettingsInspectorProps {
  config: SiteConfiguration
  diff: string
  diffFiles?: readonly { path: string; kind: 'text' | 'binary'; status: string }[]
  group: SettingsPreviewGroup
  issues: readonly SettingsIssue[]
  readiness: readonly EnvironmentReadiness[]
  representativePath?: string
  siteUrl: string
  tab: SettingsInspectorTab
  onTabChange: (tab: SettingsInspectorTab) => void
}

export function SettingsInspector({ config, diff, diffFiles = [], group, issues, readiness, representativePath, siteUrl, tab, onTabChange }: SettingsInspectorProps) {
  return (
    <aside className="settings-inspector" aria-label="设置检查器">
      <Tabs value={tab} onValueChange={(value) => onTabChange(value as SettingsInspectorTab)}>
        <TabsList aria-label="设置检查" className="settings-inspector__tabs">
          <TabsTrigger value="preview">预览</TabsTrigger>
          <TabsTrigger value="issues">问题 ({issues.length})</TabsTrigger>
          <TabsTrigger value="diff">Diff</TabsTrigger>
        </TabsList>
        <TabsContent value="preview">
          <SettingsPreviewWorkbench config={config} group={group} issues={issues} readiness={readiness} representativePath={representativePath} siteUrl={siteUrl} />
        </TabsContent>
        <TabsContent value="issues">
          <div className="settings-issues">
            {issues.length ? issues.map((issue, index) => (
              <article key={`${issue.path}-${index}`}>
                <code>{issue.path}</code>
                <p>{issue.message}</p>
              </article>
            )) : <p>当前配置未发现 Schema 问题。</p>}
          </div>
        </TabsContent>
        <TabsContent value="diff">
          {diffFiles.length > 0 && <ul className="mb-3 grid gap-1 text-xs text-muted-foreground" aria-label="设置差异文件">{diffFiles.map((file) => <li key={file.path}><code>{file.path}</code> · {file.status} · {file.kind === 'binary' ? '二进制' : '文本'}</li>)}</ul>}
          <pre className="settings-diff">{diff || '当前没有设置差异。'}</pre>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
