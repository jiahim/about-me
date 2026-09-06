import type { NextRequest, NextResponse } from 'next/server'

import { mergePullRequest } from '@/lib/git/workflow'
import { errorResponse, HttpError, jsonResponse, requireAdmin } from '@/lib/route-utils'
import { assertSameOrigin } from '@/lib/security'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    assertSameOrigin(request)
    const value = (await request.json()) as Record<string, unknown>

    if (
      Object.keys(value).sort().join(',') !== 'confirmed,expectedHeadOid,pullRequestNumber' ||
      typeof value.pullRequestNumber !== 'number' ||
      typeof value.expectedHeadOid !== 'string' ||
      value.confirmed !== true
    ) {
      throw new HttpError(400, '合并发布需要明确确认 Pull Request')
    }

    return jsonResponse(
      await mergePullRequest(value.pullRequestNumber, value.expectedHeadOid, value.confirmed)
    )
  } catch (error) {
    return errorResponse(error)
  }
}
