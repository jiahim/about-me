import type { NextRequest, NextResponse } from 'next/server'

import { getGitStatus } from '@/lib/git/repository'
import { errorResponse, jsonResponse, requireAdmin } from '@/lib/route-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    return jsonResponse({ status: await getGitStatus() })
  } catch (error) {
    return errorResponse(error)
  }
}
