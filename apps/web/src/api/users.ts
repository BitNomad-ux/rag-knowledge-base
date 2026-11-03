// 获取当前用户
import type { User } from './auth'
import { assertOk, authorizedRequest } from './http'

export interface CurrentUser extends User {
  createdAt: string
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await authorizedRequest('/users/me')

  await assertOk(response)
  return (await response.json()) as CurrentUser
}
