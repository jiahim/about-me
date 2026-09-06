import { randomBytes } from 'node:crypto'
import { lstat, mkdir, open, realpath, rename, rm } from 'node:fs/promises'
import path from 'node:path'

import { sanitizeSlug } from '../content-config'
import type { MediaUpload } from '../content-repository'

export type BrandAssetKind = 'logo' | 'favicon' | 'appleTouchIcon' | 'shareImage'

const maximumBytes = 8 * 1024 * 1024

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte)
}

function detectedRasterType(bytes: Uint8Array): string | undefined {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpg'
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'gif'
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') return 'webp'
  if (new TextDecoder().decode(bytes.slice(4, 12)).includes('ftypavif')) return 'avif'
  return undefined
}

const mimeExtension = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif']
])

export function sanitizeSvg(source: string): string {
  if (!/^\s*<svg\b/i.test(source) || !/<\/svg>\s*$/i.test(source)) {
    throw new Error('SVG 内容无效')
  }
  if (/<!|<\?|&(?:#|[a-z])/i.test(source)) throw new Error('SVG 包含不安全实体或声明')
  const allowedTags = new Set([
    'svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
    'ellipse', 'title', 'desc', 'defs', 'lineargradient', 'radialgradient',
    'stop', 'clippath', 'mask'
  ])
  const allowedAttributes = new Set([
    'xmlns', 'viewbox', 'width', 'height', 'x', 'y', 'x1', 'x2', 'y1', 'y2',
    'cx', 'cy', 'r', 'rx', 'ry', 'd', 'fill', 'stroke', 'stroke-width',
    'stroke-linecap', 'stroke-linejoin', 'opacity', 'transform', 'points',
    'offset', 'stop-color', 'stop-opacity', 'fill-rule', 'clip-rule',
    'aria-hidden', 'role'
  ])
  const tags = source.match(/<\/?[A-Za-z][^<>]*>/g) || []
  const markupOnly = source.replace(/<\/?[A-Za-z][^<>]*>/g, '')
  if (/[<>]/.test(markupOnly)) throw new Error('SVG 包含不安全标记')
  for (const tag of tags) {
    const match = tag.match(/^<\/?([A-Za-z][A-Za-z0-9-]*)/)
    const name = match?.[1].toLowerCase()
    if (!name || !allowedTags.has(name)) throw new Error(`SVG 标签不允许：${name || 'unknown'}`)
    if (tag.startsWith('</')) continue
    const attributesSource = tag
      .replace(/^<[A-Za-z][A-Za-z0-9-]*/, '')
      .replace(/\/?>$/, '')
    let consumed = ''
    for (const attribute of attributesSource.matchAll(/\s+([A-Za-z][A-Za-z0-9:-]*)\s*=\s*("[^"]*"|'[^']*')/g)) {
      consumed += attribute[0]
      const attributeName = attribute[1].toLowerCase()
      const value = attribute[2].slice(1, -1)
      if (!allowedAttributes.has(attributeName) || attributeName.includes(':')) {
        throw new Error(`SVG 包含不安全或不允许的属性：${attributeName}`)
      }
      if (attributeName === 'xmlns' && value !== 'http://www.w3.org/2000/svg') {
        throw new Error('SVG 命名空间不允许')
      }
      if (attributeName !== 'xmlns' && /javascript:|data:|https?:|\/\/|url\s*\(/i.test(value)) {
        throw new Error('SVG 包含不安全属性值')
      }
    }
    if (consumed.trim() !== attributesSource.trim()) {
      throw new Error('SVG 包含无法识别或不允许的属性')
    }
  }
  return source
}

export function validateBrandAsset(kind: BrandAssetKind, upload: MediaUpload): string {
  if (!upload.bytes.byteLength || upload.bytes.byteLength > maximumBytes) {
    throw new Error('图片必须小于 8 MB')
  }
  if (upload.type === 'image/svg+xml') {
    if (kind !== 'logo' && kind !== 'favicon') {
      throw new Error('SVG 只允许用于 logo 或 favicon')
    }
    sanitizeSvg(new TextDecoder().decode(upload.bytes))
    return 'svg'
  }
  const declared = mimeExtension.get(upload.type)
  if (!declared) throw new Error('不支持的图片类型')
  const detected = detectedRasterType(upload.bytes)
  if (detected !== declared) throw new Error('图片 MIME 与实际内容不一致')
  return declared
}

export function createBrandAssetDestination(
  kind: BrandAssetKind,
  upload: MediaUpload,
  suffix = randomBytes(4).toString('hex')
): { path: string; publicUrl: string } {
  const extension = validateBrandAsset(kind, upload)
  const originalStem = path.basename(upload.name).replace(/\.[^.]+$/, '')
  const stem = sanitizeSlug(originalStem).toLowerCase() || 'asset'
  const filename = `${kind}-${stem}-${suffix}.${extension}`
  return {
    path: `docs/public/images/site/${filename}`,
    publicUrl: `/images/site/${filename}`
  }
}

async function ensureContainedDirectory(repositoryRoot: string, relativePath: string): Promise<string> {
  const root = path.resolve(repositoryRoot)
  const realRoot = await realpath(root)
  let current = root

  for (const segment of relativePath.split('/')) {
    current = path.join(current, segment)
    try {
      const metadata = await lstat(current)
      if (metadata.isSymbolicLink()) throw new Error('站点资源路径祖先不能包含符号链接')
      if (!metadata.isDirectory()) throw new Error('站点资源路径祖先必须是目录')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      await mkdir(current, { mode: 0o755 })
      const metadata = await lstat(current)
      if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
        throw new Error('站点资源路径祖先必须是普通目录')
      }
    }

    const realCurrent = await realpath(current)
    const relative = path.relative(realRoot, realCurrent)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('站点资源目录越出仓库')
    }
  }

  return current
}

export async function saveBrandAsset(
  repositoryRoot: string,
  kind: BrandAssetKind,
  upload: MediaUpload,
  suffix?: string
): Promise<{ path: string; publicUrl: string; changedPaths: string[]; mimeType: string; suggestedAlt: string }> {
  const destination = createBrandAssetDestination(kind, upload, suffix)
  const root = path.resolve(repositoryRoot)
  await ensureContainedDirectory(root, 'docs/public/images/site')

  const destinationPath = path.join(root, destination.path)
  const temporaryPath = `${destinationPath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
  const contents = upload.type === 'image/svg+xml'
    ? new TextEncoder().encode(sanitizeSvg(new TextDecoder().decode(upload.bytes)))
    : upload.bytes
  let handle: Awaited<ReturnType<typeof open>> | undefined
  let published = false
  try {
    handle = await open(temporaryPath, 'wx', 0o644)
    await handle.writeFile(contents)
    await handle.sync()
    await handle.close()
    handle = undefined
    await rename(temporaryPath, destinationPath)
    published = true
  } finally {
    if (handle) await handle.close().catch(() => undefined)
    if (!published) await rm(temporaryPath, { force: true }).catch(() => undefined)
  }
  const originalStem = path.basename(upload.name).replace(/\.[^.]+$/, '').normalize('NFKC').trim()
  return {
    ...destination,
    changedPaths: [destination.path],
    mimeType: upload.type,
    suggestedAlt: originalStem || kind
  }
}
