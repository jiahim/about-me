import type { NextRequest, NextResponse } from 'next/server'

import { getArticleDiff } from '@/lib/git/repository'
import { errorResponse, HttpError, jsonResponse, requireAdmin } from '@/lib/route-utils'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    const path = request.nextUrl.searchParams.get('path')
    if (!path) throw new HttpError(400, '缺少文章路径')
    return jsonResponse({ diff: await getArticleDiff(path) })
  } catch (error) {
    return errorResponse(error)
  }
}
