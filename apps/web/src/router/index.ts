import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  try {
    await auth.initialize()
  } catch {
    // 恢复登录时发生网络或服务器错误。
    // 先允许用户进入登录页，后续可加入专门的错误页面。
    if (to.name !== 'login') return { name: 'login' }
    return true
  }

  if (to.meta.requiresAuth && !auth.accessToken) {
    return { name: 'login' }
  }

  if (to.name === 'login' && auth.accessToken) {
    return { name: 'home' }
  }

  return true
})

export default router
