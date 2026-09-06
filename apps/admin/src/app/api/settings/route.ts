import type { NextRequest, NextResponse } from 'next/server'

import { errorResponse, jsonResponse, requireAdmin } from '@/lib/route-utils'
import { assertSameOrigin } from '@/lib/security'
import {
  SettingsConflictError,
  SettingsValidationError
} from '@/lib/settings/repository'
import { parseSaveSettingsRequest, readJsonBody, readSettingsSessionId } from '@/lib/settings/requests'
import { getSettingsRepository, getSettingsSessionStore } from '@/lib/settings/service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    const snapshot = await getSettingsRepository().read()
    const hintedId = readSettingsSessionId(request, false)
    let session
    if (hintedId) {
      try { session = await getSettingsSessionStore().get(hintedId) } catch { session = undefined }
    }
    session ??= await getSettingsSessionStore().create(snapshot.baseHash)
    return jsonResponse({ ...snapshot, session })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    assertSameOrigin(request)
    const sessionId = readSettingsSessionId(request)
    const input = parseSaveSettingsRequest(await readJsonBody(request))
    const { result, session } = await getSettingsSessionStore().mutate(sessionId!, input.baseHash, async () => {
      const saved = await getSettingsRepository().save(input)
      return { result: saved, baseHashAfter: saved.baseHash, changedPaths: saved.changedPaths }
    })
    return jsonResponse({ ...result, session })
  } catch (error) {
    if (error instanceof SettingsConflictError) {
      return jsonResponse({ error: error.message }, 409)
    }
    if (error instanceof SettingsValidationError) {
      return jsonResponse(
        { error: error.message, validation: { valid: false, issues: error.issues } },
        422
      )
    }
    return errorResponse(error)
  }
}
