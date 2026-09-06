'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface SettingsPublishDialogProps {
  busy: boolean
  defaultBranch?: string
  files?: readonly { path: string; kind: 'text' | 'binary'; status: string; size?: number }[]
  open: boolean
  paths: readonly string[]
  remote?: string | null
  onClose: () => void
  onConfirm: (message: string) => void
}

export function SettingsPublishDialog({ busy, defaultBranch = 'main', files = [], open, paths, remote, onClose, onConfirm }: SettingsPublishDialogProps) {
  const [message, setMessage] = useState('[Human] config: update site settings')

  useEffect(() => {
    if (open) setMessage('[Human] config: update site settings')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="publish-dialog" aria-label="提交并推送站点设置">
        <DialogHeader>
          <DialogTitle>提交并推送站点设置</DialogTitle>
          <DialogDescription>
            只暂存本次设置会话由服务端记录的文件。系统会创建内容分支、推送并创建 Pull Request，不会自动合并。
          </DialogDescription>
        </DialogHeader>
        <div>
          <p className="mb-2 text-sm text-muted-foreground">目标：{remote || '未配置远端'} / {defaultBranch} → content/{new Date().toISOString().slice(0, 10)}-site-settings</p>
          <p className="text-sm font-medium">本次文件范围（{paths.length}）</p>
          <ul className="publish-paths">
            {paths.map((file) => {
              const detail = files.find((item) => item.path === file)
              return <li key={file}>{file}{detail?.kind === 'binary' ? ` · 二进制资源${detail.size === undefined ? '' : ` · ${detail.size} bytes`}` : ' · 文本'}</li>
            })}
          </ul>
        </div>
        <label className="commit-message-field">
          <span>提交信息</span>
          <Input aria-label="设置提交信息" value={message} maxLength={180} onChange={(event) => setMessage(event.target.value)} />
        </label>
        <DialogFooter>
          <Button variant="outline" type="button" disabled={busy} onClick={onClose}>取消</Button>
          <Button type="button" disabled={busy || !message.trim() || !paths.length} onClick={() => onConfirm(message)}>
            {busy ? '处理中…' : '确认提交并推送'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
