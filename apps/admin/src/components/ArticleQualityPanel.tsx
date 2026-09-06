'use client'

import type { ArticleFinding } from '@/lib/seo/article-checks'
import { Button } from '@/components/ui/button'

interface ArticleQualityPanelProps {
  findings: readonly ArticleFinding[]
  onSelectLine: (line: number) => void
}

const labels = { error: '错误', warning: '建议', info: '提示' } as const

export function ArticleQualityPanel({ findings, onSelectLine }: ArticleQualityPanelProps) {
  return <section className="article-quality" aria-label="SEO 与 GEO 检查">
    <p className="eyebrow">SEO / GEO QUALITY</p>
    <p className="settings-note">这是确定性的完整性检查，不代表搜索或 AI 排名。</p>
    {!findings.length ? <p className="alert alert--success">未发现结构化质量问题。</p> :
      (['error', 'warning', 'info'] as const).map((severity) => {
        const items = findings.filter((item) => item.severity === severity)
        if (!items.length) return null
        return <div className={`quality-group quality-group--${severity}`} key={severity}>
          <h2>{labels[severity]} · {items.length}</h2>
          {items.map((item) => item.line ?
            <Button className="quality-finding h-auto w-full justify-start" key={item.id} type="button" variant="ghost" onClick={() => onSelectLine(item.line!)}><strong>{item.field}</strong><span>{item.message}</span><code>第 {item.line} 行</code></Button> :
            <div className="quality-finding" key={item.id}><strong>{item.field}</strong><span>{item.message}</span></div>)}
        </div>
      })}
  </section>
}
