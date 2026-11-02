/**
 * 数据库连接服务，并提供 PrismaClient 实例给其他服务使用
 * 将 Prisma 数据库客户端接入 NestJS，让项目中的其他代码可以通过 PrismaService 操作 PostgreSQL 数据库
 */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable() // 让 NestJS 可以管理这个 PrismaService 类。
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('缺少 DATABASE_URL 环境变量');
    }

    const adapter = new PrismaPg({ connectionString }); // 适配器，用于连接 PostgreSQL 数据库

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect(); // 等待数据库连接成功后，再继续完成应用启动
  }

  async onModuleDestroy() {
    await this.$disconnect(); // 当 NestJS 应用关闭时，会自动执行这个方法
  }
}
