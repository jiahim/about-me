import { randomBytes } from 'node:crypto'

import { sanitizeSlug } from './content-config'
import type { MediaUpload } from './content-repository'

const allowedTypes = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif']
])

const maximumMediaBytes = 8 * 1024 * 1024

export function createMediaDestination(upload: MediaUpload): { path: string; publicUrl: string } {
  if (!upload.bytes.byteLength || upload.bytes.byteLength > maximumMediaBytes) {
    throw new Error('图片必须小于 8 MB')
  }

  const extension = allowedTypes.get(upload.type)

  if (!extension) {
    throw new Error('仅支持 PNG、JPEG、GIF、WebP 和 AVIF 图片')
  }

  const originalStem = upload.name.replace(/\.[^.]+$/, '')
  const stem = sanitizeSlug(originalStem) || 'image'
  const now = new Date()
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const suffix = randomBytes(4).toString('hex')
  const filename = `${stem}-${suffix}.${extension}`
  const relativePath = `${year}/${month}/${filename}`

  return {
    path: `docs/public/images/articles/${relativePath}`,
    publicUrl: `/images/articles/${relativePath}`
  }
}
