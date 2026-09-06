import type { NextRequest, NextResponse } from 'next/server'

import { errorResponse, jsonResponse, requireAdmin } from '@/lib/route-utils'
import { assertSameOrigin } from '@/lib/security'
import { parseValidateSettingsRequest, readJsonBody } from '@/lib/settings/requests'
import { getSettingsRepository } from '@/lib/settings/service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    assertSameOrigin(request)
    const input = parseValidateSettingsRequest(await readJsonBody(request))
    return jsonResponse(getSettingsRepository().validate(input.config))
  } catch (error) {
    return errorResponse(error)
  }
}
