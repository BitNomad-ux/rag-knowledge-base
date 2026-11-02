import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * PrismaModule 是一个 NestJS 模块，负责提供 PrismaService 实例给其他模块使用
 * 通过将 PrismaService 注册为 providers 和 exports，其他模块可以通过依赖注入获取 PrismaService 实例
 */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
