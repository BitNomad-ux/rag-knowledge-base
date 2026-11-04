<script setup lang="ts">
import { Close, UploadFilled } from '@element-plus/icons-vue'

// 点击关闭时通知父组件；父组件负责隐藏面板。
defineEmits<{
  close: []
}>()
</script>

<template>
  <aside class="upload-panel">
    <div class="upload-heading">
      <h2>上传文档</h2>

      <el-button text :icon="Close" aria-label="关闭上传面板" @click="$emit('close')" />
    </div>

    <div class="upload-tab">本地上传</div>

    <div class="upload-placeholder">
      <el-icon :size="38"><UploadFilled /></el-icon>
      <strong>拖拽文件到此处上传</strong>
      <span>或点击选择文件</span>
      <small>支持 PDF、MD、DOC、DOCX 格式</small>

      <!-- TODO: 接入文件选择、拖拽和上传接口 -->
      <el-button disabled>选择文件</el-button>
    </div>

    <div class="upload-footer">
      <el-button type="primary" disabled>开始上传</el-button>
      <small>文档上传功能将在接口完成后开放</small>
    </div>
  </aside>
</template>

<style scoped>
.upload-panel {
  display: flex;
  width: 350px;
  flex: 0 0 350px;
  flex-direction: column;
  padding: 24px;
  border-left: 1px solid #e9ece9;
  background: #fff;
}

.upload-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.upload-heading h2 {
  margin: 0;
  font-size: 20px;
}

.upload-tab {
  margin-top: 28px;
  padding-bottom: 12px;
  border-bottom: 2px solid #345b46;
  color: #345b46;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
}

.upload-placeholder {
  display: flex;
  min-height: 290px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
  padding: 20px;
  border: 1px dashed #ccd3ce;
  border-radius: 8px;
  color: #345b46;
  text-align: center;
}

.upload-placeholder strong {
  color: #283039;
}

.upload-placeholder span,
.upload-placeholder small,
.upload-footer small {
  color: #8a939e;
  font-size: 12px;
}

.upload-footer {
  display: grid;
  gap: 12px;
  margin-top: auto;
  padding-top: 24px;
  text-align: center;
}

@media (max-width: 1100px) {
  .upload-panel {
    width: 290px;
    flex-basis: 290px;
  }
}
</style>
