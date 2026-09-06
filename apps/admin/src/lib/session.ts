import type { AdminIdentity } from './types'

const localAdmin: AdminIdentity = {
  login: '本地工作区',
  local: true
}

export async function getCurrentAdmin(): Promise<AdminIdentity> {
  return localAdmin
}
