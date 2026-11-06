import { UnsupportedMediaTypeException } from '@nestjs/common';
import { open, type Entry, type ZipFile } from 'yauzl';
import type { Readable } from 'node:stream';

// 以下限制是第一阶段的初始值，后续可根据真实文档调整。
const MAX_ENTRIES = 2_000;
const MAX_ENTRY_SIZE = 100 * 1024 * 1024;
const MAX_TOTAL_SIZE = 200 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 1_000;

const REQUIRED_ENTRIES = new Set([
  '[Content_Types].xml',
  '_rels/.rels',
  'word/document.xml',
]);

function invalidDocx(): UnsupportedMediaTypeException {
  return new UnsupportedMediaTypeException('DOCX 文件无效或超出解压限制');
}

/**
 * 校验 DOCX 的 ZIP 结构及解压资源限制。
 *
 * 不把条目写入磁盘，也不把整个条目加载进内存。
 * 这个检查不能证明文档内容完全安全。
 */
export async function validateDocx(filePath: string): Promise<void> {
  const zip = await openZip(filePath);

  try {
    await inspectEntries(zip);
  } finally {
    zip.close();
  }
}

function openZip(filePath: string): Promise<ZipFile> {
  return new Promise((resolve, reject) => {
    open(
      filePath,
      {
        lazyEntries: true,
        autoClose: false,
        validateEntrySizes: true,
        strictFileNames: true,
      },
      (error, zip) => {
        if (error || !zip) {
          reject(invalidDocx());
          return;
        }

        resolve(zip);
      },
    );
  });
}

function openEntryStream(zip: ZipFile, entry: Entry): Promise<Readable> {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error || !stream) {
        reject(invalidDocx());
        return;
      }

      resolve(stream);
    });
  });
}

async function consumeEntry(
  zip: ZipFile,
  entry: Entry,
  previousTotal: number,
): Promise<number> {
  const stream = await openEntryStream(zip, entry);
  let entryBytes = 0;
  let totalBytes = previousTotal;

  try {
    for await (const chunk of stream) {
      const size = (chunk as Buffer).length;

      entryBytes += size;
      totalBytes += size;

      // 实际解压字节数也要限制，不能只相信 ZIP 元数据。
      if (entryBytes > MAX_ENTRY_SIZE || totalBytes > MAX_TOTAL_SIZE) {
        throw invalidDocx();
      }
    }
  } finally {
    stream.destroy();
  }

  return totalBytes;
}

function inspectEntries(zip: ZipFile): Promise<void> {
  return new Promise((resolve, reject) => {
    let finished = false;
    let entryCount = 0;
    let totalBytes = 0;

    const seenNames = new Set<string>();
    const requiredFound = new Set<string>();

    function fail(): void {
      if (finished) return;

      finished = true;
      reject(invalidDocx());
    }

    zip.on('error', fail);

    zip.on('end', () => {
      if (finished) return;

      const hasRequiredEntries = [...REQUIRED_ENTRIES].every((name) =>
        requiredFound.has(name),
      );

      if (!hasRequiredEntries) {
        fail();
        return;
      }

      finished = true;
      resolve();
    });

    zip.on('entry', (entry: Entry) => {
      void processEntry(entry).catch(fail);
    });

    async function processEntry(entry: Entry): Promise<void> {
      entryCount += 1;

      if (entryCount > MAX_ENTRIES) {
        throw invalidDocx();
      }

      // 拒绝重复条目，避免不同解析器对同名文件处理不一致。
      if (seenNames.has(entry.fileName)) {
        throw invalidDocx();
      }

      seenNames.add(entry.fileName);

      // 第一阶段不接收加密 ZIP 条目。
      if ((entry.generalPurposeBitFlag & 1) !== 0) {
        throw invalidDocx();
      }

      if (
        entry.uncompressedSize > MAX_ENTRY_SIZE ||
        totalBytes + entry.uncompressedSize > MAX_TOTAL_SIZE
      ) {
        throw invalidDocx();
      }

      if (
        entry.uncompressedSize > 0 &&
        (entry.compressedSize === 0 ||
          entry.uncompressedSize / entry.compressedSize > MAX_COMPRESSION_RATIO)
      ) {
        throw invalidDocx();
      }

      // 目录条目没有内容，继续读取下一项。
      if (entry.fileName.endsWith('/')) {
        zip.readEntry();
        return;
      }

      if (REQUIRED_ENTRIES.has(entry.fileName)) {
        requiredFound.add(entry.fileName);
      }

      totalBytes = await consumeEntry(zip, entry, totalBytes);

      if (!finished) {
        zip.readEntry();
      }
    }

    // lazyEntries 模式下由应用逐个请求条目。
    zip.readEntry();
  });
}
