import type { NextRequest, NextResponse } from 'next/server'

import { getContentRepository } from '@/lib/content-repository'
import { errorResponse, jsonResponse, requireAdmin } from '@/lib/route-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    const articles = await getContentRepository().listArticles()
    return jsonResponse({ articles })
  } catch (error) {
    return errorResponse(error)
  }
}
