'use client'

import type { SiteConfiguration } from '@jiahim/site-schema'
import { ArchiveIcon, PlusIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { requestSettingsJson } from '@/lib/settings/client'
import { planSectionCreation } from '@/lib/settings/sections'

import { SettingsSectionCard } from './SettingsSectionCard'

interface SectionResult {
  config: SiteConfiguration
  baseHash: string
  changedPaths: string[]
  articleCount?: number
  session?: { id: string; expiresAt: number; publishablePaths: readonly string[]; rejectedPaths: readonly { path: string; reason: string }[]; blockReason?: string }
}

interface SectionManagerProps {
  baseHash: string
  config: SiteConfiguration
  fetcher?: typeof fetch
  onApplied: (result: SectionResult) => void
  onChange?: (path: readonly (string | number)[], value: unknown) => void
  disabled?: boolean
}

interface ArchiveTarget {
  articleCount: number
  id: string
  name: string
}

export function SectionManager({ baseHash, config, disabled = false, fetcher = fetch, onApplied, onChange = () => undefined }: SectionManagerProps) {
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [parentId, setParentId] = useState('')
  const [header, setHeader] = useState(false)
  const [sidebar, setSidebar] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(null)
  const preview = useMemo(() => {
    if (!name.trim() || !slug.trim()) return null
    try {
      return planSectionCreation(config, {
        name,
        slug,
        ...(parentId ? { parentId } : {}),
        header,
        sidebar,
        collapsed
      }).section
    } catch {
      return null
    }
  }, [collapsed, config, header, name, parentId, sidebar, slug])

  async function create() {
    setBusy(true)
    setError('')
    try {
      const result = await requestSettingsJson<SectionResult>('/api/settings/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseHash, name, slug, ...(parentId ? { parentId } : {}), header, sidebar, collapsed })
      }, fetcher)
      onApplied(result)
      setCreating(false)
      setName('')
      setSlug('')
      setParentId('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '栏目创建失败')
    } finally {
      setBusy(false)
    }
  }

  async function previewArchive(sectionId: string, sectionName: string) {
    setBusy(true)
    setError('')
    try {
      const result = await requestSettingsJson<{ articleCount: number }>(`/api/settings/sections/${encodeURIComponent(sectionId)}`, { method: 'GET' }, fetcher)
      setArchiveTarget({ id: sectionId, name: sectionName, articleCount: result.articleCount })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '栏目归档预检失败')
    } finally {
      setBusy(false)
    }
  }

  async function archive() {
    if (!archiveTarget) return
    setBusy(true)
    setError('')
    try {
      const result = await requestSettingsJson<SectionResult>(`/api/settings/sections/${encodeURIComponent(archiveTarget.id)}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseHash })
      }, fetcher)
      setArchiveTarget(null)
      onApplied(result)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '栏目归档失败')
    } finally {
      setBusy(false)
    }
  }

  return <div className="settings-list-grid col-span-full grid gap-4">
    <div className="settings-section-actions flex flex-wrap items-start justify-between gap-3">
      <div><p className="settings-note">新增栏目会同时创建栏目首页并更新配置；归档不会删除或移动任何文章。</p>{disabled && <p className="settings-note">请先保存或放弃当前设置草稿，再执行栏目事务。</p>}</div>
      <Button type="button" variant="outline" disabled={busy || disabled} onClick={() => setCreating((value) => !value)}><PlusIcon />新增栏目</Button>
    </div>
    {error && <p className="alert alert--error">{error}</p>}
    {creating && <section className="settings-section-wizard grid gap-4 rounded-xl border bg-card p-4" aria-label="新增栏目向导">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="新栏目名称" htmlFor="new-section-name"><Input id="new-section-name" aria-label="新栏目名称" value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="新栏目 slug" htmlFor="new-section-slug"><Input id="new-section-slug" aria-label="新栏目 slug" value={slug} onChange={(event) => setSlug(event.target.value)} /></Field>
        <Field label="父栏目" htmlFor="new-section-parent"><Select value={parentId || '__root__'} onValueChange={(value) => setParentId(value === '__root__' ? '' : value)}><SelectTrigger id="new-section-parent" aria-label="父栏目"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__root__">顶级栏目</SelectItem>{config.sections.filter((section) => section.status !== 'archived').map((section) => <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>)}</SelectContent></Select></Field>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="settings-toggle flex items-center gap-2"><Checkbox aria-label="新栏目显示在顶部导航" checked={header} onCheckedChange={(value) => setHeader(value === true)} /><span>显示在顶部导航</span></label>
        <label className="settings-toggle flex items-center gap-2"><Checkbox aria-label="新栏目显示在侧栏" checked={sidebar} onCheckedChange={(value) => setSidebar(value === true)} /><span>显示在侧栏</span></label>
        <label className="settings-toggle flex items-center gap-2"><Checkbox aria-label="新栏目侧栏默认折叠" checked={collapsed} onCheckedChange={(value) => setCollapsed(value === true)} /><span>侧栏默认折叠</span></label>
      </div>
      {preview && <div className="settings-section-preview"><code>{preview.id}</code><span>{preview.route}</span><span>{preview.directory}/index.md</span></div>}
      <div><Button type="button" disabled={busy || !preview} onClick={() => void create()}>确认创建栏目</Button></div>
    </section>}
    {config.sections.map((section, index) => <div key={section.id} data-section-item className="grid gap-3">
      <SettingsSectionCard index={index} section={section} onChange={onChange} />
      {section.status !== 'archived' && <div><Button variant="outline" type="button" disabled={busy || disabled} onClick={() => void previewArchive(section.id, section.name)}><ArchiveIcon />归档栏目</Button></div>}
    </div>)}
    <AlertDialog open={Boolean(archiveTarget)} onOpenChange={(open) => { if (!open) setArchiveTarget(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>归档“{archiveTarget?.name}”栏目？</AlertDialogTitle>
          <AlertDialogDescription>不会删除或移动文章，{archiveTarget?.articleCount ?? 0} 篇文章将保持原位；相关顶部导航会同时隐藏。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={() => void archive()}>确认归档</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
}
