import type { SiteConfiguration } from '@jiahim/site-schema'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { SelectField, TextField, Toggle, type SettingsFieldChange } from './shared'

export function IntegrationsSettingsForm({ config, onChange }: { config: SiteConfiguration; onChange: SettingsFieldChange }) {
  const requirements = [...new Set([...config.integrations.analytics.requiredEnvironmentVariables, ...config.integrations.comments.requiredEnvironmentVariables])]
  return <>
    <Card className="col-span-full"><CardHeader><CardTitle>公开统计</CardTitle><CardDescription>仅管理可公开的脚本地址和 Website ID，不保存秘密。</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
      <Toggle label="启用公开统计" checked={config.integrations.analytics.enabled} onChange={(value) => onChange(['integrations', 'analytics', 'enabled'], value)} />
      <SelectField label="统计提供商" value={config.integrations.analytics.provider} options={[{ value: 'none', label: 'none' }, { value: 'umami', label: 'umami' }]} onChange={(value) => onChange(['integrations', 'analytics', 'provider'], value)} />
      <TextField label="统计脚本 URL" value={config.integrations.analytics.scriptSrc} onChange={(value) => onChange(['integrations', 'analytics', 'scriptSrc'], value)} />
      <TextField label="公开统计 Website ID" value={config.integrations.analytics.websiteId} onChange={(value) => onChange(['integrations', 'analytics', 'websiteId'], value)} />
    </CardContent></Card>
    <Card className="col-span-full"><CardHeader><CardTitle>公开评论</CardTitle><CardDescription>配置 Giscus 的公开仓库标识；预览模式不会真正加载评论。</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
      <Toggle label="启用公开评论" checked={config.integrations.comments.enabled} onChange={(value) => onChange(['integrations', 'comments', 'enabled'], value)} />
      <SelectField label="评论提供商" value={config.integrations.comments.provider} options={[{ value: 'none', label: 'none' }, { value: 'giscus', label: 'giscus' }]} onChange={(value) => onChange(['integrations', 'comments', 'provider'], value)} />
      <TextField label="Giscus 仓库" value={config.integrations.comments.repository} onChange={(value) => onChange(['integrations', 'comments', 'repository'], value)} />
      <TextField label="Giscus 仓库 ID" value={config.integrations.comments.repositoryId} onChange={(value) => onChange(['integrations', 'comments', 'repositoryId'], value)} />
      <TextField label="Giscus 分类" value={config.integrations.comments.category} onChange={(value) => onChange(['integrations', 'comments', 'category'], value)} />
      <TextField label="Giscus 分类 ID" value={config.integrations.comments.categoryId} onChange={(value) => onChange(['integrations', 'comments', 'categoryId'], value)} />
      <SelectField label="评论映射" value={config.integrations.comments.mapping} options={['pathname', 'url', 'title', 'og:title'].map((value) => ({ value, label: value }))} onChange={(value) => onChange(['integrations', 'comments', 'mapping'], value)} />
    </CardContent></Card>
    <Card className="col-span-full"><CardHeader><CardTitle>所需环境变量</CardTitle><CardDescription>只显示配置声明的变量名称，不读取或展示变量值。</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{requirements.length ? requirements.map((name) => <code key={name} className="rounded bg-muted px-2 py-1 text-xs">{name}</code>) : <p className="text-sm text-muted-foreground">当前公开集成没有声明环境变量。</p>}</CardContent></Card>
  </>
}
