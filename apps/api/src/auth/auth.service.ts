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
}
