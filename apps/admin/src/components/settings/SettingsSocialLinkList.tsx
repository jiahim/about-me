'use client'

import type { SocialLink } from '@jiahim/site-schema'
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SettingsSocialLinkListProps { links: readonly SocialLink[]; onChange: (links: SocialLink[]) => void }
const providers: readonly SocialLink['provider'][] = ['github', 'x', 'linkedin', 'youtube', 'rss', 'generic']
let nextTemporaryKey = 0
function temporaryKey() { nextTemporaryKey += 1; return `settings-social-link-${nextTemporaryKey}` }

export function SettingsSocialLinkList({ links, onChange }: SettingsSocialLinkListProps) {
  const keys = useRef<string[]>(links.map(temporaryKey))
  while (keys.current.length < links.length) keys.current.push(temporaryKey())
  if (keys.current.length > links.length) keys.current.length = links.length
  function update(index: number, patch: Partial<SocialLink>) { onChange(links.map((link, itemIndex) => itemIndex === index ? { ...link, ...patch } : { ...link })) }
  function move(index: number, delta: -1 | 1) { const target = index + delta; if (target < 0 || target >= links.length) return; const next = links.map((link) => ({ ...link })); [next[index], next[target]] = [next[target], next[index]]; [keys.current[index], keys.current[target]] = [keys.current[target], keys.current[index]]; onChange(next) }
  function remove(index: number) { keys.current.splice(index, 1); onChange(links.filter((_, itemIndex) => itemIndex !== index).map((link) => ({ ...link }))) }
  function add() { keys.current.push(temporaryKey()); onChange([...links.map((link) => ({ ...link })), { provider: 'generic', label: '', href: '' }]) }

  return <section className="settings-link-list grid gap-3"><header className="settings-link-list__header flex items-start justify-between gap-3"><div><h2 className="font-semibold">社交链接</h2><p className="text-sm text-muted-foreground">显示在网站页脚；平台字段决定安全的内置图标。</p></div><Button aria-label="新增社交链接" variant="outline" type="button" onClick={add}><PlusIcon />新增社交链接</Button></header><div className="settings-list-grid grid gap-3">{links.map((link, index) => { const accessibleName = `社交链接 ${index + 1}`; return <Card key={keys.current[index]} role="group" aria-label={accessibleName} className="gap-3 py-4"><CardHeader className="flex-row items-center justify-between px-4"><CardTitle className="text-sm">{accessibleName}</CardTitle><div className="flex gap-1"><Button type="button" size="icon" variant="ghost" aria-label={`上移${accessibleName}`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUpIcon /></Button><Button type="button" size="icon" variant="ghost" aria-label={`下移${accessibleName}`} disabled={index === links.length - 1} onClick={() => move(index, 1)}><ArrowDownIcon /></Button><Button type="button" size="icon" variant="ghost" aria-label={`删除${accessibleName}`} onClick={() => remove(index)}><Trash2Icon /></Button></div></CardHeader><CardContent className="grid gap-3 px-4 md:grid-cols-3"><Field label="平台" htmlFor={`${keys.current[index]}-provider`}><Select value={link.provider} onValueChange={(value) => update(index, { provider: value as SocialLink['provider'] })}><SelectTrigger id={`${keys.current[index]}-provider`} aria-label={`${accessibleName} 平台`} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{providers.map((provider) => <SelectItem key={provider} value={provider}>{provider}</SelectItem>)}</SelectContent></Select></Field><Field label="名称" htmlFor={`${keys.current[index]}-label`}><Input id={`${keys.current[index]}-label`} aria-label={`${accessibleName} 名称`} value={link.label} onChange={(event) => update(index, { label: event.target.value })} /></Field><Field label="URL" htmlFor={`${keys.current[index]}-url`}><Input id={`${keys.current[index]}-url`} aria-label={`${accessibleName} URL`} value={link.href} onChange={(event) => update(index, { href: event.target.value })} /></Field></CardContent></Card> })}{links.length === 0 && <p className="settings-empty-list">暂时没有社交链接。</p>}</div></section>
}
