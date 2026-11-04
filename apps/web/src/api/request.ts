import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { RequestClient } from '@/utils/request/request-client'
import { toHttpError } from '@/utils/request/http-error'

const API_BASE = 'http://localhost:3000'

interface AuthHooks {
  getAccessToken: () => string | null
  refresh: () => Promise<boolean>
  clearAuth: () => void
}

// 给当前项目的重试过程保存标记和本次使用的 token。
type AuthRequestConfig = InternalAxiosRequestConfig & {
  _retried?: boolean
  _accessTokenUsed?: string | null
}

let authHooks: AuthHooks | null = null

/**
 * 由认证 store 注册回调。
 * 避免 request.ts 和 auth store 互相直接导入。
 */
export function configureAuth(hooks: AuthHooks) {
  authHooks = hooks
}

const config = {
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: true,
}

/**
 * 基础客户端：
 * 登录、刷新、退出使用它，避免触发 access token 刷新拦截器。
 */
export const baseRequestClient = new RequestClient(config)

/**
 * 业务客户端：
 * 受保护接口使用它，自动添加 access token。
 */
export const requestClient = new RequestClient(config)

// 基础客户端也统一转换错误，但不进行 token 刷新。
baseRequestClient.instance.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toHttpError(error)),
)

// 每次发送受保护请求前，从 store 获取当前 token。
requestClient.instance.interceptors.request.use((config) => {
  const authConfig = config as AuthRequestConfig
  const token = authHooks?.getAccessToken() ?? null

  authConfig._accessTokenUsed = token

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  } else {
    config.headers.delete('Authorization')
  }

  return config
})

requestClient.instance.interceptors.response.use(
  (response) => response,

  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(toHttpError(error))
    }

    const axiosError = error as AxiosError
    const original = axiosError.config as AuthRequestConfig | undefined
    const hooks = authHooks

    // 非 401、缺少原请求、没有认证回调，直接交给统一错误处理。
    if (axiosError.response?.status !== 401 || !original || !hooks) {
      return Promise.reject(toHttpError(error))
    }

    // 一次业务请求最多重试一次，避免无限循环。
    if (original._retried) {
      hooks.clearAuth()
      return Promise.reject(toHttpError(error))
    }

    original._retried = true

    try {
      const currentToken = hooks.getAccessToken()

      // 如果其他请求已经更新 token，直接使用新 token 重试。
      // 否则由 store 的 refreshPromise 合并同一页面内的并发刷新。
      if (!currentToken || currentToken === original._accessTokenUsed) {
        const refreshed = await hooks.refresh()

        if (!refreshed) {
          return Promise.reject(toHttpError(error))
        }
      }

      // 重试经过请求拦截器，会附加最新 token。
      return requestClient.instance.request(original)
    } catch (refreshError) {
      // 网络或服务器错误继续向上抛出，不伪装成正常退出。
      return Promise.reject(toHttpError(refreshError))
    }
  },
)
