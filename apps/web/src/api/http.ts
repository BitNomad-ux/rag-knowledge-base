// 通用请求、Bearer token、401 后刷新与重试
const API_BASE = 'http://localhost:3000'

/**
 * 由认证 store 注册的回调，用于获取 access token、刷新和清除认证信息。
 */
interface AuthHooks {
  getAccessToken: () => string | null
  refresh: () => Promise<boolean>
  clearAuth: () => void
}

let authHooks: AuthHooks | null = null

/**
 * 由认证 store 注册回调，避免 HTTP 客户端直接依赖 store。
 */
export function configureAuth(hooks: AuthHooks) {
  authHooks = hooks
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/**
 * 将后端非 2xx 响应转换成可展示的错误。
 */
export async function assertOk(response: Response): Promise<void> {
  if (response.ok) return

  let message = `请求失败（${response.status}）`

  try {
    const body: unknown = await response.json()

    if (typeof body === 'object' && body !== null && 'message' in body) {
      const value = body.message
      if (typeof value === 'string') {
        message = value
      } else if (Array.isArray(value)) {
        message = value.join('；')
      }
    }
  } catch {
    // 响应不是 JSON 时保留默认错误信息。
  }

  throw new HttpError(response.status, message)
}

/**
 * 普通请求：用于登录、刷新和退出。
 */
export function request(path: string, options: RequestInit = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
  })
}

/**
 * 受保护请求：附带 access token。
 * 收到 401 后尝试刷新，并最多重试一次。
 */
export async function authorizedRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  if (!authHooks) {
    throw new Error('认证模块尚未初始化')
  }

  const hooks = authHooks

  const send = (token: string | null) => {
    const headers = new Headers(options.headers)

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    return request(path, { ...options, headers })
  }

  const tokenUsed = hooks.getAccessToken()
  const response = await send(tokenUsed)

  if (response.status !== 401) {
    return response
  }

  const currentToken = hooks.getAccessToken()

  /**
   * 情况一：其他请求已经刷新成功
   */
  if (currentToken && currentToken !== tokenUsed) {
    return send(currentToken)
  }

  /**
   * 情况二：没有其他请求完成刷新
   */
  const refreshed = await hooks.refresh()

  /**
   * 情况三：刷新失败
   */
  if (!refreshed) {
    return response
  }

  /**
   * 情况四：刷新成功后重试
   */
  const retryResponse = await send(hooks.getAccessToken())

  /**
   * 情况五：重试后仍然 401
   */
  if (retryResponse.status === 401) {
    hooks.clearAuth()
  }

  return retryResponse
}
