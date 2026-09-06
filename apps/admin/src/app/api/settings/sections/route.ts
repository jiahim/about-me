import type { NextRequest, NextResponse } from 'next/server'

import { errorResponse, HttpError, jsonResponse, requireAdmin } from '@/lib/route-utils'
import { assertSameOrigin } from '@/lib/security'
import { readJsonBody, readSettingsSessionId } from '@/lib/settings/requests'
import { getSectionTransaction, getSettingsSessionStore } from '@/lib/settings/service'

function parseCreateSection(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, '请求正文必须是对象')
  const value = input as Record<string, unknown>
  const allowed = ['baseHash', 'name', 'slug', 'parentId', 'header', 'sidebar', 'collapsed']
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new HttpError(400, '请求包含未知字段')
  if (typeof value.baseHash !== 'string' || !/^[0-9a-f]{64}$/.test(value.baseHash)) throw new HttpError(400, 'baseHash 无效')
  if (typeof value.name !== 'string' || typeof value.slug !== 'string') throw new HttpError(400, '栏目名称与 slug 必填')
  if (value.parentId !== undefined && typeof value.parentId !== 'string') throw new HttpError(400, 'parentId 无效')
  for (const field of ['header', 'sidebar', 'collapsed'] as const) if (typeof value[field] !== 'boolean') throw new HttpError(400, `${field} 必须是布尔值`)
  return {
    baseHash: value.baseHash,
    name: value.name,
    slug: value.slug,
    ...(value.parentId ? { parentId: value.parentId as string } : {}),
    header: value.header as boolean,
    sidebar: value.sidebar as boolean,
    collapsed: value.collapsed as boolean
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    assertSameOrigin(request)
    const sessionId = readSettingsSessionId(request)
    const input = parseCreateSection(await readJsonBody(request))
    const { result, session } = await getSettingsSessionStore().mutate(sessionId!, input.baseHash, async () => {
      const created = await getSectionTransaction().create(input)
      return { result: created, baseHashAfter: created.baseHash, changedPaths: created.changedPaths }
    })
    return jsonResponse({ ...result, session }, 201)
  } catch (error) {
    if (error instanceof Error && /其他进程修改|重新加载/.test(error.message)) return jsonResponse({ error: error.message }, 409)
    return errorResponse(error)
  }
}
