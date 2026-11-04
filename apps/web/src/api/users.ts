// 获取当前用户
import type { User } from './auth'
import { requestClient } from './request'

export interface CurrentUser extends User {
  createdAt: string
}

export function getCurrentUser(): Promise<CurrentUser> {
  return requestClient.get<CurrentUser>('/users/me')
}
