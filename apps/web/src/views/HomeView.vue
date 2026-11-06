<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Edit, Search, UploadFilled } from '@element-plus/icons-vue'
import {
  createKnowledgeBase,
  getKnowledgeBase,
  getKnowledgeBases,
  updateKnowledgeBase,
  type KnowledgeBase,
} from '@/api/knowledge-bases'
import { HttpError } from '@/utils/request/http-error'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSideBar.vue'
import UploadPanel from '@/components/layout/UploadPanel.vue'
import KnowledgeBaseDialog from '@/components/KnowledgeBaseDialog.vue'
import { downloadDocument, getDocuments, type DocumentItem } from '@/api/documents'
import DocumentDetailDialog from '@/components/DocumentDetailDialog.vue'

const router = useRouter()

// 页面级 UI 状态：上传面板和左侧知识库分页。
const showUpload = ref(true)
const activeTab = ref('all')

// 知识库列表与当前选中的知识库详情。
const items = ref<KnowledgeBase[]>([])
const selected = ref<KnowledgeBase | null>(null)
const listLoading = ref(false)
const listError = ref('')
const detailLoading = ref(false)

const documents = ref<DocumentItem[]>([])
const documentsLoading = ref(false)
const documentsError = ref('')

const documentsPage = ref(1)
const documentsPageSize = 20
const documentsTotal = ref(0)

// 用序号忽略已经过期的列表响应。
let documentsRequestId = 0

// 列表分页信息由后端返回的 page/total 驱动。
const page = ref(1)
const pageSize = 20
const total = ref(0)

// 知识库新建/编辑弹窗状态。
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const dialogLoading = ref(false)
const dialogError = ref('')

// 文件详情弹窗
const documentDetailVisible = ref(false)
const currentDocumentId = ref<string | null>(null)

function openDocumentDetail(document: DocumentItem) {
  currentDocumentId.value = document.id
  documentDetailVisible.value = true
}

// 请求序号用于忽略过期的详情响应，避免快速切换时旧响应覆盖新知识库。
let detailRequestId = 0

// 统一处理请求错误：登录失效时跳转登录页，其他错误显示提示。
async function handleError(error: unknown) {
  if (error instanceof HttpError && error.status === 401) {
    await router.replace('/login')
    return
  }

  ElMessage.error(error instanceof Error ? error.message : '请求失败')
}

async function loadDocuments(nextPage = 1) {
  const knowledgeBaseId = selected.value?.id
  if (!knowledgeBaseId) return

  const requestId = ++documentsRequestId
  documentsLoading.value = true
  documentsError.value = ''

  try {
    const result = await getDocuments(knowledgeBaseId, nextPage, documentsPageSize)

    if (requestId !== documentsRequestId) return

    documents.value = result.items
    documentsTotal.value = result.total
    documentsPage.value = result.page
  } catch (error) {
    if (requestId !== documentsRequestId) return

    documentsError.value = error instanceof Error ? error.message : '文档加载失败'

    await handleError(error)
  } finally {
    if (requestId === documentsRequestId) {
      documentsLoading.value = false
    }
  }
}

function handleUploaded(knowledgeBaseId: string) {
  ElMessage.success('文档上传成功')

  // 用户可能在上传期间切换知识库，只刷新当前对应的列表。
  if (selected.value?.id === knowledgeBaseId) {
    void loadDocuments(1)
  }
}

