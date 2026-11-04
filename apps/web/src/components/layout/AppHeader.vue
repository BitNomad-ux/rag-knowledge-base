<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowDown, Reading, Search } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

// 点击用户菜单后执行退出；失败时保留当前页面并提示。
async function handleCommand(command: string) {
  if (command !== 'logout') return

  try {
    await auth.logout()
    await router.replace('/login')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '退出失败')
  }
}
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <el-icon class="brand-icon" :size="30"><Reading /></el-icon>
      <strong>知屿</strong>
      <span class="slogan">让知识，成为更大的可能</span>
    </div>

    <!-- TODO: 接入全局文件搜索接口并启用搜索框 -->
    <el-input
      class="global-search"
      :prefix-icon="Search"
      placeholder="搜索知识库中的文件"
      disabled
    />

    <el-dropdown trigger="click" @command="handleCommand">
      <button class="account" type="button" aria-label="打开用户菜单">
        <el-avatar :size="32">
          {{ auth.user?.displayName?.slice(0, 1) || '用' }}
        </el-avatar>
        <span>{{ auth.user?.displayName }}</span>
        <el-icon><ArrowDown /></el-icon>
      </button>

      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="logout">退出登录</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  height: 76px;
  align-items: center;
  gap: 24px;
  padding: 0 28px;
  border-bottom: 1px solid #e9ece9;
  background: #fff;
}

.brand {
  display: flex;
  min-width: 300px;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.brand-icon {
  color: #345b46;
}

.brand strong {
  font-size: 22px;
}

.slogan {
  margin-left: 12px;
  color: #858c96;
  font-size: 13px;
}

.global-search {
  max-width: 430px;
  margin: 0 auto;
}

.account {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #313740;
  cursor: pointer;
}

@media (max-width: 900px) {
  .brand {
    min-width: auto;
  }

  .slogan {
    display: none;
  }
}

@media (max-width: 600px) {
  .topbar {
    padding: 0 16px;
  }

  .global-search {
    display: none;
  }

  .account {
    margin-left: auto;
  }
}
</style>
