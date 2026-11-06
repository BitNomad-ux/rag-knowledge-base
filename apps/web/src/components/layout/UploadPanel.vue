<script setup lang="ts">
import { ref } from 'vue'
import { Close, UploadFilled } from '@element-plus/icons-vue'
import { uploadDocument } from '@/api/documents'

const props = defineProps<{
  knowledgeBaseId: string
}>()

const emit = defineEmits<{
  close: []
  uploaded: [knowledgeBaseId: string]
}>()

const MAX_SIZE = 50 * 1024 * 1024
const allowedExtensions = new Set(['pdf', 'md', 'doc', 'docx'])

const inputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const progress = ref(0)
const error = ref('')

function chooseFile() {
  inputRef.value?.click()
}

function setFile(file: File | undefined) {
  error.value = ''
  progress.value = 0
  selectedFile.value = null

  if (!file) return

  const extension = file.name.split('.').pop()?.toLowerCase()

  if (!extension || !allowedExtensions.has(extension)) {
    error.value = '请选择 PDF、MD、DOC 或 DOCX 文件'
    return
  }

  if (file.size === 0) {
    error.value = '不能上传空文件'
    return
  }

  if (file.size > MAX_SIZE) {
    error.value = '单个文件不能超过 50 MiB'
    return
  }

  selectedFile.value = file
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  setFile(input.files?.[0])

  // 清空 input，允许再次选择同一个文件。
  input.value = ''
}

function handleDrop(event: DragEvent) {
  if (uploading.value) return

  const files = event.dataTransfer?.files

  if (!files || files.length === 0) return

  if (files.length !== 1) {
    error.value = '一次只能上传一个文件'
    return
  }

  setFile(files[0])
}

async function handleUpload() {
  const file = selectedFile.value
  if (!file || uploading.value) return

  // 记录上传开始时的知识库，避免切换知识库后刷新错误的列表。
  const targetId = props.knowledgeBaseId

  uploading.value = true
  progress.value = 0
  error.value = ''

  try {
    await uploadDocument(targetId, file, (value) => {
      progress.value = value
    })

    selectedFile.value = null
    emit('uploaded', targetId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '上传失败'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <aside class="upload-panel">
    <div class="upload-heading">
      <h2>上传文档</h2>

      <el-button
        text
        :icon="Close"
        aria-label="关闭上传面板"
        :disabled="uploading"
        @click="$emit('close')"
      />
    </div>

    <div class="upload-tab">本地上传</div>

    <div class="upload-placeholder" @dragover.prevent @drop.prevent="handleDrop">
      <el-icon :size="38"><UploadFilled /></el-icon>
      <strong>拖拽文件到此处上传</strong>
      <span>或点击选择文件</span>
      <small>支持 PDF、MD、DOC、DOCX，单个文件不超过 50 MiB</small>

      <input
        ref="inputRef"
        class="file-input"
        type="file"
        accept=".pdf,.md,.doc,.docx"
        :disabled="uploading"
        @change="handleFileChange"
      />

      <el-button :disabled="uploading" @click="chooseFile"> 选择文件 </el-button>
    </div>

    <div v-if="selectedFile" class="selected-file">
      <span>{{ selectedFile.name }}</span>

      <el-button text :disabled="uploading" @click="selectedFile = null"> 移除 </el-button>
    </div>

    <el-progress v-if="uploading" :percentage="progress" class="progress" />

    <p v-if="uploading && progress === 100" class="hint">文件已发送，正在等待服务器处理……</p>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="upload-footer">
      <el-button
        type="primary"
        :loading="uploading"
        :disabled="!selectedFile"
        @click="handleUpload"
      >
        开始上传
      </el-button>

      <small>每次上传一个文件</small>
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
.upload-footer small,
.hint {
  color: #8a939e;
  font-size: 12px;
}

.file-input {
  display: none;
}

.selected-file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 16px;
  font-size: 13px;
}

.selected-file span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress {
  margin-top: 16px;
}

.error {
  color: #c45656;
  font-size: 13px;
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