function formatSize(value: string) {
  const bytes = Number(value)

  if (!Number.isFinite(bytes)) return value
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// 当前知识库变化时，清空旧列表并加载新的列表。
watch(
  () => selected.value?.id,
  (id) => {
    documentsRequestId++
    documents.value = []
    documentsTotal.value = 0
    documentsPage.value = 1
    documentsError.value = ''
    documentsLoading.value = false

    if (id) {
      void loadDocuments()
    }
  },
)

async function loadDetail(id: string) {
  const requestId = ++detailRequestId
  detailLoading.value = true

  try {
    const result = await getKnowledgeBase(id)

    if (requestId === detailRequestId) {
      selected.value = result
    }
  } catch (error) {
    if (requestId === detailRequestId) {
      await handleError(error)
    }
  } finally {
    if (requestId === detailRequestId) {
      detailLoading.value = false
    }
  }
}

// 加载指定页的知识库，并默认选中首项或调用方指定的知识库。
async function loadList(nextPage = 1, preferredId?: string) {
  listLoading.value = true
  listError.value = ''

  try {
    const result = await getKnowledgeBases(nextPage, pageSize)

    items.value = result.items
    total.value = result.total
    page.value = result.page

    // 创建知识库后优先选中新建项；普通翻页时则选中当前页第一项。
    const preferred = result.items.find((item) => item.id === preferredId)
    const first = preferred ?? result.items[0]

    if (first) {
      await loadDetail(first.id)
    } else {
      detailRequestId++
      selected.value = null
      detailLoading.value = false
    }
  } catch (error) {
    listError.value = error instanceof Error ? error.message : '加载失败'
    await handleError(error)
  } finally {
    listLoading.value = false
  }
}

// 创建知识库
function openCreate() {
  dialogMode.value = 'create'
  dialogError.value = ''
  dialogVisible.value = true
}

// 打开编辑弹窗前必须存在当前选中的知识库。
function openEdit() {
  if (!selected.value) return

  dialogMode.value = 'edit'
  dialogError.value = ''
  dialogVisible.value = true
}

// 处理新建和编辑共用的弹窗提交事件。
async function submitDialog(input: { name: string; description: string | null }) {
  if (dialogLoading.value) return

  dialogLoading.value = true
  dialogError.value = ''

  try {
    if (dialogMode.value === 'create') {
      const created = await createKnowledgeBase(input)

      dialogVisible.value = false
      ElMessage.success('知识库创建成功')

      // 新建后回到第一页，并尝试选中新创建的知识库。
      await loadList(1, created.id)
    } else if (selected.value) {
      const updated = await updateKnowledgeBase(selected.value.id, input)

      // 编辑成功后同步详情和左侧列表，避免重新请求整页数据。
      selected.value = updated
      items.value = items.value.map((item) => (item.id === updated.id ? updated : item))

      dialogVisible.value = false
      ElMessage.success('知识库已保存')
    }
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      dialogVisible.value = false
      await router.replace('/login')
    } else {
      dialogError.value = error instanceof Error ? error.message : '保存失败'
    }
  } finally {
    dialogLoading.value = false
  }
}

const downloadingId = ref<string | null>(null)

async function handleDownload(document: DocumentItem) {
  if (downloadingId.value) return

  downloadingId.value = document.id

  try {
    const blob = await downloadDocument(document.id)
    const url = URL.createObjectURL(blob)

    const link = window.document.createElement('a')
    link.href = url
    link.download = document.originalName

    window.document.body.appendChild(link)
    link.click()
    link.remove()

    // 留出浏览器读取 Blob URL 的时间，再释放内存。
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    await handleError(error)
  } finally {
    downloadingId.value = null
  }
}

// 首次进入页面时加载第一页知识库。
onMounted(() => {
  void loadList()
})
</script>

