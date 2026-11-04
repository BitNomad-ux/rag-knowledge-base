<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { KnowledgeBase } from '@/api/knowledge-bases'

const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'edit'
  initialValue: KnowledgeBase | null
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [value: { name: string; description: string | null }]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const form = reactive({
  name: '',
  description: '',
})

// 每次打开弹窗时，重新初始化表单。
watch(
  () => props.modelValue,
  (opened) => {
    if (!opened) return

    form.name = props.initialValue?.name ?? ''
    form.description = props.initialValue?.description ?? ''
  },
)

function handleSubmit() {
  const name = form.name.trim()

  if (!name || props.loading) return

  emit('submit', {
    name,
    // 清空输入框时，用 null 告诉后端清空描述。
    description: form.description.trim() || null,
  })
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="mode === 'create' ? '新建知识库' : '编辑知识库'"
    width="480px"
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    :show-close="!loading"
  >
    <el-form label-position="top" @submit.prevent="handleSubmit">
      <el-form-item label="知识库名称" required>
        <el-input
          v-model="form.name"
          maxlength="100"
          show-word-limit
          placeholder="例如：前端学习笔记"
          :disabled="loading"
        />
      </el-form-item>

      <el-form-item label="知识库描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          placeholder="简要介绍这个知识库的内容"
          :disabled="loading"
        />
      </el-form-item>

      <p v-if="!form.name.trim()" class="hint">请输入知识库名称</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div class="actions">
        <el-button :disabled="loading" @click="visible = false"> 取消 </el-button>

        <el-button
          type="primary"
          native-type="submit"
          :loading="loading"
          :disabled="!form.name.trim()"
        >
          {{ mode === 'create' ? '创建' : '保存' }}
        </el-button>
      </div>
    </el-form>
  </el-dialog>
</template>

<style scoped>
.hint {
  color: #909399;
  font-size: 13px;
}

.error {
  color: #c45656;
  font-size: 13px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}
</style>
