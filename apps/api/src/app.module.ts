import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { KnowledgeBasesModule } from './knowledge-bases/knowledge-bases.module.js';
import { StorageModule } from './storage/storage.module.js';
import { DocumentsModule } from './documents/documents.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    KnowledgeBasesModule,
    StorageModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