<template>
  <div class="app-shell">
    <AppHeader />

    <div class="workspace">
      <!-- 左侧显示知识库分页列表，并向页面抛出新建、选择和翻页事件。 -->
      <AppSidebar
        :items="items"
        :selected-id="selected?.id ?? null"
        :loading="listLoading"
        :page="page"
        :page-size="pageSize"
        :total="total"
        @create="openCreate"
        @select="loadDetail"
        @page-change="loadList"
      />

      <!-- 右侧显示当前知识库详情；未选中时显示空状态或加载失败提示。 -->
      <main v-loading="detailLoading" class="content">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>知识库</el-breadcrumb-item>
          <el-breadcrumb-item v-if="selected">
            {{ selected.name }}
          </el-breadcrumb-item>
        </el-breadcrumb>

        <div class="content-heading">
          <div>
            <div class="title-row">
              <h1>{{ selected?.name ?? '我的知识库' }}</h1>

              <el-button
                v-if="selected"
                text
                :icon="Edit"
                aria-label="编辑知识库"
                @click="openEdit"
              />
            </div>

            <p v-if="selected">
              {{ selected.description || '暂无描述' }}
            </p>
            <p v-else>创建知识库后，可以在这里管理资料。</p>
          </div>

          <!-- TODO: 接入实际文档上传流程；当前按钮只打开面板 -->
          <el-button
            type="primary"
            :icon="UploadFilled"
            :disabled="!selected"
            @click="showUpload = true"
          >
            上传文档
          </el-button>
        </div>

        <template v-if="selected">
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

          <div v-if="documentsError" class="empty-hint">
            <p>文档加载失败：{{ documentsError }}</p>
            <el-button @click="loadDocuments(documentsPage)">重试</el-button>
          </div>

          <template v-else>
            <el-table v-loading="documentsLoading" :data="documents" empty-text="暂无文档">
              <el-table-column prop="originalName" label="名称" min-width="220">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openDocumentDetail(row)">
                    {{ row.originalName }}
                  </el-button>
                </template>
              </el-table-column>

              <el-table-column label="类型" width="80">
                <template #default="{ row }">
                  {{ row.fileExtension.toUpperCase() }}
                </template>
              </el-table-column>

              <el-table-column label="大小" width="100">
                <template #default="{ row }">
                  {{ formatSize(row.sizeBytes) }}
                </template>
              </el-table-column>

              <el-table-column label="上传时间" min-width="160">
                <template #default="{ row }">
                  {{ new Date(row.createdAt).toLocaleString() }}
                </template>
              </el-table-column>

              <el-table-column label="状态" width="100">
                <template #default>
                  <el-tag type="success">已上传</el-tag>
                </template>
              </el-table-column>

              <el-table-column label="操作" width="100">
                <template #default="{ row }">
                  <el-button
                    link
                    type="primary"
                    :loading="downloadingId === row.id"
                    :disabled="downloadingId !== null && downloadingId !== row.id"
                    @click="handleDownload(row)"
                  >
                    下载
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <el-pagination
              v-if="documentsTotal > documentsPageSize"
              class="documents-pagination"
              layout="prev, pager, next"
              :current-page="documentsPage"
              :page-size="documentsPageSize"
              :total="documentsTotal"
              @current-change="loadDocuments"
            />
          </template>
        </template>

        <div v-else-if="listError" class="empty-hint">
          <p>知识库加载失败：{{ listError }}</p>
          <el-button @click="loadList()">重试</el-button>
        </div>

        <el-empty v-else-if="!listLoading" description="还没有可显示的知识库">
          <el-button type="primary" @click="openCreate"> 新建知识库 </el-button>
        </el-empty>
      </main>

      <UploadPanel
        v-if="showUpload && selected"
        :key="selected.id"
        :knowledge-base-id="selected.id"
        @close="showUpload = false"
        @uploaded="handleUploaded"
      />
    </div>

    <!-- 新建和编辑共用同一个弹窗，通过 dialogMode 区分操作类型。 -->
    <KnowledgeBaseDialog
      v-model="dialogVisible"
      :mode="dialogMode"
      :initial-value="dialogMode === 'edit' ? selected : null"
      :loading="dialogLoading"
      :error="dialogError"
      @submit="submitDialog"
    />
    <!-- 文件详情弹窗 -->
    <DocumentDetailDialog
      v-model="documentDetailVisible"
      :document-id="currentDocumentId"
      @download="handleDownload"
    />
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
.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.documents-pagination {
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
