// NestJS 会在请求进入 Controller 前自动调用这个方法。
// TODO: 与document.service.ts 中的代码有较多重合处，后续考虑优化代码
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/access-token.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * CanActivate：NestJS Guard 的接口
 */
@Injectable()
export class KnowledgeBaseUploadGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const id = request.params.knowledgeBaseId;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (typeof id !== 'string' || !uuidPattern.test(id)) {
      throw new BadRequestException('知识库 ID 格式无效');
    }

    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id,
        ownerId: request.user.id,
        status: 'active',
      },
      select: { id: true },
    });

    if (!knowledgeBase) {
      throw new NotFoundException('知识库不存在');
    }

    return true;
  }
}
