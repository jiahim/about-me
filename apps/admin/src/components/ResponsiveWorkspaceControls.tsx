'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type CompactPane = 'source' | 'preview'

interface ResponsiveWorkspaceControlsProps {
  drawerOpen: boolean
  pane: CompactPane
  onDrawerOpenChange: (open: boolean) => void
  onPaneChange: (pane: CompactPane) => void
}

export function ResponsiveWorkspaceControls({
  drawerOpen,
  pane,
  onDrawerOpenChange,
  onPaneChange
}: ResponsiveWorkspaceControlsProps) {
  return (
    <div
      className="responsive-workspace-controls"
      role="toolbar"
      aria-label="窄屏工作区"
    >
      <Button
        className="responsive-drawer-button"
        variant="outline"
        type="button"
        aria-controls="article-sidebar"
        aria-expanded={drawerOpen}
        aria-label={drawerOpen ? '关闭文章列表' : '打开文章列表'}
        onClick={() => onDrawerOpenChange(!drawerOpen)}
      >
        <Menu aria-hidden="true" />
        文章
      </Button>

      <div className="responsive-pane-switch" aria-label="内容视图">
        <Button
          type="button"
          aria-pressed={pane === 'source'}
          className={pane === 'source' ? 'is-active' : ''}
          variant={pane === 'source' ? 'secondary' : 'ghost'}
          onClick={() => onPaneChange('source')}
        >
          编辑
        </Button>
        <Button
          type="button"
          aria-pressed={pane === 'preview'}
          className={pane === 'preview' ? 'is-active' : ''}
          variant={pane === 'preview' ? 'secondary' : 'ghost'}
          onClick={() => onPaneChange('preview')}
        >
          预览
        </Button>
      </div>
    </div>
  )
}
