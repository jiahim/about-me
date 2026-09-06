import type { Article, CategoryId } from '../types'

const draftVersion = 1

export interface DraftArticle extends Article {
  isNew: boolean
  slug: string
  category: CategoryId
}

export interface DraftSnapshot {
  article: DraftArticle
  sourceFingerprint: string
  savedAt: number
}

interface StoredDraft extends DraftSnapshot {
  version: number
}

export interface DraftStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function draftKey(pathOrNewId: string): string {
  return 'jiahim:draft:' + pathOrNewId
}

export function articleFingerprint(article: Article): string {
  const source = JSON.stringify([
    article.path,
    article.title,
    article.date,
    article.description,
    article.updatedAt,
    article.canonical,
    article.author,
    article.body
  ])
  let hash = 2166136261

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

export function writeDraft(
  storage: DraftStorage,
  key: string,
  snapshot: DraftSnapshot
): void {
  storage.setItem(key, JSON.stringify({ version: draftVersion, ...snapshot }))
}

export function readDraft(
  storage: DraftStorage,
  key: string,
  sourceFingerprint: string
): DraftSnapshot | null {
  const value = storage.getItem(key)
  if (!value) return null

  try {
    const stored = JSON.parse(value) as Partial<StoredDraft>

    if (
      stored.version !== draftVersion ||
      stored.sourceFingerprint !== sourceFingerprint ||
      !stored.article ||
      typeof stored.savedAt !== 'number'
    ) {
      return null
    }

    return {
      article: stored.article,
      sourceFingerprint: stored.sourceFingerprint,
      savedAt: stored.savedAt
    }
  } catch {
    return null
  }
}

export function clearDraft(storage: DraftStorage, key: string): void {
  storage.removeItem(key)
}
