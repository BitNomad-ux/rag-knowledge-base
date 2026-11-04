<script setup lang="ts">
import { ChatDotRound, Collection, Plus } from '@element-plus/icons-vue'
</script>

<template>
  <aside class="sidebar">
    <div class="nav-item active">
      <el-icon><Collection /></el-icon>
      <span>知识库</span>
    </div>

    <!-- TODO: 实现 AI 对话页面并接入导航 -->
    <div class="nav-item muted">
      <el-icon><ChatDotRound /></el-icon>
      <span>AI 对话</span>
      <small>后续开放</small>
    </div>

    <div class="sidebar-heading">
      <span>我的知识库</span>

      <!-- TODO: 接入知识库创建接口并启用按钮 -->
      <el-button text :icon="Plus" disabled aria-label="新建知识库，功能尚未开放" />
    </div>

    <!-- TODO: 接入知识库列表并根据实际数据展示空状态 -->
    <p class="sidebar-empty">暂无知识库</p>
  </aside>
</template>

<style scoped>
.sidebar {
  flex: 0 0 215px;
  padding: 16px 12px;
  border-right: 1px solid #ebeeeb;
  background: #f8f9f7;
}

.nav-item {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 14px;
}

.nav-item.active {
  background: #e7ece8;
  color: #284f3b;
  font-weight: 600;
}

.nav-item.muted {
  color: #626b77;
}

.nav-item small {
  margin-left: auto;
  color: #a0a6ae;
  font-size: 11px;
}

.sidebar-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 30px 12px 8px;
  color: #7c8590;
  font-size: 13px;
}

.sidebar-empty {
  margin: 16px 18px;
  color: #a1a8af;
  font-size: 13px;
}

@media (max-width: 800px) {
  .sidebar {
    flex-basis: 150px;
  }

  .nav-item {
    padding: 0 8px;
  }

  .nav-item small {
    display: none;
  }
}

@media (max-width: 560px) {
  .sidebar {
    flex-basis: 115px;
    padding: 12px 6px;
  }
}
</style>
