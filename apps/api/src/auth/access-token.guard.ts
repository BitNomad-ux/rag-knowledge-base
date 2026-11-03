import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * 鉴权成功后，守卫会把当前用户 ID 放到请求对象中。
 */
export type AuthenticatedRequest = Request & {
  user: {
    id: string;
    sessionId: string;
  };
};

type AccessTokenPayload = {
  sub?: unknown;
  sessionId?: unknown;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>(); // 取出当前 HTTP 请求，并告诉 TypeScript：这个请求在鉴权成功后会带有 user 信息。

    // 期望格式：Authorization: Bearer <accessToken>
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      throw new UnauthorizedException('请先登录');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET 未设置');
    }

    let payload: AccessTokenPayload;

    try {
      // verifyAsync 方法会验证 JWT 的签名和过期时间，并返回解码后的 payload
      // 如果 token：被篡改、签名不匹配、已过期、格式错误、算法不允许，verifyAsync 就会抛出异常
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(match[1], {
        secret: jwtSecret,
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('访问令牌无效或已过期');
    }

    // 校验 UUID 格式，避免错误值传入数据库查询。
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (
      typeof payload.sub !== 'string' ||
      !uuidPattern.test(payload.sub) ||
      typeof payload.sessionId !== 'string' ||
      !uuidPattern.test(payload.sessionId)
    ) {
      throw new UnauthorizedException('访问令牌无效');
    }

    const session = await this.prisma.userSession.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('登录会话已失效');
    }

    request.user = {
      id: session.userId,
      sessionId: session.id,
    };

    return true;
  }
}
