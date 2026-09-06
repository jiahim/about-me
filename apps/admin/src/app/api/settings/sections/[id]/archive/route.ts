import type { NextRequest, NextResponse } from 'next/server'

import { errorResponse, HttpError, jsonResponse, requireAdmin } from '@/lib/route-utils'
import { assertSameOrigin } from '@/lib/security'
import { readJsonBody, readSettingsSessionId } from '@/lib/settings/requests'
import { getSectionTransaction, getSettingsSessionStore } from '@/lib/settings/service'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    assertSameOrigin(request)
    const sessionId = readSettingsSessionId(request)
    const body = await readJsonBody(request)
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !('baseHash' in body)) throw new HttpError(400, '请求只能包含 baseHash')
    const baseHash = (body as { baseHash?: unknown }).baseHash
    if (typeof baseHash !== 'string' || !/^[0-9a-f]{64}$/.test(baseHash)) throw new HttpError(400, 'baseHash 无效')
    const { id } = await context.params
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)) throw new HttpError(400, '栏目 ID 无效')
    const { result, session } = await getSettingsSessionStore().mutate(sessionId!, baseHash, async () => {
      const archived = await getSectionTransaction().archive(id, baseHash)
      return { result: archived, baseHashAfter: archived.baseHash, changedPaths: archived.changedPaths }
    })
    return jsonResponse({ ...result, session })
  } catch (error) {
    if (error instanceof Error && /其他进程修改|重新加载/.test(error.message)) return jsonResponse({ error: error.message }, 409)
    return errorResponse(error)
  }
}
