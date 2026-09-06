'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { extractOutline } from '@/lib/editor/outline'
import { readFontSizePreference, stepFontSizePreference, writeFontSizePreference, type FontSizePreference } from '@/lib/editor/font-size-preference'
import { scrollRatio, scrollTopForRatio } from '@/lib/editor/scroll-sync'
import type { ArticleFinding } from '@/lib/seo/article-checks'
import { ArticleQualityPanel } from './ArticleQualityPanel'
import { FontSizeControl } from './FontSizeControl'

const PREVIEW_FONT_SIZE_STORAGE_KEY = 'jiahim:preview-font-size:v1'
const previewFontSizeLabels: Record<FontSizePreference, string> = {
  small: '14px',
  medium: '16px',
  large: '18px'
}

interface PreviewPaneProps {
  body: string
  categoryLabel: string
  date: string
  description: string
  siteUrl: string
  syncScroll: boolean
  title: string
  remoteScrollRatio?: number
  remoteScrollRevision?: number
  onScrollRatio: (ratio: number) => void
  onSelectLine: (line: number) => void
  onSyncScrollChange: (enabled: boolean) => void
  findings?: readonly ArticleFinding[]
}

export function PreviewPane({
  body,
  categoryLabel,
  date,
  description,
  siteUrl,
  syncScroll,
  title,
  remoteScrollRatio,
  remoteScrollRevision,
  onScrollRatio,
  onSelectLine,
  onSyncScrollChange,
  findings = []
}: PreviewPaneProps) {
  const [view, setView] = useState<'preview' | 'outline' | 'quality'>('preview')
  const [fontSize, setFontSize] = useState<FontSizePreference>(() =>
    typeof window === 'undefined'
      ? 'medium'
      : readFontSizePreference(window.localStorage, PREVIEW_FONT_SIZE_STORAGE_KEY, 'medium')
  )
  const previewRef = useRef<HTMLElement>(null)
  const suppressScrollRef = useRef(false)
  const lastRemoteRevisionRef = useRef(0)
  const outline = useMemo(() => extractOutline(body), [body])

  function changeFontSize(direction: -1 | 1) {
    const next = stepFontSizePreference(fontSize, direction)
    setFontSize(next)
    writeFontSizePreference(window.localStorage, PREVIEW_FONT_SIZE_STORAGE_KEY, next)
  }

  useEffect(() => {
    const preview = previewRef.current
    if (
      !preview ||
      remoteScrollRatio === undefined ||
      remoteScrollRevision === undefined ||
      remoteScrollRevision <= lastRemoteRevisionRef.current
    ) {
      return
    }

    lastRemoteRevisionRef.current = remoteScrollRevision
    suppressScrollRef.current = true
    preview.scrollTop = scrollTopForRatio(preview, remoteScrollRatio)
    window.requestAnimationFrame(() => {
      suppressScrollRef.current = false
    })
  }, [remoteScrollRatio, remoteScrollRevision, view])

  return (
    <aside className="preview-pane" data-font-size={fontSize} aria-label="文章预览与大纲">
      <div className="pane-toolbar">
        <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}><TabsList className="view-switch" aria-label="预览视图">
          <TabsTrigger value="preview">预览</TabsTrigger>
          <TabsTrigger value="outline">大纲</TabsTrigger>
          <TabsTrigger value="quality">检查{findings.length ? ` (${findings.length})` : ''}</TabsTrigger>
        </TabsList></Tabs>
        <div className="preview-toolbar-actions">
          <FontSizeControl
            label="预览字号"
            level={fontSize}
            valueLabel={previewFontSizeLabels[fontSize]}
            onDecrease={() => changeFontSize(-1)}
            onIncrease={() => changeFontSize(1)}
          />
          <Button
            className={'sync-button ' + (syncScroll ? 'is-active' : '')}
            size="sm"
            variant={syncScroll ? 'secondary' : 'outline'}
            type="button"
            aria-pressed={syncScroll}
            onClick={() => onSyncScrollChange(!syncScroll)}
          >
            {syncScroll ? '滚动同步' : '独立滚动'}
          </Button>
        </div>
      </div>

      {view === 'preview' ? (
        <article
          ref={previewRef}
          className="markdown-preview"
          onScroll={(event) => {
            if (suppressScrollRef.current) return
            onScrollRatio(scrollRatio(event.currentTarget))
          }}
        >
          <p className="preview-kicker">
            {categoryLabel} · {date || '未设置日期'}
          </p>
          <h1>{title || '未命名文章'}</h1>
          {description && <p className="preview-description">{description}</p>}
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ children, ...props }) => (
                <a {...props} target="_blank" rel="noreferrer">
                  {children}
                </a>
              ),
              img: ({ src, alt }) => {
                const imageSource =
                  typeof src === 'string' && src.startsWith('/')
                    ? siteUrl.replace(/\/$/, '') + src
                    : src

                return <img src={imageSource} alt={alt || ''} />
              }
            }}
          >
            {body}
          </ReactMarkdown>
          {!body && <p className="preview-placeholder">正文预览会显示在这里。</p>}
        </article>
      ) : view === 'outline' ? (
        <nav className="outline-list" aria-label="文章大纲">
          <p className="eyebrow">ARTICLE OUTLINE</p>
          {outline.length ? (
            outline.map((item) => (
              <Button
                key={item.id}
                type="button"
                style={{ paddingLeft: (item.level - 1) * 12 }}
                variant="ghost"
                onClick={() => onSelectLine(item.line)}
              >
                {item.text}
              </Button>
            ))
          ) : (
            <p className="list-message">正文中还没有二级标题。</p>
          )}
        </nav>
      ) : <ArticleQualityPanel findings={findings} onSelectLine={onSelectLine} />}
    </aside>
  )
}
