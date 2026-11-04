import axios from 'axios'

/**
 * 应用统一使用的 HTTP 错误。
 * status 为 0 表示没有收到服务器响应，例如网络故障。
 */
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
 * 将 Axios 错误转换成应用可以处理的错误。
 */
export function toHttpError(error: unknown): Error {
  if (error instanceof HttpError) {
    return error
  }

  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error('请求失败')
  }

  const status = error.response?.status ?? 0
  const data: unknown = error.response?.data

  let message = status === 0 ? '无法连接服务器，请检查网络或后端服务' : `请求失败（${status}）`

  if (typeof data === 'object' && data !== null && 'message' in data) {
    const value = data.message

    if (typeof value === 'string') {
      message = value
    } else if (Array.isArray(value)) {
      message = value.join('；')
    }
  }

  return new HttpError(status, message)
}
