'use client'

import { ExternalLinkIcon, GitCompareArrowsIcon, MoreHorizontalIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { GitStatus } from '@/lib/git/types'

import { ThemeMenu } from './ThemeMenu'

export type WorkspaceMode = 'articles' | 'settings'

export interface AdminShellHeaderProps {
  busy: boolean
  dirty: boolean
  gitStatus: GitStatus | null
  hasArticle: boolean
  mergeEnabled: boolean
  mode: WorkspaceMode
  previewUrl?: string
  publishEnabled: boolean
  settingsLoaded: boolean
  settingsPublishReason?: string
  onDiff: () => void
  onMerge: () => void
  onModeChange: (mode: WorkspaceMode) => void
  onPublish: () => void
  onSave: () => void
}

function DisabledActionTooltip({ children, reason }: { children: React.ReactNode; reason?: string }) {
  if (!reason) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild><span className="inline-flex" data-tooltip={reason} tabIndex={0}>{children}</span></TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  )
}

export function AdminShellHeader({
  busy,
  dirty,
  gitStatus,
  hasArticle,
  mergeEnabled,
  mode,
  previewUrl,
  publishEnabled,
  settingsLoaded,
  settingsPublishReason,
  onDiff,
  onMerge,
  onModeChange,
  onPublish,
  onSave
}: AdminShellHeaderProps) {
  const actionUnavailable = busy || (mode === 'settings' ? !settingsLoaded : !hasArticle)
  const saveUnavailable = actionUnavailable || !dirty
  const saveLabel = busy ? '处理中…' : mode === 'settings' ? '保存设置' : '保存'
  const savedState = dirty
    ? '尚未保存'
    : mode === 'settings'
      ? settingsLoaded ? '已保存' : '正在加载'
      : hasArticle ? '已保存' : '请选择文章'

  return (
    <TooltipProvider>
      <header className="topbar border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">J</span>
          <strong>Jia him</strong>
          <Badge className="mode-badge" variant="outline">
            <span className="status-dot" aria-hidden="true" />
            本地工作区
          </Badge>
          {gitStatus && (
            <Badge className="branch-badge max-w-52" title={gitStatus.blockReason} variant="secondary">
              <span className="truncate">{gitStatus.branch || 'detached'}</span>
              <em>{gitStatus.changedFiles.length}</em>
            </Badge>
          )}
          <Tabs value={mode} onValueChange={(value) => onModeChange(value as WorkspaceMode)}>
            <TabsList className="workspace-mode-tabs" aria-label="工作区模式">
              <TabsTrigger aria-controls="articles-workspace" id="articles-mode-tab" value="articles">文章管理</TabsTrigger>
              <TabsTrigger aria-controls="settings-workspace" id="settings-mode-tab" value="settings">站点设置</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="topbar-actions">
          <span className="save-state" aria-live="polite">{savedState}</span>
          <ThemeMenu />

          <DisabledActionTooltip reason={!publishEnabled ? (mode === 'settings' ? settingsPublishReason : gitStatus?.blockReason) : undefined}>
              <Button aria-label={mode === 'settings' ? '提交设置并推送' : '提交并推送'} className="topbar-publish-action" type="button" variant="secondary" disabled={!publishEnabled} onClick={onPublish}>
                <span className="topbar-publish-action__full" aria-hidden="true">{mode === 'settings' ? '提交设置并推送' : '提交并推送'}</span>
                <span className="topbar-publish-action__short" aria-hidden="true">{mode === 'settings' ? '发布设置' : '推送'}</span>
              </Button>
            </DisabledActionTooltip>
          {mode === 'articles' && (
            <Button className="topbar-merge-action" type="button" variant="secondary" disabled={!mergeEnabled} onClick={onMerge}>合并并发布</Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="更多操作" className="topbar-overflow-action" size="icon" variant="outline"><MoreHorizontalIcon /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {mode === 'articles' && previewUrl && (
                <DropdownMenuItem asChild>
                  <a href={previewUrl} target="_blank" rel="noreferrer"><ExternalLinkIcon />页面预览</a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem disabled={actionUnavailable} onSelect={onDiff}><GitCompareArrowsIcon />查看差异</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!publishEnabled} onSelect={onPublish}>{mode === 'settings' ? '提交设置并推送' : '提交并推送'}</DropdownMenuItem>
              {mode === 'articles' && <DropdownMenuItem disabled={!mergeEnabled} onSelect={onMerge}>合并并发布</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button type="button" disabled={saveUnavailable} onClick={onSave}>{saveLabel}</Button>
        </div>
      </header>
    </TooltipProvider>
  )
}
