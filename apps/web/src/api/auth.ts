import { baseRequestClient } from './request'
import { HttpError } from '@/utils/request/http-error'

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

export interface RegisterInput {
  email: string
  password: string
  displayName: string
}

export function registerApi(input: RegisterInput): Promise<User> {
  return baseRequestClient.post<User>('/auth/register', input)
}

export function loginApi(email: string, password: string): Promise<AuthResponse> {
  return baseRequestClient.post<AuthResponse>('/auth/login', {
    email,
    password,
  })
}

export async function refreshApi(): Promise<AuthResponse | null> {
  try {
    return await baseRequestClient.post<AuthResponse>('/auth/refresh')
  } catch (error) {
    // 没有有效会话是正常的未登录状态。
    if (error instanceof HttpError && error.status === 401) {
      return null
    }

    throw error
  }
}

export async function logoutApi(): Promise<void> {
  // 当前后端返回消息对象；前端退出流程不需要读取它。
  await baseRequestClient.post('/auth/logout')
}
