import type { SiteConfiguration } from '@jiahim/site-schema'
import { PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { TextField, type SettingsFieldChange } from './shared'

export function AuthorSettingsForm({ config, onChange }: { config: SiteConfiguration; onChange: SettingsFieldChange }) {
  function updateIdentity(index: number, value: string) {
    onChange(['author', 'sameAs', index], value)
  }

  return <>
    <TextField label="作者 ID" readOnly value={config.author.id} onChange={() => undefined} />
    <TextField label="作者名称" value={config.author.name} onChange={(value) => onChange(['author', 'name'], value)} />
    <TextField label="作者简介" value={config.author.bio} onChange={(value) => onChange(['author', 'bio'], value)} />
    <TextField label="头像路径" value={config.author.avatar.src} onChange={(value) => onChange(['author', 'avatar', 'src'], value)} />
    <section className="col-span-full grid gap-3" aria-labelledby="author-identity-heading">
      <div className="flex items-start justify-between gap-3">
        <div><h2 id="author-identity-heading" className="font-semibold">身份关联 URL</h2><p className="mt-1 text-sm text-muted-foreground">用于 Person JSON-LD 的 sameAs 身份确认，不会显示在页脚；网站可见链接请在“页脚与社交”中设置。</p></div>
        <Button type="button" variant="outline" onClick={() => onChange(['author', 'sameAs'], [...config.author.sameAs, ''])}><PlusIcon />新增身份 URL</Button>
      </div>
      {config.author.sameAs.map((url, index) => <Card key={index} className="gap-3 py-4"><CardHeader className="flex-row items-center justify-between px-4"><CardTitle className="text-sm">身份 URL {index + 1}</CardTitle><Button type="button" size="icon" variant="ghost" aria-label={`删除作者主页 ${index + 1}`} onClick={() => onChange(['author', 'sameAs'], config.author.sameAs.filter((_, itemIndex) => itemIndex !== index))}><Trash2Icon /></Button></CardHeader><CardContent className="px-4"><TextField label={`作者主页 ${index + 1} URL`} value={url} onChange={(value) => updateIdentity(index, value)} /></CardContent></Card>)}
    </section>
  </>
}
