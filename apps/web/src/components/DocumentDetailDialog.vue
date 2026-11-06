<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { downloadDocument, getDocument, type DocumentItem } from '@/api/documents'
import PdfPreview from '@/components/PdfPreview.vue'

const props = defineProps<{
  modelValue: boolean
  documentId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  download: [document: DocumentItem]
}>()

const document = ref<DocumentItem | null>(null)
const loading = ref(false)
const error = ref('')

const previewLoading = ref(false)
const previewError = ref('')
const markdownText = ref('')
const pdfData = ref<Uint8Array | null>(null)

let requestId = 0

// Markdown 不解释原始 HTML。
const markdown = new MarkdownIt({
  html: false,
  linkify: false,
})

const markdownHtml = computed(() => {
  const html = markdown.render(markdownText.value)

  // 禁止图片和链接，避免加载外部资源或跳转到不可信地址。
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['img', 'a'],
  })
})

function close() {
  emit('update:modelValue', false)
}

async function loadDetail(id: string) {
  const currentRequest = ++requestId

  document.value = null
  markdownText.value = ''
  pdfData.value = null
  error.value = ''
  previewError.value = ''
  loading.value = true
  previewLoading.value = false

  try {
    const result = await getDocument(id)

    if (currentRequest !== requestId) return

    document.value = result

    if (result.fileExtension === 'pdf' || result.fileExtension === 'md') {
      await loadPreview(result, currentRequest)
    }
  } catch (err) {
    if (currentRequest === requestId) {
      error.value = err instanceof Error ? err.message : '获取文档详情失败'
    }
  } finally {
    if (currentRequest === requestId) {
      loading.value = false
    }
  }
}

async function loadPreview(item: DocumentItem, currentRequest: number) {
  // 限制浏览器预览内存消耗；超出时仍可下载原文件。
  const previewLimit = item.fileExtension === 'md' ? 2 * 1024 * 1024 : 25 * 1024 * 1024

  if (Number(item.sizeBytes) > previewLimit) {
    previewError.value = '文件较大，暂不支持在线预览，请下载原文件'
    return
  }

  previewLoading.value = true
  previewError.value = ''

  try {
    const blob = await downloadDocument(item.id)

    if (currentRequest !== requestId) return

    if (item.fileExtension === 'md') {
      const text = await blob.text()

      if (currentRequest === requestId) {
        markdownText.value = text
      }
    } else {
      const buffer = await blob.arrayBuffer()

      if (currentRequest === requestId) {
        pdfData.value = new Uint8Array(buffer)
      }
    }
  } catch (err) {
    if (currentRequest === requestId) {
      previewError.value = err instanceof Error ? err.message : '预览加载失败'
    }
  } finally {
    if (currentRequest === requestId) {
      previewLoading.value = false
    }
  }
}

function formatSize(value: string): string {
  const bytes = Number(value)

  if (!Number.isFinite(bytes)) return value
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}

watch(
  () => [props.modelValue, props.documentId] as const,
  ([visible, id]) => {
    if (visible && id) {
      void loadDetail(id)
    } else {
      // 关闭或切换时，使旧请求失效并释放当前预览数据。
      requestId++
      document.value = null
      markdownText.value = ''
      pdfData.value = null
      error.value = ''
      previewError.value = ''
      loading.value = false
      previewLoading.value = false
    }
  },
)
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="文档详情"
    width="min(900px, 92vw)"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading" class="detail-content">
      <div v-if="error" class="error" role="alert">
        <p>{{ error }}</p>

        <el-button v-if="documentId" @click="loadDetail(documentId)"> 重试 </el-button>
      </div>

      <template v-else-if="document">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="文件名" :span="2">
            {{ document.originalName }}
          </el-descriptions-item>

          <el-descriptions-item label="类型">
            {{ document.fileExtension.toUpperCase() }}
          </el-descriptions-item>

          <el-descriptions-item label="大小">
            {{ formatSize(document.sizeBytes) }}
          </el-descriptions-item>

          <el-descriptions-item label="状态">
            <el-tag type="success">已上传</el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="上传时间">
            {{ formatDate(document.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <section class="preview-section">
          <h3>文档预览</h3>

          <p v-if="previewLoading">正在加载预览……</p>
          <p v-else-if="previewError" class="error" role="alert">
            {{ previewError }}
          </p>

          <div
            v-else-if="document.fileExtension === 'md'"
            class="markdown-preview"
            v-html="markdownHtml"
          />

          <PdfPreview v-else-if="document.fileExtension === 'pdf' && pdfData" :data="pdfData" />

          <el-empty v-else description="当前格式暂不支持在线预览，请下载原文件" />
        </section>
      </template>
    </div>

    <template #footer>
      <el-button @click="close">关闭</el-button>

      <el-button
        type="primary"
        :disabled="!document"
        @click="document && emit('download', document)"
      >
        下载原文件
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.detail-content {
  min-height: 100px;
}

.preview-section {
  margin-top: 24px;
}

.preview-section h3 {
  margin: 0 0 16px;
}

.markdown-preview {
  overflow: auto;
  max-height: 60vh;
  padding: 16px;
  border: 1px solid #e8ece8;
  border-radius: 6px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.markdown-preview :deep(pre) {
  overflow: auto;
  padding: 12px;
  background: #f5f7f5;
}

.markdown-preview :deep(table) {
  border-collapse: collapse;
}

.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  padding: 6px 10px;
  border: 1px solid #dfe5df;
}

.error {
  color: #c45656;
}
</style>
