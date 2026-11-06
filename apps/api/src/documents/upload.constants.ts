/**
 * 单个文件的最大字节数：50 MiB。
 */
export const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;

/**
 * 第一阶段允许的扩展名。
 *
 * 扩展名只是初步筛选条件，后续还必须检查文件实际内容。
 */
export const ALLOWED_DOCUMENT_EXTENSIONS = [
  'pdf',
  'md',
  'doc',
  'docx',
] as const;

export type DocumentExtension = (typeof ALLOWED_DOCUMENT_EXTENSIONS)[number];
