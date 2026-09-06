import { assertArticlePath, isCategoryId } from './content-config'
import { HttpError } from './route-utils'
import type { ArticleInput, NewArticleInput } from './types'

const maximumBodyLength = 2_000_000

function recordValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, '请求内容格式不正确')
  }

  return value as Record<string, unknown>
}

function requiredString(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key]

  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${label}不能为空`)
  }

  return value
}

function optionalString(record: Record<string, unknown>, key: string): string {
  const value = record[key]

  if (value === undefined || value === null) {
    return ''
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, `${key} 格式不正确`)
  }

  return value
}

function validateEditableFields(record: Record<string, unknown>) {
  const title = requiredString(record, 'title', '标题')
  const date = optionalString(record, 'date')
  const description = optionalString(record, 'description')
  const body = optionalString(record, 'body')

  if (title.length > 120) {
    throw new HttpError(400, '标题不能超过 120 个字符')
  }

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpError(400, '发布日期必须使用 YYYY-MM-DD 格式')
  }

  if (description.length > 500) {
    throw new HttpError(400, '摘要不能超过 500 个字符')
  }

  if (body.length > maximumBodyLength) {
    throw new HttpError(400, '正文内容过长')
  }

  return { title, date, description, body }
}

export function parseArticleInput(value: unknown): ArticleInput {
  const record = recordValue(value)
  const path = requiredString(record, 'path', '文章路径')
  const baseHash = requiredString(record, 'baseHash', '文章基准指纹')
  assertArticlePath(path)
  return { path, baseHash, ...validateEditableFields(record) }
}

export function parseNewArticleInput(value: unknown): NewArticleInput {
  const record = recordValue(value)
  const category = requiredString(record, 'category', '文章分类')
  const slug = requiredString(record, 'slug', '文件名')

  if (!isCategoryId(category)) {
    throw new HttpError(400, '文章分类不正确')
  }

  return { category, slug, ...validateEditableFields(record) }
}
