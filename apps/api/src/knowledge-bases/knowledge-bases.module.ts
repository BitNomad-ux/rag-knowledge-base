import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { KnowledgeBaseController } from './knowledge-bases.controller.js';
import { KnowledgeBasesService } from './knowledge-bases.service.js';

@Module({
  // AuthModule 提供鉴权守卫及 JWT 相关依赖。
  // PrismaModule 提供数据库访问服务。
  imports: [AuthModule, PrismaModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBasesService],
})
export class KnowledgeBasesModule {}
