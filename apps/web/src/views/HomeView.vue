<script setup lang="ts">
import { ref } from 'vue'
import { Document, Search, UploadFilled } from '@element-plus/icons-vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSideBar.vue'
import UploadPanel from '@/components/layout/UploadPanel.vue'

// 控制右侧面板开关，不代表已经接入上传接口。
const showUpload = ref(true)
const activeTab = ref('all')
</script>

<template>
  <div class="app-shell">
    <AppHeader />

    <div class="workspace">
      <AppSidebar />

      <main class="content">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>知识库</el-breadcrumb-item>
        </el-breadcrumb>

        <div class="content-heading">
          <div>
            <h1>我的知识库</h1>
            <p>整理资料，让知识随时可用。</p>
          </div>

          <!-- TODO: 接入实际文档上传流程；当前按钮只打开面板 -->
          <el-button type="primary" :icon="UploadFilled" @click="showUpload = true">
            上传文档
          </el-button>
        </div>

        <div class="toolbar">
          <!-- TODO: 接入文档类型筛选 -->
          <el-tabs v-model="activeTab">
            <el-tab-pane label="全部文档" name="all" />
            <el-tab-pane label="PDF" name="pdf" disabled />
            <el-tab-pane label="MD" name="md" disabled />
            <el-tab-pane label="DOCX" name="docx" disabled />
          </el-tabs>

          <!-- TODO: 接入当前知识库的文档搜索 -->
          <el-input
            class="document-search"
            :prefix-icon="Search"
            placeholder="搜索文档..."
            disabled
          />
        </div>

        <!-- TODO: 接入文档列表接口并替换空数组 -->
        <el-table :data="[]" empty-text="暂无文档">
          <el-table-column label="名称" min-width="220" />
          <el-table-column label="类型" width="80" />
          <el-table-column label="大小" width="90" />
          <el-table-column label="上传时间" min-width="140" />
          <el-table-column label="状态" width="90" />
        </el-table>

        <div class="empty-hint">
          <el-icon :size="26"><Document /></el-icon>
          <p>知识库功能接入后，可在这里查看和管理文档。</p>
        </div>
      </main>

      <UploadPanel v-if="showUpload" @close="showUpload = false" />
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #f6f7f5;
}

.workspace {
  display: flex;
  min-height: calc(100vh - 76px);
}

.content {
  min-width: 0;
  flex: 1;
  padding: 30px 32px;
  background: #fff;
}

.content-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-top: 28px;
}

.content-heading h1 {
  margin: 0;
  font-size: 27px;
}

.content-heading p {
  margin: 12px 0 0;
  color: #7b8491;
  font-size: 14px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 30px;
}

.toolbar :deep(.el-tabs) {
  min-width: 0;
  flex: 1;
}

.toolbar :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.document-search {
  width: 230px;
}

.empty-hint {
  padding-top: 28px;
  color: #a0a8af;
  text-align: center;
  font-size: 13px;
}

@media (max-width: 800px) {
  .workspace {
    flex-wrap: wrap;
  }

  .content {
    padding: 24px 18px;
  }

  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .document-search {
    width: 100%;
  }

  /* 小屏时上传面板移动到主内容下方，而不是消失 */
  .workspace :deep(.upload-panel) {
    width: 100%;
    min-height: 420px;
    flex-basis: 100%;
    border-top: 1px solid #e9ece9;
  }
}
</style>
