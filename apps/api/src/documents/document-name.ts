import {
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { extname } from 'node:path';
import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  type DocumentExtension,
} from './upload.constants.js';

export interface ValidatedDocumentName {
  originalName: string;
  fileExtension: DocumentExtension;
}

/**
 * 校验用于展示的原文件名，并提取允许的扩展名。
 *
 * 这个方法不检查文件内容；内容校验会在下一步实现。
 */
export function validateDocumentName(
  originalName: string,
): ValidatedDocumentName {
  const name = originalName.trim();

  if (!name || Array.from(name).length > 255) {
    throw new BadRequestException('文件名长度需要在 1 到 255 个字符之间');
  }

  // 不允许把路径、控制字符等混入展示名称。
  if (name === '.' || name === '..' || /[\/\\\x00-\x1f\x7f]/.test(name)) {
    throw new BadRequestException('文件名包含不允许的字符');
  }

  const extension = extname(name).slice(1).toLowerCase();

  if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(extension as DocumentExtension)) {
    throw new UnsupportedMediaTypeException('不支持该文件格式');
  }

  return {
    originalName: name,
    fileExtension: extension as DocumentExtension,
  };
}
