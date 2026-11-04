<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    await auth.login(email.value, password.value)
    await router.replace('/')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main>
    <h1>登录</h1>

    <form @submit.prevent="handleLogin">
      <p>
        <label>
          邮箱
          <input v-model="email" type="email" autocomplete="username" required />
        </label>
      </p>

      <p>
        <label>
          密码
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>
      </p>

      <p v-if="error" role="alert">{{ error }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </form>
    <p>还没有账号？<router-link to="/register">注册账号</router-link></p>
  </main>
</template>
