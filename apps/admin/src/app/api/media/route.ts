import type { NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'

import { assertArticlePath } from '@/lib/content-config'
import { getContentRepository } from '@/lib/content-repository'
import { errorResponse, HttpError, jsonResponse, requireAdmin } from '@/lib/route-utils'
import { assertSameOrigin } from '@/lib/security'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request)
    assertSameOrigin(request)
    const formData = await request.formData()
    const path = formData.get('path')
    const file = formData.get('file')

    if (typeof path !== 'string') {
      throw new HttpError(400, '请先保存文章，再上传图片')
    }

    if (!(file instanceof File)) {
      throw new HttpError(400, '请选择要上传的图片')
    }

    assertArticlePath(path)
    const result = await getContentRepository().uploadMedia(path, {
      name: file.name,
      type: file.type,
      bytes: new Uint8Array(await file.arrayBuffer())
    })
    return jsonResponse(result, 201)
  } catch (error) {
    return errorResponse(error)
  }
}
