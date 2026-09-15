import type { AdminIdentity } from './types'
import { authenticateAdminRequest } from './security'

export async function getCurrentAdmin(request: Request): Promise<AdminIdentity> {
  return authenticateAdminRequest(request)
}
