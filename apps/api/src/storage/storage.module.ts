// 把 StorageService 注册到 NestJS 的依赖注入系统中
import { Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';

/**
 * providers：这个模块内部有哪些服务可以由 NestJS 创建和管理
 * exports：允许其他模块使用这个模块内部的 StorageService
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
