// TODO: 当前 PDF 检查只是文件头和结尾的初步筛选，完整解析能力和处理异常 PDF 的策略仍需进一步开发
import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import {
  MAX_DOCUMENT_SIZE,
  type DocumentExtension,
} from './upload.constants.js';
import { validateDocx } from './validate-docx.js';
import { validateDoc } from './validate-doc.js';

export interface ValidatedDocumentContent {
  sizeBytes: number;
  mediaType: string;
}

/**
 * 校验已经写入临时目录的文件。
 *
 * 注意：调用前必须由服务端确定 filePath，不能使用客户端提供的路径。
 */
export async function validateDocumentContent(
  filePath: string,
  extension: DocumentExtension,
): Promise<ValidatedDocumentContent> {
  const fileStat = await stat(filePath);

  if (!fileStat.isFile() || fileStat.size === 0) {
    throw new BadRequestException('文件不能为空');
  }

  if (fileStat.size > MAX_DOCUMENT_SIZE) {
    throw new PayloadTooLargeException('文件不能超过 50 MiB');
  }

  switch (extension) {
    case 'md':
      await validateMarkdown(filePath);

      return {
        sizeBytes: fileStat.size,
        mediaType: 'text/markdown',
      };

    case 'pdf':
      await validatePdfEnvelope(filePath, fileStat.size);

      return {
        sizeBytes: fileStat.size,
        mediaType: 'application/pdf',
      };

    case 'docx':
      await validateDocx(filePath);

      return {
        sizeBytes: fileStat.size,
        mediaType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

    case 'doc':
      await validateDoc(filePath);

      return {
        sizeBytes: fileStat.size,
        mediaType: 'application/msword',
      };
  }
}

/**
 * Markdown 按 UTF-8 流式解码，避免把整个文件读入内存。
 */
async function validateMarkdown(filePath: string): Promise<void> {
  const stream = createReadStream(filePath);
  const decoder = new TextDecoder('utf-8', { fatal: true });

  try {
    for await (const chunk of stream) {
      // Node 文件流的 chunk 为 Buffer，属于 Uint8Array。
      const bytes = chunk as Buffer;

      // 禁止 NUL 字节，避免明显的二进制内容被当作文本。
      if (bytes.includes(0)) {
        throw new UnsupportedMediaTypeException(
          'Markdown 文件必须是 UTF-8 文本',
        );
      }

      try {
        // stream: true 保留跨数据块的 UTF-8 字节序列。
        decoder.decode(bytes, { stream: true });
      } catch {
        throw new UnsupportedMediaTypeException(
          'Markdown 文件必须使用有效的 UTF-8 编码',
        );
      }
    }

    try {
      // 检查文件末尾是否存在不完整的 UTF-8 字节序列。
      decoder.decode();
    } catch {
      throw new UnsupportedMediaTypeException(
        'Markdown 文件必须使用有效的 UTF-8 编码',
      );
    }
  } finally {
    stream.destroy();
  }
}

/**
 * 检查 PDF 文件头和末尾标记。
 *
 * 这是基本筛选，不是完整 PDF 解析，也不能证明文件安全。
 */
async function validatePdfEnvelope(
  filePath: string,
  sizeBytes: number,
): Promise<void> {
  const handle = await open(filePath, 'r');

  try {
    const header = Buffer.alloc(8);
    const headerRead = await handle.read(header, 0, header.length, 0);

    if (
      headerRead.bytesRead < 5 ||
      header.subarray(0, 5).toString('ascii') !== '%PDF-'
    ) {
      throw new UnsupportedMediaTypeException('PDF 文件头无效');
    }

    // 只读取末尾一小段，避免把整个文件加载到内存。
    const tailLength = Math.min(sizeBytes, 2048);
    const tail = Buffer.alloc(tailLength);

    const tailRead = await handle.read(
      tail,
      0,
      tailLength,
      sizeBytes - tailLength,
    );

    const tailText = tail.subarray(0, tailRead.bytesRead).toString('latin1');

    if (!tailText.includes('%%EOF')) {
      throw new UnsupportedMediaTypeException('PDF 文件结尾标记无效');
    }
  } finally {
    await handle.close();
  }
}
