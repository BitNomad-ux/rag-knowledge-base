import { requestClient } from './request'

export interface DocumentItem {
  id: string
  knowledgeBaseId: string
  originalName: string
  fileExtension: string
  mediaType: string | null

  // 后端 BigInt 字段按字符串返回。
  sizeBytes: string

  status: string
  createdAt: string
  updatedAt: string
}

export interface DocumentList {
  items: DocumentItem[]
  total: number
  page: number
  pageSize: number
}

/**
 * 获取指定知识库的文档列表。
 */
export function getDocuments(
  knowledgeBaseId: string,
  page = 1,
  pageSize = 20,
): Promise<DocumentList> {
  return requestClient.get<DocumentList>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents`,
    { params: { page, pageSize } },
  )
}

/**
 * 上传一个文件到指定知识库。
 */
export function uploadDocument(
  knowledgeBaseId: string,
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<DocumentItem> {
  const formData = new FormData()
  formData.append('file', file)

  return requestClient.post<DocumentItem>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents`,
    formData,
    {
      // 上传大文件时给请求更长时间。
      timeout: 120_000,

      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      },
    },
  )
}

/**
 * 获取单个文档的公开信息。
 */
export function getDocument(id: string): Promise<DocumentItem> {
  return requestClient.get<DocumentItem>(`/documents/${encodeURIComponent(id)}`)
}

/**
 * 通过带认证信息的请求获取文件内容。
 */
export function downloadDocument(id: string): Promise<Blob> {
  return requestClient.get<Blob>(`/documents/${encodeURIComponent(id)}/content`, {
    responseType: 'blob',
    timeout: 120_000,
  })
}
