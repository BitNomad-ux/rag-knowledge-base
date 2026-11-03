import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
        },
        // 创建用户后，只返回这些字段，不返回用户对象中的其他字段，如密码哈希等
        select: {
          id: true,
          email: true,
          displayName: true,
          createdAt: true,
        },
      });
    } catch (err) {
      // P2002 表示唯一约束冲突
      // 邮箱唯一性由数据库约束保证。即使两个相同邮箱的请求同时到达，也只有一个能创建成功；另一个会转换为 409 Conflict。
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('邮箱已被注册');
      }
      throw err;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // UnauthorizedException 对应 HTTP 状态码：401 Unauthorized
    if (!user) throw new UnauthorizedException('用户不存在');

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!passwordMatches) throw new UnauthorizedException('密码错误');

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET 未设置');

    // 一个登录会话有自己的 ID 和随机刷新令牌
    const sessionId = randomUUID();
    const refreshSecret = randomBytes(32).toString('base64url');
    const refreshToken = `${sessionId}.${refreshSecret}`;

    // 数据库只保存刷新令牌的哈希，不保存明文
    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // 当前时间之后 30 天，refresh token 过期。
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, sessionId },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  }

  /**
   * 解析并校验 refreshToken 格式
   * 登录时令牌格式为：sessionId.randomSecret。
   */
  private parseRefreshToken(token: string | undefined) {
    if (!token || token.length > 256) return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [sessionId, refreshSecret] = parts;
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const refreshSecretPattern = /^[A-Za-z0-9_-]{43}$/;

    if (
      !uuidPattern.test(sessionId) ||
      !refreshSecretPattern.test(refreshSecret)
    )
      return null;

    return {
      sessionId,
      tokenHash: createHash('sha256').update(token).digest('hex'),
    };
  }

  async refresh(refreshToken: string | undefined) {
    const parsed = this.parseRefreshToken(refreshToken);
    if (!parsed) throw new UnauthorizedException('刷新令牌无效或已过期');

    const now = new Date();
    const session = await this.prisma.userSession.findUnique({
      where: { id: parsed.sessionId },
      // 把 user 这个关联关系包含进结果
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.refreshTokenHash !== parsed.tokenHash
    )
      throw new UnauthorizedException('刷新令牌无效或已过期');

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET 未设置');

    const newRefreshSecret = randomBytes(32).toString('base64url');
    const newRefreshToken = `${session.id}.${newRefreshSecret}`; // 有效期跟旧的 newRefreshToken 的有效期一样，不是新的有效期
    const newRefreshTokenHash = createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');

    // 生成新的 accessToken，有效期是新的 15min
    const accessToken = await this.jwt.signAsync(
      { sub: session.userId, sessionId: session.id },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    // 条件更新让同一个旧令牌只能成功使用一次。
    // 同时再次检查撤销和过期状态，避免查询与更新之间发生竞争。
    // updateMany：批量更新
    const updated = await this.prisma.userSession.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: parsed.tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() }, // gt：大于，lt：小于，gte：大于等于，lte：小于等于
      },
      // 要写入/修改的数据
      data: {
        refreshTokenHash: newRefreshTokenHash,
      },
    });

    if (updated.count !== 1) {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt: session.expiresAt,
      user: {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName,
      },
    };
  }

  async logout(refreshToken: string | undefined) {
    const parsed = this.parseRefreshToken(refreshToken);

    // 没有令牌或令牌格式错误时，也按已退出处理。
    if (!parsed) {
      return;
    }

    await this.prisma.userSession.updateMany({
      where: {
        id: parsed.sessionId,
        refreshTokenHash: parsed.tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
