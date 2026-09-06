import type { ArticleSummary, CategoryId } from '../types'

export function filterArticles(
  articles: readonly ArticleSummary[],
  category: CategoryId | 'all',
  query: string
): ArticleSummary[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()

  return articles.filter((article) => {
    if (category !== 'all' && article.category !== category) {
      return false
    }

    if (!normalizedQuery) {
      return true
    }

    return [article.title, article.description, article.path].some((value) =>
      value.toLocaleLowerCase().includes(normalizedQuery)
    )
  })
}
