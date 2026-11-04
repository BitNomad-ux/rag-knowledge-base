import { requestClient } from './request'

export interface KnowledgeBase {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface KnowledgeBaseList {
  items: KnowledgeBase[]
  total: number
  page: number
  pageSize: number
}

export interface CreateKnowledgeBaseInput {
  name: string
  description?: string | null
}

export interface UpdateKnowledgeBaseInput {
  name?: string
  description?: string | null
}

// 分页获取当前用户的知识库
export function getKnowledgeBases(page = 1, pageSize = 20): Promise<KnowledgeBaseList> {
  return requestClient.get<KnowledgeBaseList>('/knowledge-bases', {
    params: { page, pageSize },
  })
}

export function getKnowledgeBase(id: string): Promise<KnowledgeBase> {
  return requestClient.get<KnowledgeBase>(`/knowledge-bases/${encodeURIComponent(id)}`)
}

export function createKnowledgeBase(input: CreateKnowledgeBaseInput): Promise<KnowledgeBase> {
  return requestClient.post<KnowledgeBase>('/knowledge-bases', input)
}

export function updateKnowledgeBase(
  id: string,
  input: UpdateKnowledgeBaseInput,
): Promise<KnowledgeBase> {
  return requestClient.patch<KnowledgeBase>(`/knowledge-bases/${encodeURIComponent(id)}`, input)
}
