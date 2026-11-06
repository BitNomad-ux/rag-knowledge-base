import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { rename, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListDocumentsDto } from './dto/list-documents.dto.js';
import { StorageService } from '../storage/storage.service.js';
import { validateDocumentName } from './document-name.js';
import { validateDocumentContent } from './document-content.js';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * 查询当前用户指定知识库中的文档。
   */
  async findAll(
    ownerId: string,
    knowledgeBaseId: string,
    query: ListDocumentsDto,
  ) {
    // 先区分“空知识库”和“没有权限访问的知识库”。
    // 不存在或不属于当前用户时统一返回 404。
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id: knowledgeBaseId,
        ownerId,
        status: 'active',
      },
      select: { id: true },
    });

    if (!knowledgeBase) throw new NotFoundException('知识库不存在');

    const { page, pageSize } = query;
    const where = {
      knowledgeBaseId,
      status: 'uploaded',
      // 查询文档时再次限制归属和知识库状态。
      knowledgeBase: {
        is: {
          ownerId,
          status: 'active',
        },
      },
    };

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        select: {
          id: true,
          knowledgeBaseId: true,
          originalName: true,
          fileExtension: true,
          mediaType: true,
          sizeBytes: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        // 创建时间相同时按 ID 排序，保证顺序稳定。
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items: documents.map((document) => ({
        ...document,

        // BigInt 不能直接转换为 JSON，因此以十进制字符串返回。
        sizeBytes: document.sizeBytes.toString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 接收 Multer 已经保存到临时目录的文件，校验文件，然后把文件移动到正式目录，并在数据库中创建文档记录。
   */
  async upload(
    ownerId: string,
    knowledgeBaseId: string,
    file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('请选择要上传的文件');

    // Multer 的默认参数字符集可能将浏览器发送的 UTF-8 文件名
    // 按 Latin-1 解码；优先尝试还原，失败则保留原值。
    const originalName = this.decodeFileName(file.originalname);

    const storageKey = randomUUID();
    const targetPath = join(this.storage.objectsDir, storageKey);
    let moved = false;

    try {
      const name = validateDocumentName(originalName);

      const content = await validateDocumentContent(
        file.path,
        name.fileExtension,
      );

      const document = await this.prisma.$transaction(
        async (tx) => {
          // 锁定知识库行；未来删除知识库时也必须遵守相同锁协议。
          const rows = await tx.$queryRaw<{ id: string }[]>`
            SELECT id
            FROM knowledge_bases
            WHERE id = ${knowledgeBaseId}::uuid
              AND owner_id = ${ownerId}::uuid
              AND status = 'active'
            FOR UPDATE 
          `;

          if (rows.length === 0) {
            throw new NotFoundException('知识库不存在');
          }

          // 临时目录和正式目录已在启动时检查为同一文件系统。
          await rename(file.path, targetPath);
          moved = true;

          return tx.document.create({
            data: {
              knowledgeBaseId,
              originalName: name.originalName,
              storageKey,
              fileExtension: name.fileExtension,
              mediaType: content.mediaType,
              sizeBytes: BigInt(content.sizeBytes),
            },
            select: {
              id: true,
              knowledgeBaseId: true,
              originalName: true,
              fileExtension: true,
              mediaType: true,
              sizeBytes: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          });
        },
        {
          // 事务不包含上传过程，只包含锁、文件移动和数据库写入。
          maxWait: 5_000,
          timeout: 10_000,
        },
      );
      return {
        ...document,
        sizeBytes: document.sizeBytes.toString(),
      };
    } finally {
      if (!moved) {
        // 内容校验失败或数据库事务尚未移动文件时，清理临时文件。
        try {
          await this.storage.removeTempFile(file.filename);
        } catch {
          this.logger.error('临时文件清理失败，请检查存储目录');
        }
      } else {
        // TODO: 实现正式文件与数据库记录的定期对账和孤儿清理。
        //
        // 数据库提交结果不确定时，不能直接删除正式文件：
        // 记录可能已经提交，直接删除会造成数据库指向不存在的文件。
      }
    }
  }

  /**
   * 将文件名恢复成 UTF-8 格式的
   */
  private decodeFileName(value: string): string {
    // 已包含超出 Latin-1 范围的字符时，保留原值。
    if ([...value].some((character) => character.codePointAt(0)! > 255)) {
      return value;
    }

    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(
        Buffer.from(value, 'latin1'),
      );
    } catch {
      return value;
    }
  }

  /**
   * 查询当前用户有权访问的文档详情。
   */
  async findOne(ownerId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        status: 'uploaded',
        knowledgeBase: {
          is: {
            ownerId,
            status: 'active',
          },
        },
      },
      select: {
        id: true,
        knowledgeBaseId: true,
        originalName: true,
        fileExtension: true,
        mediaType: true,
        sizeBytes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }

    return {
      ...document,
      sizeBytes: document.sizeBytes.toString(),
    };
  }

  /**
   * 打开当前用户有权下载的文件。
   *
   * 只返回读取流和展示文件名，不向客户端暴露 storageKey。
   */
  async openDownload(ownerId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        status: 'uploaded',
        knowledgeBase: {
          is: {
            ownerId,
            status: 'active',
          },
        },
      },
      select: {
        originalName: true,
        storageKey: true,
      },
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }

    // 当前上传代码生成的 storageKey 是 UUID。
    // 读取前再次校验，避免异常值参与路径拼接。
    const storageKeyPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!storageKeyPattern.test(document.storageKey)) {
      this.logger.error(`文档 ${documentId} 的存储键无效`);
      throw new InternalServerErrorException('文件读取失败');
    }

    const filePath = join(this.storage.objectsDir, document.storageKey);

    try {
      // O_NOFOLLOW 防止最终文件路径指向符号链接。
      const handle = await open(
        filePath,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );

      try {
        const fileStat = await handle.stat();

        if (!fileStat.isFile()) {
          throw new Error('存储对象不是普通文件');
        }

        return {
          originalName: document.originalName,
          size: fileStat.size,
          // 流结束或关闭时自动关闭文件句柄。
          stream: handle.createReadStream({ autoClose: true }),
        };
      } catch (error) {
        await handle.close();
        throw error;
      }
    } catch {
      // 不把服务器路径或底层错误暴露给客户端。
      this.logger.error(`文档 ${documentId} 的文件读取失败`);
      throw new InternalServerErrorException('文件读取失败');
    }
  }
}
