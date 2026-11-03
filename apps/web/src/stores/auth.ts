import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loginApi, logoutApi, refreshApi, type AuthResponse, type User } from '@/api/auth'
import { configureAuth } from '@/api/http'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<User | null>(null)
  const initialized = ref(false)

  // 合并同一个页面内的并发刷新请求。
  let refreshPromise: Promise<boolean> | null = null
  let initializePromise: Promise<void> | null = null

  function applyAuth(data: AuthResponse) {
    accessToken.value = data.accessToken
    user.value = data.user
  }

  function clearAuth() {
    accessToken.value = null
    user.value = null
  }

  async function login(email: string, password: string) {
    const data = await loginApi(email, password)
    applyAuth(data)
  }

  function refresh(): Promise<boolean> {
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      const data = await refreshApi()

      if (!data) {
        clearAuth()
        return false
      }

      applyAuth(data)
      return true
    })().finally(() => {
      refreshPromise = null
    })

    return refreshPromise
  }

  function initialize(): Promise<void> {
    if (initialized.value) return Promise.resolve()
    if (initializePromise) return initializePromise

    initializePromise = (async () => {
      await refresh()
      initialized.value = true
    })().finally(() => {
      initializePromise = null
    })

    return initializePromise
  }

  async function logout() {
    // 等待当前页面正在进行的令牌轮换，再提交退出请求。
    if (refreshPromise) {
      await refreshPromise
    }

    await logoutApi()
    clearAuth()
  }

  configureAuth({
    getAccessToken: () => accessToken.value,
    refresh,
    clearAuth,
  })

  return {
    accessToken,
    user,
    initialized,
    login,
    refresh,
    initialize,
    logout,
  }
})
