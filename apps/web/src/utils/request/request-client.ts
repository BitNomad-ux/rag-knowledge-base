import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'

/**
 * 通用请求客户端。
 *
 * 这里只封装 Axios 和常用 HTTP 方法，
 * 不写当前项目的 token、跳转、错误提示等业务逻辑。
 */
export class RequestClient {
  readonly instance: AxiosInstance

  constructor(config: AxiosRequestConfig = {}) {
    this.instance = axios.create(config)
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config)
    return response.data
  }
}
