import { LocalContentRepository } from './local-repository'
import type {
  Article,
  ArticleInput,
  ArticleSummary,
  MediaResult,
  NewArticleInput,
  PublishResult,
  SaveResult
} from './types'

export interface MediaUpload {
  name: string
  type: string
  bytes: Uint8Array
}

export interface ContentRepository {
  listArticles(): Promise<ArticleSummary[]>
  getArticle(articlePath: string): Promise<Article>
  createArticle(input: NewArticleInput): Promise<SaveResult>
  saveArticle(input: ArticleInput): Promise<SaveResult>
  publishArticle(articlePath: string): Promise<PublishResult>
  uploadMedia(articlePath: string, upload: MediaUpload): Promise<MediaResult>
}

export function getContentRepository(): ContentRepository {
  return new LocalContentRepository()
}
