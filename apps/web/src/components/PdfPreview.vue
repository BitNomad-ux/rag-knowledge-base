<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask,
  type PDFDocumentLoadingTask,
} from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

const props = defineProps<{
  data: Uint8Array
}>()

GlobalWorkerOptions.workerSrc = workerUrl

const canvasRef = ref<HTMLCanvasElement | null>(null)
const pageNumber = ref(1)
const pageCount = ref(0)
const loading = ref(true)
const error = ref('')

let pdf: PDFDocumentProxy | null = null
let loadingTask: PDFDocumentLoadingTask | null = null
let renderTask: RenderTask | null = null
let disposed = false

async function renderPage(number: number) {
  if (!pdf || disposed) return

  loading.value = true
  error.value = ''

  try {
    const page = await pdf.getPage(number)

    if (disposed) return

    await nextTick()

    const canvas = canvasRef.value
    const context = canvas?.getContext('2d')

    if (!canvas || !context) {
      throw new Error('无法初始化 PDF 预览')
    }

    const baseViewport = page.getViewport({ scale: 1 })

    // 限制画布尺寸，避免极大页面占用过多浏览器内存。
    const scale = Math.min(1.5, 1600 / baseViewport.width, 2000 / baseViewport.height)

    const viewport = page.getViewport({ scale })

    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)

    renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport,
    })

    await renderTask.promise
    renderTask = null
  } catch (err) {
    if (!disposed) {
      error.value = err instanceof Error ? err.message : 'PDF 渲染失败'
    }
  } finally {
    if (!disposed) {
      loading.value = false
    }
  }
}

async function changePage(nextPage: number) {
  if (loading.value || nextPage < 1 || nextPage > pageCount.value) return

  pageNumber.value = nextPage
  await renderPage(nextPage)
}

onMounted(async () => {
  try {
    // data 已由带 Bearer token 的请求获取。
    loadingTask = getDocument({
      data: props.data,
      enableXfa: false,
      stopAtErrors: true,
    })

    const result = await loadingTask.promise

    if (disposed) {
      return
    }

    pdf = result
    pageCount.value = result.numPages

    await renderPage(1)
  } catch (err) {
    if (!disposed) {
      error.value = err instanceof Error ? err.message : '无法打开 PDF'
      loading.value = false
    }
  }
})

onBeforeUnmount(() => {
  disposed = true

  // 取消正在进行的页面渲染。
  renderTask?.cancel()

  // 加载任务负责释放文档及其相关资源。
  if (loadingTask) {
    void loadingTask.destroy().catch((err: unknown) => {
      console.error('释放 PDF 资源失败', err)
    })
  }
})
</script>

<template>
  <div class="pdf-preview">
    <div class="pdf-toolbar">
      <el-button
        size="small"
        :disabled="loading || pageNumber <= 1"
        @click="changePage(pageNumber - 1)"
      >
        上一页
      </el-button>

      <span>{{ pageNumber }} / {{ pageCount }}</span>

      <el-button
        size="small"
        :disabled="loading || pageNumber >= pageCount"
        @click="changePage(pageNumber + 1)"
      >
        下一页
      </el-button>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="loading">正在加载 PDF……</p>

    <div class="canvas-container">
      <canvas ref="canvasRef" />
    </div>
  </div>
</template>

<style scoped>
.pdf-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-bottom: 12px;
}

.canvas-container {
  overflow: auto;
  max-height: 65vh;
  background: #ecefec;
  text-align: center;
}

canvas {
  max-width: 100%;
  background: #fff;
}

.error {
  color: #c45656;
}
</style>
