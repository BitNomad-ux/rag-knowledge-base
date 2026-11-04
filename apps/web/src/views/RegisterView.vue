<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { registerApi } from '@/api/auth'

const router = useRouter()
const form = reactive({ email: '', displayName: '', password: '', confirmPassword: '' })
const loading = ref(false)
const error = ref('')

async function handleRegister() {
  if (loading.value) return
  error.value = ''
  const email = form.email.trim()
  const displayName = form.displayName.trim()

  if (!email || !displayName || !form.password) {
    error.value = '请填写邮箱、显示名称和密码'
    return
  }
  if (form.password.length < 8 || form.password.length > 128) {
    error.value = '密码长度需要在 8 到 128 个字符之间'
    return
  }
  if (form.password !== form.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  try {
    await registerApi({ email, displayName, password: form.password })
    ElMessage.success('注册成功，请登录')
    await router.replace('/login')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="register-page">
    <el-card class="register-card" shadow="never">
      <h1>创建账号</h1>
      <p class="subtitle">注册知屿，开启你的知识空间</p>
      <el-form label-position="top" @submit.prevent="handleRegister">
        <el-form-item label="邮箱" required>
          <el-input
            v-model="form.email"
            type="email"
            maxlength="254"
            autocomplete="email"
            placeholder="请输入邮箱"
            :disabled="loading"
          />
        </el-form-item>
        <el-form-item label="显示名称" required>
          <el-input
            v-model="form.displayName"
            maxlength="50"
            autocomplete="nickname"
            placeholder="请输入显示名称"
            :disabled="loading"
          />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input
            v-model="form.password"
            type="password"
            maxlength="128"
            autocomplete="new-password"
            placeholder="请输入 8 至 128 个字符"
            show-password
            :disabled="loading"
          />
        </el-form-item>
        <el-form-item label="确认密码" required>
          <el-input
            v-model="form.confirmPassword"
            type="password"
            maxlength="128"
            autocomplete="new-password"
            placeholder="请再次输入密码"
            show-password
            :disabled="loading"
          />
        </el-form-item>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <el-button class="submit" type="primary" native-type="submit" :loading="loading"
          >注册</el-button
        >
      </el-form>
      <p class="login-link">已有账号？<router-link to="/login">去登录</router-link></p>
    </el-card>
  </main>
</template>

<style scoped>
.register-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.register-card {
  width: min(100%, 420px);
  border-radius: 12px;
}
h1 {
  margin: 0 0 8px;
  font-size: 24px;
}
.subtitle {
  margin: 0 0 24px;
  color: #7b8491;
  font-size: 14px;
}
.error {
  color: #c45656;
  font-size: 13px;
}
.submit {
  width: 100%;
  margin-top: 8px;
}
.login-link {
  margin: 20px 0 0;
  text-align: center;
  font-size: 14px;
}
</style>
