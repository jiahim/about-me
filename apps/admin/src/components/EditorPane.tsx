'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type { DraftArticle } from '@/lib/editor/drafts'
import { readFontSizePreference, stepFontSizePreference, writeFontSizePreference, type FontSizePreference } from '@/lib/editor/font-size-preference'
import type { CategoryDefinition } from '@/lib/types'
import { ArticleTitleField } from './ArticleTitleField'
import { MarkdownEditor } from './MarkdownEditor'
import { FontSizeControl } from './FontSizeControl'

const EDITOR_FONT_SIZE_STORAGE_KEY = 'jiahim:editor-font-size:v1'
const editorFontSizeLabels: Record<FontSizePreference, string> = {
  small: '13px',
  medium: '14px',
  large: '16px'
}

interface EditorPaneProps {
  article: DraftArticle
  busy: boolean
  categories: readonly CategoryDefinition[]
  focusLine?: number
  remoteScrollRatio?: number
  remoteScrollRevision?: number
  wordCount: number
  onChange: <K extends keyof DraftArticle>(key: K, value: DraftArticle[K]) => void
  onSave: () => void
  onScrollRatio?: (ratio: number) => void
  onUpload: (file: File) => void
}

export function EditorPane({
  article,
  busy,
  categories,
  focusLine,
  remoteScrollRatio,
  remoteScrollRevision,
  wordCount,
  onChange,
  onSave,
  onScrollRatio,
  onUpload
}: EditorPaneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fontSize, setFontSize] = useState<FontSizePreference>(() =>
    typeof window === 'undefined'
      ? 'medium'
      : readFontSizePreference(window.localStorage, EDITOR_FONT_SIZE_STORAGE_KEY, 'medium')
  )

  function changeFontSize(direction: -1 | 1) {
    const next = stepFontSizePreference(fontSize, direction)
    setFontSize(next)
    writeFontSizePreference(window.localStorage, EDITOR_FONT_SIZE_STORAGE_KEY, next)
  }

  return (
    <section className="source-pane" data-font-size={fontSize} aria-label="Markdown 编辑器" aria-busy={busy}>
      <div className="pane-toolbar">
        <div className="source-mode">
          <strong>源码</strong>
          <span>Markdown</span>
        </div>
        <div className="source-meta">
          <span>{wordCount.toLocaleString('zh-CN')} 字</span>
          <FontSizeControl
            label="编辑字号"
            level={fontSize}
            valueLabel={editorFontSizeLabels[fontSize]}
            onDecrease={() => changeFontSize(-1)}
            onIncrease={() => changeFontSize(1)}
          />
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onUpload(file)
              event.target.value = ''
            }}
          />
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={busy || article.isNew}
            title={article.isNew ? '先保存新文章，再上传图片' : undefined}
            onClick={() => fileInputRef.current?.click()}
          >
            上传图片
          </Button>
        </div>
      </div>

      <div className="article-fields">
        {article.isNew && (
          <div className="new-article-fields">
            <label>
              <span>分类</span>
              <Select
                value={article.category}
                onValueChange={(value) => onChange('category', value as DraftArticle['category'])}
              >
                <SelectTrigger aria-label="分类"><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {'　'.repeat(category.depth)}{category.label}
                  </SelectItem>
                ))}</SelectContent>
              </Select>
            </label>
            <label>
              <span>文件名</span>
              <Input
                value={article.slug}
                onChange={(event) => onChange('slug', event.target.value)}
                placeholder="my-new-article"
              />
            </label>
          </div>
        )}

        <ArticleTitleField
          value={article.title}
          onChange={(title) => onChange('title', title)}
        />

        <div className="metadata-fields" role="group" aria-label="文章元数据">
          <label>
            <span>发布日期</span>
            <Input
              type="date"
              value={article.date}
              onChange={(event) => onChange('date', event.target.value)}
            />
          </label>
          <label className="description-field">
            <span>摘要</span>
            <Input
              value={article.description}
              onChange={(event) => onChange('description', event.target.value)}
              placeholder="可选，用于搜索和分享"
              maxLength={500}
            />
          </label>
        </div>
      </div>

      <div className="codemirror-shell">
        <MarkdownEditor
          value={article.body}
          focusLine={focusLine}
          remoteScrollRatio={remoteScrollRatio}
          remoteScrollRevision={remoteScrollRevision}
          onChange={(body) => onChange('body', body)}
          onSave={onSave}
          onScrollRatio={onScrollRatio}
        />
      </div>
    </section>
  )
}
