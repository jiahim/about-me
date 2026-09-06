import type { NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'

import { assertArticlePath } from '@/lib/content-config'
import { getContentRepository } from '@/lib/content-repository'
import { errorResponse, HttpError, jsonResponse, requireAdmin } from '@/lib/route-utils'
import { assertSameOrigin } from '@/lib/security'
import { parseArticleInput, parseNewArticleInput } from '@/lib/validation'
import { ArticleConflictError } from '@/lib/local-repository'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    const path = request.nextUrl.searchParams.get('path')

    if (!path) {
      throw new HttpError(400, '缺少文章路径')
    }

    assertArticlePath(path)
    const article = await getContentRepository().getArticle(path)
    return jsonResponse({ article })
  } catch (error) {
    if (error instanceof ArticleConflictError) return jsonResponse({ error: error.message }, 409)
    return errorResponse(error)
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    assertSameOrigin(request)
    const input = parseArticleInput(await request.json())
    const result = await getContentRepository().saveArticle(input)
    return jsonResponse(result)
  } catch (error) {
    if (error instanceof ArticleConflictError) return jsonResponse({ error: error.message }, 409)
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    assertSameOrigin(request)
    const input = parseNewArticleInput(await request.json())
    const result = await getContentRepository().createArticle(input)
    return jsonResponse(result, 201)
  } catch (error) {
    return errorResponse(error)
  }
}
