<script setup lang="ts">
import type { KnowledgeBase } from '@/api/knowledge-bases'
import { ChatDotRound, Collection, Plus } from '@element-plus/icons-vue'

defineProps<{
  items: KnowledgeBase[]
  selectedId: string | null
  loading: boolean
  page: number
  pageSize: number
  total: number
}>()

defineEmits<{
  create: []
  select: [id: string]
  pageChange: [page: number]
}>()
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

      <el-button text :icon="Plus" aria-label="新建知识库" @click="$emit('create')" />
    </div>

    <p v-if="loading" class="sidebar-message">加载中...</p>
    <p v-else-if="items.length === 0" class="sidebar-empty">暂无知识库</p>

    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="book-item"
      :class="{ selected: item.id === selectedId }"
      :title="item.name"
      @click="$emit('select', item.id)"
    >
      <el-icon><Document /></el-icon>
      <span>{{ item.name }}</span>
    </button>

    <div v-if="total > pageSize" class="pagination">
      <el-button
        text
        size="small"
        :disabled="loading || page <= 1"
        @click="$emit('pageChange', page - 1)"
      >
        上一页
      </el-button>
      <span>{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
      <el-button
        text
        size="small"
        :disabled="loading || page * pageSize >= total"
        @click="$emit('pageChange', page + 1)"
      >
        下一页
      </el-button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  flex: 0 0 215px;
  padding: 16px 12px;
  border-right: 1px solid #ebeeeb;
  background: #f8f9f7;
}

.nav-item,
.book-item {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 14px;
}

.nav-item.active,
.book-item.selected {
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

.sidebar-message {
  margin: 16px 18px;
  color: #a1a8af;
  font-size: 13px;
}

.book-item {
  width: 100%;
  border: 0;
  background: transparent;
  color: #4f5964;
  text-align: left;
  cursor: pointer;
}

.book-item:hover {
  background: #edf1ed;
}

.book-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2px;
  margin-top: 12px;
  color: #7c8590;
  font-size: 12px;
}

@media (max-width: 800px) {
  .sidebar {
    flex-basis: 150px;
  }

  .nav-item,
  .book-item {
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
