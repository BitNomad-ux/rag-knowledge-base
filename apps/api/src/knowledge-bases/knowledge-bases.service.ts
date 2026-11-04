import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto.js';
import type { ListKnowledgeBasesDto } from './dto/list-knowledge-bases.dto.js';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto.js';

@Injectable()
export class KnowledgeBasesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 为当前用户创建知识库。
   * ownerId 来自守卫验证后的用户信息，不由客户端指定。
   */
  async create(ownerId: string, dto: CreateKnowledgeBaseDto) {
    try {
      return await this.prisma.knowledgeBase.create({
        data: {
          ownerId,
          name: dto.name,
          description: dto.description ?? null,
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      // 数据库的 (ownerId, name) 唯一约束负责处理并发重名。
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('知识库名称已存在');
      }

      throw error;
    }
  }

  /**
   * 只查询当前用户的活动知识库。
   */
  async findAll(ownerId: string, query: ListKnowledgeBasesDto) {
    const { page, pageSize } = query;

    const where = {
      ownerId,
      status: 'active',
    };

    const [items, total] = await Promise.all([
      this.prisma.knowledgeBase.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        // 创建时间相同时用 id 保证排序稳定。
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize, // 跳过前面页面的记录
        take: pageSize, // 取当前页的记录
      }),
      this.prisma.knowledgeBase.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 根据 ID 查询当前用户的活动知识库。
   * 不存在和不属于当前用户都返回 404。
   */
  async findOne(ownerId: string, id: string) {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id,
        ownerId,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!knowledgeBase) throw new NotFoundException('知识库不存在');

    return knowledgeBase;
  }

  async update(ownerId: string, id: string, dto: UpdateKnowledgeBaseDto) {
    if (dto.name === undefined && dto.description === undefined)
      throw new BadRequestException('请至少提供一个需要修改的字段');

    try {
      const result = await this.prisma.knowledgeBase.updateMany({
        where: {
          id,
          ownerId,
          status: 'active',
        },
        data: {
          // undefined 不会更新该字段；null 会清空 description。
          name: dto.name,
          description: dto.description,
        },
      });

      if (result.count == 0) throw new NotFoundException('知识库不存在');
      // 返回更新后的公开字段。
      return await this.findOne(ownerId, id);
    } catch (error) {
      // 同一用户下修改成已有名称时，返回 409。
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('知识库名称已存在');
      }

      throw error;
    }
  }
}
