// TODO: 开放给不可信用户前，还需要限制并发并考虑将解析放进有资源和时间限制的独立进程。
import { UnsupportedMediaTypeException } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import * as CFB from 'cfb';

// OLE Compound File 的文件头。
const OLE_SIGNATURE = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);

/**
 * 对旧版 DOC 做基础结构检查。
 *
 * TODO: 注意：这不是完整的 Word 文档解析，也不能证明文件安全。
 * 调用前必须限制文件大小，并确保 filePath 是服务端生成的临时路径。
 */
export async function validateDoc(filePath: string): Promise<void> {
  // readFile 的文件系统错误继续向上抛出，不误报为文件格式错误。
  const data = await readFile(filePath);

  if (
    data.length < OLE_SIGNATURE.length ||
    !data.subarray(0, OLE_SIGNATURE.length).equals(OLE_SIGNATURE)
  ) {
    throw new UnsupportedMediaTypeException('DOC 文件头无效');
  }

  try {
    const container = CFB.read(data, { type: 'buffer' });

    // 普通的旧版 Word 文档应包含 WordDocument 流。
    const wordDocument = CFB.find(container, 'WordDocument');

    if (!wordDocument || wordDocument.type !== 2) {
      throw new UnsupportedMediaTypeException('文件不是有效的 Word DOC 容器');
    }
  } catch (error) {
    if (error instanceof UnsupportedMediaTypeException) {
      throw error;
    }

    throw new UnsupportedMediaTypeException('DOC 文件结构无效');
  }
}
