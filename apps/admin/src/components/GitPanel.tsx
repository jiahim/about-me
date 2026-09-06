'use client'

import { useEffect, useState } from 'react'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { GitHistoryEntry } from '@/lib/git/types'

interface GitPanelProps {
  articlePath?: string
  open: boolean
  onClose: () => void
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  const value = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(value.error || 'Git 信息加载失败')
  return value
}

export function GitPanel({ articlePath, open, onClose }: GitPanelProps) {
  const [tab, setTab] = useState<'diff' | 'history'>('diff')
  const [diff, setDiff] = useState('')
  const [history, setHistory] = useState<GitHistoryEntry[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !articlePath) return
    let active = true
    setLoading(true)
    setError('')

    Promise.all([
      readJson<{ diff: string }>('/api/git/diff?path=' + encodeURIComponent(articlePath)),
      readJson<{ history: GitHistoryEntry[] }>(
        '/api/git/history?path=' + encodeURIComponent(articlePath)
      )
    ])
      .then(([diffResult, historyResult]) => {
        if (!active) return
        setDiff(diffResult.diff)
        setHistory(historyResult.history)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Git 信息加载失败')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [articlePath, open])

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <SheetContent className="git-panel w-full sm:max-w-2xl" aria-label="Git 差异与历史">
        <SheetHeader className="git-panel__header">
          <SheetTitle>版本控制</SheetTitle>
          <SheetDescription>{articlePath || '当前文章'}</SheetDescription>
        </SheetHeader>
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList className="git-panel__tabs"><TabsTrigger value="diff">差异</TabsTrigger><TabsTrigger value="history">历史</TabsTrigger></TabsList>
          <div className="git-panel__content">
          {loading && <p className="list-message">正在读取 Git 信息…</p>}
          {error && <p className="alert alert--error">{error}</p>}
          <TabsContent value="diff">{!loading && !error && (
            <pre className="diff-view">{diff}</pre>
          )}</TabsContent>
          <TabsContent value="history">{!loading && !error && (
            <ol className="history-list">
              {history.map((entry) => (
                <li key={entry.sha}>
                  <code>{entry.shortSha}</code>
                  <div>
                    <strong>{entry.subject}</strong>
                    <span>
                      {entry.author} · {new Date(entry.authoredAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </li>
              ))}
              {!history.length && <li className="list-message">暂无提交历史。</li>}
            </ol>
          )}</TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
