import type { NextRequest, NextResponse } from 'next/server'
import { evaluateEnvironmentReadiness } from '@jiahim/site-schema'

import { errorResponse, HttpError, jsonResponse, requireAdmin } from '@/lib/route-utils'
import { getSettingsRepository } from '@/lib/settings/service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    if (new URL(request.url).search) {
      throw new HttpError(400, '环境变量状态不接受查询参数')
    }
    const { config } = await getSettingsRepository().read()
    return jsonResponse({
      requirements: evaluateEnvironmentReadiness(config, (name) => Boolean(process.env[name]))
    })
  } catch (error) {
    return errorResponse(error)
  }
}
