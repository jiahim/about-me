import type { NextRequest, NextResponse } from 'next/server'

import { errorResponse, HttpError, jsonResponse, requireAdmin } from '@/lib/route-utils'
import { getSectionTransaction } from '@/lib/settings/service'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    const { id } = await context.params
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)) throw new HttpError(400, '栏目 ID 无效')
    return jsonResponse(await getSectionTransaction().previewArchive(id))
  } catch (error) {
    return errorResponse(error)
  }
}
