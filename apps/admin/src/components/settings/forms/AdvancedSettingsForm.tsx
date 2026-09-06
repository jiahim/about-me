import type { SiteConfiguration } from '@jiahim/site-schema'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

import { TextField, Toggle, type SettingsFieldChange } from './shared'

export function AdvancedSettingsForm({ config, environmentRequirements, normalizedJson, onChange }: { config: SiteConfiguration; environmentRequirements: readonly { name: string; exists: boolean }[]; normalizedJson: string; onChange: SettingsFieldChange }) {
  return <>
    <Card className="settings-advanced-section" data-settings-advanced-block="schema"><CardHeader><CardTitle>配置版本</CardTitle><CardDescription>用于识别配置文件格式，由系统维护。</CardDescription></CardHeader><CardContent><TextField label="Schema 版本" readOnly value={String(config.schemaVersion)} onChange={() => undefined} /></CardContent></Card>
    <Card className="settings-advanced-section" data-settings-advanced-block="languages"><CardHeader><CardTitle>语言与内容目录</CardTitle><CardDescription>内容目录与公开路由由仓库结构维护，语言显示名称和启用状态可编辑。</CardDescription></CardHeader><CardContent className="settings-locale-list grid gap-4">{Object.entries(config.locales).map(([id, locale]) => <article className="settings-locale grid gap-3 rounded-lg border p-4" key={id}><header><strong>{locale.label}</strong><code className="ml-2 text-xs text-muted-foreground">语言代码：{id}</code></header><TextField label={`${id} 显示名称`} value={locale.label} onChange={(value) => onChange(['locales', id, 'label'], value)} /><TextField label={`${id} 内容目录（只读）`} readOnly value={locale.contentRoot} onChange={() => undefined} /><TextField label={`${id} 路由前缀（只读）`} readOnly value={locale.routePrefix} onChange={() => undefined} /><Toggle label="启用语言" checked={locale.enabled} onChange={(value) => onChange(['locales', id, 'enabled'], value)} /></article>)}</CardContent></Card>
    <Card className="settings-advanced-section settings-advanced-block" data-settings-advanced-block="environment"><CardHeader><CardTitle>环境变量存在状态</CardTitle><CardDescription>只校验名称是否存在，不展示值。</CardDescription></CardHeader><CardContent>{environmentRequirements.length ? environmentRequirements.map((item) => <p key={item.name}><code>{item.name}</code> · {item.exists ? '已设置' : '未设置'}</p>) : <p>当前公开集成没有声明环境变量。</p>}</CardContent></Card>
    <Card className="settings-advanced-section" data-settings-advanced-block="json"><CardHeader><CardTitle>标准化 JSON</CardTitle><CardDescription>只读快照，便于审查和复盘。</CardDescription></CardHeader><CardContent><Textarea aria-label="标准化 JSON" readOnly rows={18} value={normalizedJson} className="settings-json font-mono text-xs" /></CardContent></Card>
  </>
}
