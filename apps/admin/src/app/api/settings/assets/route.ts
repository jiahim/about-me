import type { NextRequest, NextResponse } from 'next/server'

import { findRepositoryRoot } from '@/lib/repository-root'
import { errorResponse, HttpError, jsonResponse, requireAdmin } from '@/lib/route-utils'
import { assertSameOrigin } from '@/lib/security'
import { saveBrandAsset, type BrandAssetKind } from '@/lib/settings/assets'
import { readSettingsSessionId } from '@/lib/settings/requests'
import { getSettingsSessionStore } from '@/lib/settings/service'

const kinds = new Set<BrandAssetKind>(['logo', 'favicon', 'appleTouchIcon', 'shareImage'])

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    assertSameOrigin(request)
    const sessionId = readSettingsSessionId(request)
    const form = await request.formData()
    const kind = form.get('kind')
    const file = form.get('file')
    if (typeof kind !== 'string' || !kinds.has(kind as BrandAssetKind)) throw new HttpError(400, '资源用途无效')
    if (
      !file ||
      typeof file !== 'object' ||
      !('arrayBuffer' in file) ||
      typeof file.arrayBuffer !== 'function' ||
      !('name' in file) ||
      typeof file.name !== 'string' ||
      !('type' in file) ||
      typeof file.type !== 'string'
    ) throw new HttpError(400, '请选择资源文件')
    const { result, session } = await getSettingsSessionStore().mutate(sessionId!, undefined, async (baseHash) => {
      const saved = await saveBrandAsset(findRepositoryRoot(), kind as BrandAssetKind, {
        name: file.name,
        type: file.type,
        bytes: new Uint8Array(await file.arrayBuffer())
      })
      return { result: saved, baseHashAfter: baseHash, changedPaths: saved.changedPaths }
    })
    return jsonResponse({ ...result, session }, 201)
  } catch (error) {
    return errorResponse(error)
  }
}
