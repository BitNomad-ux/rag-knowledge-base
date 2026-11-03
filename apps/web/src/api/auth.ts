// login、refresh、logout 接口
import { assertOk, request } from './http'

export interface User {
  id: string
  email: string
  displayName: string
}

export interface AuthResponse {
  accessToken: string
  expiresIn: number
  user: User
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const response = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  await assertOk(response)
  return (await response.json()) as AuthResponse
}

export async function refreshApi(): Promise<AuthResponse | null> {
  const response = await request('/auth/refresh', {
    method: 'POST',
  })

  // 没有有效会话属于正常的未登录状态。
  if (response.status === 401) return null

  await assertOk(response)
  return (await response.json()) as AuthResponse
}

export async function logoutApi(): Promise<void> {
  const response = await request('/auth/logout', {
    method: 'POST',
  })

  await assertOk(response)
}
