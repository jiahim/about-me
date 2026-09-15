import type { AdminIdentity } from './types'
import { authorizeAdminRequest } from './security'

export async function getCurrentAdmin(request: Request): Promise<AdminIdentity> {
  return authorizeAdminRequest(request)
}
