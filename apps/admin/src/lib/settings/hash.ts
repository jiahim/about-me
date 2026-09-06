import { createHash } from 'node:crypto'

export function hashContent(raw: string | Uint8Array): string {
  return createHash('sha256').update(raw).digest('hex')
}
