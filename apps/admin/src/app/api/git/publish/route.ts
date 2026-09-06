import type { NextRequest, NextResponse } from 'next/server'
import { evaluateEnvironmentReadiness } from '@jiahim/site-schema'

import { publishChanges } from '@/lib/git/workflow'
import { errorResponse, HttpError, jsonResponse, requireAdmin } from '@/lib/route-utils'
import { assertSameOrigin } from '@/lib/security'
import { collectReferencedSiteAssetPaths } from '@/lib/settings/publish-assets'
import { readSettingsSessionId } from '@/lib/settings/requests'
import { getSettingsRepository, getSettingsSessionStore } from '@/lib/settings/service'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    assertSameOrigin(request)
    const value = (await request.json()) as Record<string, unknown>

    if (value.scope === 'settings') {
      if (
        Object.keys(value).sort().join(',') !== 'date,message,scope' ||
        typeof value.message !== 'string' ||
        !value.message.trim() ||
        typeof value.date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value.date)
      ) {
        throw new HttpError(400, '设置发布参数必须且只能包含 scope、message、date')
      }
      const sessionId = readSettingsSessionId(request)
      const snapshot = await getSettingsRepository().read()
      const missingEnvironment = evaluateEnvironmentReadiness(
        snapshot.config,
        (name) => Boolean(process.env[name])
      ).filter((item) => !item.exists)
      if (missingEnvironment.length) {
        throw new HttpError(
          409,
          `发布前请配置必需环境变量：${missingEnvironment.map((item) => item.name).join('、')}`
        )
      }
      const store = getSettingsSessionStore()
      const verified = await store.verifyForPublish(
        sessionId!,
        collectReferencedSiteAssetPaths(snapshot.config),
        snapshot.baseHash
      )
      const result = await publishChanges({
        scope: 'settings',
        verified,
        message: value.message,
        date: value.date
      })
      await store.complete(sessionId!)
      return jsonResponse(result)
    }

    if (
      typeof value.articlePath !== 'string' ||
      typeof value.message !== 'string' ||
      typeof value.date !== 'string' ||
      !Array.isArray(value.mediaPaths) ||
      !value.mediaPaths.every((item) => typeof item === 'string')
    ) {
      throw new HttpError(400, '发布参数不完整')
    }

    return jsonResponse(
      await publishChanges({
        scope: 'article',
        articlePath: value.articlePath,
        mediaPaths: value.mediaPaths,
        message: value.message,
        date: value.date
      })
    )
  } catch (error) {
    return errorResponse(error)
  }
}
