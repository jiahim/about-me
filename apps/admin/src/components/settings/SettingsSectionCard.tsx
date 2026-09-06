import type { SectionConfiguration } from '@jiahim/site-schema'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { TextField, Toggle, type SettingsFieldChange } from './forms/shared'

interface SettingsSectionCardProps {
  index: number
  section: SectionConfiguration
  onChange: SettingsFieldChange
}

const statusLabels: Record<SectionConfiguration['status'], string> = {
  active: '已启用',
  hidden: '已隐藏',
  archived: '已归档'
}

export function SettingsSectionCard({ index, section, onChange }: SettingsSectionCardProps) {
  return <Card className="settings-section-card gap-4 py-4"><CardHeader className="settings-section-card__header flex-row items-start justify-between gap-3 px-4"><div className="grid gap-1"><CardTitle>{section.name}</CardTitle><code className="text-xs text-muted-foreground">内部 ID：{section.id}</code></div><div className="settings-section-card__meta flex flex-wrap justify-end gap-1.5" aria-label="栏目状态"><Badge variant="secondary">{statusLabels[section.status]}</Badge><Badge variant="outline">排序第 {section.order + 1} 位</Badge><Badge variant="outline">{section.parentId ? `父栏目：${section.parentId}` : '顶级栏目'}</Badge></div></CardHeader><CardContent className="grid gap-4 px-4"><div className="settings-section-card__fields grid gap-4 md:grid-cols-2"><TextField label="栏目名称" value={section.name} onChange={(value) => onChange(['sections', index, 'name'], value)} /><TextField label="栏目描述" value={section.description || ''} onChange={(value) => onChange(['sections', index, 'description'], value)} /><TextField label="内容目录（只读）" readOnly value={section.directory} onChange={() => undefined} /><TextField label="公开路由（只读）" readOnly value={section.route} onChange={() => undefined} /></div><div className="settings-section-card__toggles grid gap-3 md:grid-cols-3"><div className="rounded-lg border p-3 text-sm"><span className="font-medium">顶部导航</span><p className="mt-1 text-muted-foreground">{section.navigation.header ? '已显示' : '未显示'} · 请在“导航”模块管理</p></div><Toggle label="显示在侧栏" checked={section.navigation.sidebar} onChange={(value) => onChange(['sections', index, 'navigation', 'sidebar'], value)} /><Toggle label="侧栏默认折叠" checked={section.navigation.collapsed} onChange={(value) => onChange(['sections', index, 'navigation', 'collapsed'], value)} /></div></CardContent></Card>
}
