import type { SiteConfiguration } from '@jiahim/site-schema'

import { TextField, Toggle, type SettingsFieldChange } from './shared'

export function SeoGeoSettingsForm({ config, onChange }: { config: SiteConfiguration; onChange: SettingsFieldChange }) {
  return <>
    <TextField label="标题模板" value={config.seo.titleTemplate} onChange={(value) => onChange(['seo', 'titleTemplate'], value)} />
    <TextField label="默认 SEO 描述" value={config.seo.defaultDescription} onChange={(value) => onChange(['seo', 'defaultDescription'], value)} />
    <Toggle label="生成 Sitemap" checked={config.seo.sitemap.enabled} onChange={(value) => onChange(['seo', 'sitemap', 'enabled'], value)} />
    <Toggle label="生成 Feed" checked={config.seo.feed.enabled} onChange={(value) => onChange(['seo', 'feed', 'enabled'], value)} />
    <Toggle label="Canonical" checked={config.seo.canonical.enabled} onChange={(value) => onChange(['seo', 'canonical', 'enabled'], value)} />
    <Toggle label="允许索引" checked={config.seo.indexing.index} onChange={(value) => onChange(['seo', 'indexing', 'index'], value)} />
    <Toggle label="允许跟踪链接" checked={config.seo.indexing.follow} onChange={(value) => onChange(['seo', 'indexing', 'follow'], value)} />
    <Toggle label="Open Graph" checked={config.seo.openGraph.enabled} onChange={(value) => onChange(['seo', 'openGraph', 'enabled'], value)} />
    <TextField label="Open Graph 站点名" value={config.seo.openGraph.siteName} onChange={(value) => onChange(['seo', 'openGraph', 'siteName'], value)} />
    <TextField label="Feed 标题" value={config.seo.feed.title} onChange={(value) => onChange(['seo', 'feed', 'title'], value)} />
    <TextField label="Feed 描述" value={config.seo.feed.description} onChange={(value) => onChange(['seo', 'feed', 'description'], value)} />
    <Toggle label="Website JSON-LD" checked={config.seo.structuredData.website} onChange={(value) => onChange(['seo', 'structuredData', 'website'], value)} />
    <Toggle label="Person JSON-LD" checked={config.seo.structuredData.person} onChange={(value) => onChange(['seo', 'structuredData', 'person'], value)} />
    <Toggle label="BlogPosting JSON-LD" checked={config.seo.structuredData.blogPosting} onChange={(value) => onChange(['seo', 'structuredData', 'blogPosting'], value)} />
    <Toggle label="Breadcrumb JSON-LD" checked={config.seo.structuredData.breadcrumbs} onChange={(value) => onChange(['seo', 'structuredData', 'breadcrumbs'], value)} />
    <Toggle label="允许 AI 搜索发现" checked={config.geo.crawlers.OAI_SearchBot.allow} onChange={(value) => onChange(['geo', 'crawlers', 'OAI_SearchBot', 'allow'], value)} />
    <Toggle label="允许模型训练" checked={config.geo.crawlers.GPTBot.allow} onChange={(value) => onChange(['geo', 'crawlers', 'GPTBot', 'allow'], value)} />
    <Toggle label="允许 Googlebot 发现" checked={config.geo.crawlers.Googlebot.allow} onChange={(value) => onChange(['geo', 'crawlers', 'Googlebot', 'allow'], value)} />
    <Toggle label="允许 Google 扩展训练" checked={config.geo.crawlers.Google_Extended.allow} onChange={(value) => onChange(['geo', 'crawlers', 'Google_Extended', 'allow'], value)} />
    <Toggle label="实验性 llms.txt" checked={config.geo.llmsTxt.enabled} onChange={(value) => onChange(['geo', 'llmsTxt', 'enabled'], value)} />
    {Object.entries(config.geo.contentSignals).map(([name, checked]) => <Toggle key={name} label={`内容完整性：${name}`} checked={checked} onChange={(value) => onChange(['geo', 'contentSignals', name], value)} />)}
  </>
}
