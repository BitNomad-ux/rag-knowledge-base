// 在 NestJS 启动时，准备并检查文档文件的存储目录。
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { access, lstat, mkdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';

/**
 * StorageService 实现了 NestJS 生命周期钩子 OnModuleInit
 * NestJS 初始化模块时，会自动调用 OnModuleInit
 */
@Injectable() // 把这个类标记成可被依赖注入的 Provider
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);

  readonly rootDir: string;
  readonly tempDir: string;
  readonly objectsDir: string;

  constructor() {
    const configuredRoot = process.env.DOCUMENT_STORAGE_ROOT?.trim();

    if (!configuredRoot) {
      throw new Error('缺少 DOCUMENT_STORAGE_ROOT 环境变量');
    }

    if (!isAbsolute(configuredRoot)) {
      throw new Error('DOCUMENT_STORAGE_ROOT 必须是绝对路径');
    }

    this.rootDir = resolve(configuredRoot);
    this.tempDir = join(this.rootDir, 'tmp');
    this.objectsDir = join(this.rootDir, 'objects');
  }

  /**
   * NestJS 启动模块时执行。
   *
   * 准备存储目录，并在服务启动前检查基本配置。
   */
  async onModuleInit() {
    await this.ensureDirectory(this.rootDir);
    await this.ensureDirectory(this.tempDir);
    await this.ensureDirectory(this.objectsDir);

    const [tempStat, objectsStat] = await Promise.all([
      stat(this.tempDir),
      stat(this.objectsDir),
    ]);

    // 上传完成后计划使用重命名移动文件；要求两个目录在同一文件系统。
    if (tempStat.dev !== objectsStat.dev) {
      throw new Error('临时目录和正式文件目录必须位于同一文件系统');
    }

    this.logger.log('文档存储目录初始化完成');
  }

  private async ensureDirectory(directory: string) {
    // 目录不存在时创建；已存在时不会覆盖。
    await mkdir(directory, { recursive: true });

    const info = await lstat(directory);

    // 不接受目录本身是符号链接。
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw new Error('文档存储路径必须是普通目录');
    }

    // 检查当前进程是否具备读取、写入和访问目录的权限。
    await access(directory, constants.R_OK | constants.W_OK | constants.X_OK);
  }

  /**
   * 生成临时文件名。
   *
   * 不使用客户端提供的文件名，避免把用户输入用于服务器路径。
   */
  createTempName(): string {
    return `${randomUUID()}.tmp`;
  }

  /**
   * 删除临时文件。
   *
   * 文件已经不存在时按清理成功处理；
   * 其他错误继续抛出，避免把权限等问题静默忽略。
   */
  async removeTempFile(fileName: string): Promise<void> {
    // 只接受本服务生成的临时文件名，避免传入路径。
    const pattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.tmp$/i;

    if (!pattern.test(fileName)) {
      throw new Error('临时文件名无效');
    }

    try {
      await unlink(join(this.tempDir, fileName));
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return;
      }

      throw error;
    }
  }
}
