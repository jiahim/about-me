'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { PullRequestSummary } from '@/lib/git/types'

interface MergeDialogProps {
  busy: boolean
  open: boolean
  pullRequest: PullRequestSummary | null
  onClose: () => void
  onConfirm: (expectedHeadOid: string) => void
}

export function MergeDialog({ busy, open, pullRequest, onClose, onConfirm }: MergeDialogProps) {
  const oid = pullRequest?.headRefOid ?? ''
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent aria-label="合并并发布">
        <DialogHeader>
          <DialogTitle>合并 Pull Request #{pullRequest?.number}</DialogTitle>
          <DialogDescription>将执行 squash merge 并触发公开站点发布。服务端会重新核验当前用户、检查、分支同步状态和以下提交 OID。</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-2 rounded-lg border p-3 text-sm">
          <div className="flex justify-between gap-4"><dt>目标分支</dt><dd><code>{pullRequest?.baseRefName || '—'}</code></dd></div>
          <div className="flex justify-between gap-4"><dt>来源分支</dt><dd><code>{pullRequest?.headRefName || '—'}</code></dd></div>
          <div className="grid gap-1"><dt>提交 OID</dt><dd><code className="break-all text-xs">{oid || '尚未读取'}</code></dd></div>
          <div className="flex justify-between gap-4"><dt>合并状态</dt><dd>{pullRequest?.mergeStateStatus || '等待服务端复核'}</dd></div>
        </dl>
        <DialogFooter>
          <Button variant="outline" type="button" disabled={busy} onClick={onClose}>取消</Button>
          <Button type="button" disabled={busy || !oid} onClick={() => onConfirm(oid)}>{busy ? '处理中…' : '确认合并并发布'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
