export type SectionId = string
export type CategoryId = SectionId

export interface CategoryDefinition {
  id: CategoryId
  label: string
  description: string
  directory: string
  parentId?: SectionId
  depth: number
  status: 'active' | 'hidden'
}

export interface ArticleSummary {
  path: string
  category: CategoryId
  title: string
  date: string
  description: string
  updatedAt?: string
  canonical?: string
  author?: string
  draft: boolean
  pullRequestNumber?: number
  pullRequestUrl?: string
}

export interface Article extends ArticleSummary {
  body: string
}

export interface ArticleInput {
  path: string
  title: string
  date: string
  description: string
  body: string
  baseHash?: string
}

export interface NewArticleInput extends Omit<ArticleInput, 'path' | 'baseHash'> {
  category: CategoryId
  slug: string
}

export interface SaveResult {
  article: Article
  message: string
}

export interface PublishResult {
  message: string
  commitSha?: string
}

export interface MediaResult {
  path: string
  publicUrl: string
  message: string
}

export interface AdminIdentity {
  login: string
  local: boolean
}
