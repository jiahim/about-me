import { lstat, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  createBrandAssetDestination,
  saveBrandAsset,
  sanitizeSvg,
  validateBrandAsset
} from './assets'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('brand assets', () => {
  it('uses detected raster types and a collision-resistant site path', () => {
    const upload = {
      name: '../My Logo.png',
      type: 'image/png',
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    }
    expect(validateBrandAsset('logo', upload)).toBe('png')
    expect(createBrandAssetDestination('logo', upload, 'abcd1234')).toEqual({
      path: 'docs/public/images/site/logo-my-logo-abcd1234.png',
      publicUrl: '/images/site/logo-my-logo-abcd1234.png'
    })
  })

  it('rejects MIME/magic mismatches and oversized files', () => {
    expect(() => validateBrandAsset('shareImage', {
      name: 'fake.png', type: 'image/png', bytes: new Uint8Array([0xff, 0xd8, 0xff])
    })).toThrow(/内容/)
    expect(() => validateBrandAsset('logo', {
      name: 'large.png', type: 'image/png', bytes: new Uint8Array(8 * 1024 * 1024 + 1)
    })).toThrow(/8 MB/)
  })

  it('allows sanitized SVG only for logo and favicon', () => {
    const malicious = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><image href="https://evil.example/a.png"/></svg>'
    expect(() => sanitizeSvg(malicious)).toThrow(/不安全/)
    expect(() => validateBrandAsset('shareImage', {
      name: 'share.svg', type: 'image/svg+xml', bytes: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    })).toThrow(/logo|favicon/)
    expect(validateBrandAsset('favicon', {
      name: 'icon.svg', type: 'image/svg+xml', bytes: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>')
    })).toBe('svg')
  })

  it('fails closed on SVG links, entities, animation, and unknown namespaces', () => {
    for (const source of [
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><path d="M0 0"/></a></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><use href="&#x68;ttps://evil.example/x"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="href" values="x;y"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M0 0"/></svg>'
    ]) {
      expect(() => sanitizeSvg(source)).toThrow(/不安全|不允许/)
    }
  })

  it('atomically writes only below the site image directory', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'brand-assets-'))
    temporaryDirectories.push(root)
    await mkdir(path.join(root, 'docs/public/images'), { recursive: true })
    const result = await saveBrandAsset(root, 'logo', {
      name: 'logo.png', type: 'image/png', bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    }, 'fixed123')

    expect(result.path).toBe('docs/public/images/site/logo-logo-fixed123.png')
    expect(await readFile(path.join(root, result.path))).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  })

  it('refuses a symlinked site image directory', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'brand-assets-link-'))
    const outside = await mkdtemp(path.join(os.tmpdir(), 'brand-assets-outside-'))
    temporaryDirectories.push(root, outside)
    await mkdir(path.join(root, 'docs/public/images'), { recursive: true })
    await symlink(outside, path.join(root, 'docs/public/images/site'))

    await expect(saveBrandAsset(root, 'logo', {
      name: 'logo.png', type: 'image/png', bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    })).rejects.toThrow(/符号链接/)
  })

  it('does not create directories through a symlinked docs ancestor', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'brand-assets-root-link-'))
    const outside = await mkdtemp(path.join(os.tmpdir(), 'brand-assets-root-outside-'))
    temporaryDirectories.push(root, outside)
    await symlink(outside, path.join(root, 'docs'))

    await expect(saveBrandAsset(root, 'logo', {
      name: 'logo.png', type: 'image/png', bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    })).rejects.toThrow(/符号链接|越出/)
    await expect(lstat(path.join(outside, 'public'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
