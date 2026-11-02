import { Injectable, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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
}
