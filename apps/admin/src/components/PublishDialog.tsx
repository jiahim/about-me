'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface PublishDialogProps {
  articlePath: string
  busy: boolean
  mediaPaths: readonly string[]
  open: boolean
  title: string
  onClose: () => void
  onConfirm: (message: string) => void
}

export function PublishDialog({
  articlePath,
  busy,
  mediaPaths,
  open,
  title,
  onClose,
  onConfirm
}: PublishDialogProps) {
  const [message, setMessage] = useState('[Human] docs: ' + title)

  useEffect(() => {
    if (open) setMessage('[Human] docs: ' + title)
  }, [open, title])

  const paths = [articlePath, ...mediaPaths]

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="publish-dialog" aria-label="提交并推送">
        <DialogHeader>
          <DialogTitle>提交并推送</DialogTitle>
          <DialogDescription>
          只会暂存下面的文章和本次上传媒体。若当前位于默认分支，将先创建内容分支。
          </DialogDescription>
        </DialogHeader>
        <ul className="publish-paths">
          {paths.map((file) => <li key={file}>{file}</li>)}
        </ul>
        <label className="commit-message-field">
          <span>提交信息</span>
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={180}
          />
        </label>
        <DialogFooter>
          <Button variant="outline" type="button" disabled={busy} onClick={onClose}>
            取消
          </Button>
          <Button
            type="button"
            disabled={busy || !message.trim()}
            onClick={() => onConfirm(message)}
          >
            {busy ? '处理中…' : '确认提交并推送'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
