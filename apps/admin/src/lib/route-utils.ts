import { NextResponse } from 'next/server'

import { getCurrentAdmin } from './session'
import { assertLoopbackRequest, RequestSecurityError } from './security'
import type { AdminIdentity } from './types'

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

export async function requireAdmin(request: Request): Promise<AdminIdentity> {
  try {
    assertLoopbackRequest(request)
  } catch (error) {
    throw new HttpError(
      403,
      error instanceof Error ? error.message : '管理端仅允许本机访问'
    )
  }

  const admin = await getCurrentAdmin()

  if (!admin) {
    throw new HttpError(401, '登录已失效，请重新登录')
  }

  return admin
}

export function jsonResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  })
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError || error instanceof RequestSecurityError) {
    return jsonResponse({ error: error.message }, error.status)
  }

  const message = error instanceof Error ? error.message : '发生未知错误'
  return jsonResponse({ error: message }, 500)
}
