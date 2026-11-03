<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentUser } from '@/api/users'
import { HttpError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const result = ref('')
const error = ref('')

async function loadMe() {
  error.value = ''
  result.value = ''

  try {
    const user = await getCurrentUser()
    result.value = JSON.stringify(user, null, 2)
  } catch (err) {
    if (err instanceof HttpError && err.status === 401) {
      await router.replace('/login')
      return
    }

    error.value = err instanceof Error ? err.message : '请求失败'
  }
}

async function handleLogout() {
  error.value = ''

  try {
    await auth.logout()
    await router.replace('/login')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '退出失败'
  }
}
</script>

<template>
  <main>
    <h1>知识库</h1>
    <p>你好，{{ auth.user?.displayName }}</p>

    <button type="button" @click="loadMe">获取当前用户</button>
    <button type="button" @click="handleLogout">退出登录</button>

    <p v-if="error" role="alert">{{ error }}</p>
    <pre v-if="result">{{ result }}</pre>
  </main>
</template>
