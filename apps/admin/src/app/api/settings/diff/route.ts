import type { NextRequest, NextResponse } from 'next/server'

import { getSettingsDiff } from '@/lib/git/repository'
import { errorResponse, HttpError, jsonResponse, requireAdmin } from '@/lib/route-utils'
import { collectReferencedSiteAssetPaths } from '@/lib/settings/publish-assets'
import { readSettingsSessionId } from '@/lib/settings/requests'
import { getSettingsRepository, getSettingsSessionStore } from '@/lib/settings/service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    if (new URL(request.url).search) {
      throw new HttpError(400, '设置 Diff 不接受路径或查询参数')
    }
    const sessionId = readSettingsSessionId(request)
    const snapshot = await getSettingsRepository().read()
    const store = getSettingsSessionStore()
    const scope = await store.verifyForDiff(
      sessionId!,
      collectReferencedSiteAssetPaths(snapshot.config),
      snapshot.baseHash
    )
    return jsonResponse({ ...(await getSettingsDiff(scope.paths)), session: await store.get(sessionId!) })
  } catch (error) {
    return errorResponse(error)
  }
}
