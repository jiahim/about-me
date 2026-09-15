import { NextRequest, NextResponse } from 'next/server'

import { authenticateAdminRequest } from '@/lib/security'

export function middleware(request: NextRequest): NextResponse {
  try {
    authenticateAdminRequest(request)
    return NextResponse.next()
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '管理端访问被拒绝' },
      {
        status: 403,
        headers: { 'Cache-Control': 'no-store' }
      }
    )
  }
}

export const config = {
  matcher: ['/', '/api/:path*']
}
