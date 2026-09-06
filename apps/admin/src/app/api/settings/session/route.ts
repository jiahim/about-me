import type { NextRequest, NextResponse } from 'next/server'

import { errorResponse, jsonResponse, requireAdmin } from '@/lib/route-utils'
import { readSettingsSessionId } from '@/lib/settings/requests'
import { getSettingsSessionStore } from '@/lib/settings/service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    const sessionId = readSettingsSessionId(request)
    return jsonResponse(await getSettingsSessionStore().get(sessionId!))
  } catch (error) {
    return errorResponse(error)
  }
}
