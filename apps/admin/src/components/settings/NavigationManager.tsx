'use client'

import type { SiteConfiguration } from '@jiahim/site-schema'
import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, FolderTreeIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { addLinkNavigation, addSectionNavigation, listAvailableHeaderSections, moveNavigation, removeNavigation, updateNavigation } from '@/lib/settings/navigation'

interface NavigationManagerProps {
  config: SiteConfiguration
  onChange: (path: readonly (string | number)[], value: unknown) => void
}

export function NavigationManager({ config, onChange }: NavigationManagerProps) {
  const [sectionOpen, setSectionOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [locale, setLocale] = useState(config.site.defaultLocale)
  const [sectionId, setSectionId] = useState('')
  const [sectionLabel, setSectionLabel] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [linkHref, setLinkHref] = useState('')
  const [linkNewTab, setLinkNewTab] = useState(false)
  const availableSections = useMemo(() => listAvailableHeaderSections(config, locale), [config, locale])
  const locales = Object.entries(config.locales).filter(([, item]) => item.enabled)
  const firstAddableLocale = locales.find(([id]) => listAvailableHeaderSections(config, id).length > 0)?.[0] ?? null

  function replace(next: SiteConfiguration) {
    onChange([], next)
  }

  function openSectionDialog(open: boolean) {
    setSectionOpen(open)
    if (!open) return
    const nextLocale = availableSections.length > 0 ? locale : firstAddableLocale ?? locale
    const first = listAvailableHeaderSections(config, nextLocale)[0]
    setLocale(nextLocale)
    setSectionId(first?.id ?? '')
    setSectionLabel(first?.name ?? '')
  }

  function selectSection(value: string) {
    setSectionId(value)
    setSectionLabel(availableSections.find((item) => item.id === value)?.name ?? '')
  }

  function createSectionNavigation() {
    replace(addSectionNavigation(config, { locale, sectionId, label: sectionLabel }))
    setSectionOpen(false)
  }

  function createLinkNavigation() {
    replace(addLinkNavigation(config, {
      locale,
      label: linkLabel,
      href: linkHref,
      newTab: linkNewTab
    }))
    setLinkOpen(false)
    setLinkLabel('')
    setLinkHref('')
    setLinkNewTab(false)
  }

  return (
    <section className="grid gap-4" aria-label="导航管理">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">模块导航</h2>
          <p className="mt-1 text-sm text-muted-foreground">管理站点顶部导航。栏目显隐会与栏目配置同步，顺序按语言独立维护。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={sectionOpen} onOpenChange={openSectionDialog}>
            <DialogTrigger asChild><Button type="button" variant="outline" disabled={!firstAddableLocale}><FolderTreeIcon />添加栏目导航</Button></DialogTrigger>
            <DialogContent aria-label="添加栏目导航">
              <DialogHeader>
                <DialogTitle>添加栏目导航</DialogTitle>
                <DialogDescription>只能选择当前语言下尚未加入顶部导航的启用顶级栏目。</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <Field label="语言" htmlFor="section-navigation-locale">
                  <Select value={locale} onValueChange={(value) => { setLocale(value); setSectionId(''); setSectionLabel('') }}>
                    <SelectTrigger id="section-navigation-locale" className="w-full" aria-label="栏目导航语言"><SelectValue /></SelectTrigger>
                    <SelectContent>{locales.map(([id, item]) => <SelectItem key={id} value={id}>{item.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="栏目" htmlFor="section-navigation-section">
                  <Select value={sectionId} onValueChange={selectSection}>
                    <SelectTrigger id="section-navigation-section" className="w-full" aria-label="选择栏目"><SelectValue placeholder="选择栏目" /></SelectTrigger>
                    <SelectContent>{availableSections.map((section) => <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="导航标签" htmlFor="section-navigation-label">
                  <Input id="section-navigation-label" aria-label="栏目导航标签" value={sectionLabel} onChange={(event) => setSectionLabel(event.target.value)} />
                </Field>
                {availableSections.length === 0 && <p className="text-sm text-muted-foreground">当前语言没有可添加的顶级栏目。</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSectionOpen(false)}>取消</Button>
                <Button type="button" disabled={!sectionId || !sectionLabel.trim()} onClick={createSectionNavigation}>确认添加</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
            <DialogTrigger asChild><Button type="button" variant="outline"><PlusIcon />添加外部链接</Button></DialogTrigger>
            <DialogContent aria-label="添加外部链接">
              <DialogHeader>
                <DialogTitle>添加外部链接</DialogTitle>
                <DialogDescription>添加完整 HTTPS 地址，或规范的站内绝对路径。</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <Field label="语言" htmlFor="link-navigation-locale">
                  <Select value={locale} onValueChange={setLocale}>
                    <SelectTrigger id="link-navigation-locale" className="w-full" aria-label="外链语言"><SelectValue /></SelectTrigger>
                    <SelectContent>{locales.map(([id, item]) => <SelectItem key={id} value={id}>{item.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="名称" htmlFor="link-navigation-label"><Input id="link-navigation-label" aria-label="外链名称" value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} /></Field>
                <Field label="URL" htmlFor="link-navigation-url"><Input id="link-navigation-url" aria-label="外链 URL" value={linkHref} onChange={(event) => setLinkHref(event.target.value)} /></Field>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <Label htmlFor="link-navigation-new-tab">新窗口打开</Label>
                  <Switch id="link-navigation-new-tab" checked={linkNewTab} onCheckedChange={setLinkNewTab} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>取消</Button>
                <Button type="button" disabled={!linkLabel.trim() || !linkHref.trim()} onClick={createLinkNavigation}>确认添加</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {!firstAddableLocale && <p className="basis-full max-w-md text-xs text-muted-foreground sm:text-right">所有启用的顶级栏目均已加入当前语言导航。删除某个导航项后，可在这里重新添加；仅关闭“显示”不会释放它。</p>}
        </div>
      </div>

      <div className="grid gap-3">
        {config.navigation.map((item, index) => {
          const localeItems = config.navigation.filter((candidate) => candidate.locale === item.locale)
          const localeIndex = localeItems.findIndex((candidate) => candidate.id === item.id)
          const accessibleName = `导航 ${index + 1}`
          return (
            <Card key={item.id} role="group" aria-label={accessibleName} className="gap-4 py-4">
              <CardHeader className="flex-row items-start justify-between gap-3 px-4">
                <div className="grid gap-1">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    {item.type === 'section' ? <FolderTreeIcon className="size-4" /> : <ExternalLinkIcon className="size-4" />}
                    {item.label}
                  </CardTitle>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{item.id}</Badge>
                    <Badge variant="secondary">{config.locales[item.locale]?.label ?? item.locale}</Badge>
                    <Badge variant="secondary">顺序 {item.order + 1}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" size="icon" variant="ghost" aria-label={`上移${accessibleName}`} disabled={localeIndex === 0} onClick={() => replace(moveNavigation(config, item.id, -1))}><ArrowUpIcon /></Button>
                  <Button type="button" size="icon" variant="ghost" aria-label={`下移${accessibleName}`} disabled={localeIndex === localeItems.length - 1} onClick={() => replace(moveNavigation(config, item.id, 1))}><ArrowDownIcon /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button type="button" size="icon" variant="ghost" aria-label={`删除${accessibleName}`}><Trash2Icon /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>删除“{item.label}”导航？</AlertDialogTitle><AlertDialogDescription>只移除导航项，不会删除栏目或文章。栏目顶部导航状态会同步更新。</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={() => replace(removeNavigation(config, item.id))}>确认删除</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 px-4 md:grid-cols-2">
                <Field label="标签" htmlFor={`${item.id}-label`}><Input id={`${item.id}-label`} aria-label={`${accessibleName} 标签`} value={item.label} onChange={(event) => replace(updateNavigation(config, item.id, { label: event.target.value }))} /></Field>
                {item.type === 'link'
                  ? <Field label="URL" htmlFor={`${item.id}-href`}><Input id={`${item.id}-href`} aria-label={`${accessibleName} URL`} value={item.href} onChange={(event) => replace(updateNavigation(config, item.id, { href: event.target.value }))} /></Field>
                  : <Field label="栏目" htmlFor={`${item.id}-section`}><Input id={`${item.id}-section`} value={item.sectionId} readOnly /></Field>}
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <Label htmlFor={`${item.id}-visible`}>显示</Label>
                  <Switch id={`${item.id}-visible`} aria-label={`显示${accessibleName}`} checked={item.visible} onCheckedChange={(value) => replace(updateNavigation(config, item.id, { visible: value }))} />
                </div>
                {item.type === 'link' && <div className="flex items-center justify-between gap-3 rounded-lg border p-3"><Label htmlFor={`${item.id}-new-tab`}>新窗口打开</Label><Switch id={`${item.id}-new-tab`} checked={item.newTab} onCheckedChange={(value) => replace(updateNavigation(config, item.id, { newTab: value }))} /></div>}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
