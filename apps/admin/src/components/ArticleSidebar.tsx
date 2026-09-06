import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

import { filterArticles } from '@/lib/editor/article-filter'
import type {
  ArticleSummary,
  CategoryDefinition,
  CategoryId
} from '@/lib/types'

interface ArticleSidebarProps {
  articles: readonly ArticleSummary[]
  categories: readonly CategoryDefinition[]
  collapsed: boolean
  currentPath?: string
  filter: CategoryId | 'all'
  loading: boolean
  query: string
  onCollapsedChange: (collapsed: boolean) => void
  onFilterChange: (filter: CategoryId | 'all') => void
  onNew: () => void
  onOpen: (path: string) => void
  onQueryChange: (query: string) => void
}

export function articleCategoryFilterOptions(
  articles: readonly ArticleSummary[],
  categories: readonly CategoryDefinition[]
): Array<{ value: CategoryId | 'all'; label: string; count: number }> {
  return [
    { value: 'all', label: '全部文章', count: articles.length },
    ...categories.map((category) => ({
      value: category.id,
      label: category.label,
      count: articles.filter((article) => article.category === category.id).length
    }))
  ]
}

function categoryLabel(
  categories: readonly CategoryDefinition[],
  categoryId: CategoryId
): string {
  return categories.find((category) => category.id === categoryId)?.label || categoryId
}

export function ArticleSidebar({
  articles,
  categories,
  collapsed,
  currentPath,
  filter,
  loading,
  query,
  onCollapsedChange,
  onFilterChange,
  onNew,
  onOpen,
  onQueryChange
}: ArticleSidebarProps) {
  const visibleArticles = useMemo(
    () => filterArticles(articles, filter, query),
    [articles, filter, query]
  )
  const categoryOptions = useMemo(
    () => articleCategoryFilterOptions(articles, categories),
    [articles, categories]
  )

  const renderArticle = (article: ArticleSummary) => (
    <Button
      type="button"
      key={article.path}
      className={'article-row h-auto whitespace-normal ' + (currentPath === article.path ? 'is-active' : '')}
      variant="ghost"
      title={article.title}
      onClick={() => onOpen(article.path)}
    >
      <strong>{article.title}</strong>
      <span className="article-row__meta">
        {filter === 'all' && (
          <span className="article-row__category">
            {categoryLabel(categories, article.category)}
          </span>
        )}
        {article.draft && <Badge variant="secondary">草稿</Badge>}
        <small className="article-row__date">
          {article.date || '未设置日期'}
        </small>
      </span>
    </Button>
  )

  const sidebarToggle = (
    <Button
      className="sidebar-toggle-button"
      size="icon"
      variant="ghost"
      type="button"
      aria-label={collapsed ? '展开文章列表' : '收起文章列表'}
      aria-expanded={!collapsed}
      onClick={() => onCollapsedChange(!collapsed)}
    >
      {collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
    </Button>
  )

  if (collapsed) {
    return (
      <aside id="article-sidebar" className="article-sidebar article-sidebar--collapsed" aria-label="文章列表">
        {sidebarToggle}
      </aside>
    )
  }

  return (
    <aside id="article-sidebar" className="article-sidebar" aria-label="文章列表">
      {sidebarToggle}
      <div className="sidebar-heading">
        <div>
          <p className="eyebrow">LIBRARY</p>
          <h1>文章</h1>
        </div>
        <div className="sidebar-heading__actions">
          <Button className="new-button" size="sm" type="button" onClick={onNew}>
            <Plus aria-hidden="true" />
            新建
          </Button>
        </div>
      </div>

      <label className="search-field">
        <Search aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索标题、摘要或文件名"
          aria-label="搜索文章"
        />
      </label>

      <div className="category-filter">
        <Select
          value={filter}
          onValueChange={(value) => onFilterChange(value as CategoryId | 'all')}
        >
          <SelectTrigger className="category-filter__trigger" aria-label="文章分类">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label} · {option.count}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="article-list" aria-busy={loading}>
        {loading && <div className="grid gap-2 p-2" aria-label="正在读取文章"><span className="sr-only">正在读取文章…</span><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>}
        {!loading && !categories.length && !visibleArticles.length && (
          <p className="list-message">当前没有可显示的栏目。</p>
        )}
        {!loading && categories.length > 0 && !visibleArticles.length && (
          <p className="list-message">这里还没有匹配的文章。</p>
        )}
        {visibleArticles.map((article) => renderArticle(article))}
      </div>
    </aside>
  )
}
