import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { DocumentController } from './documents.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DocumentService } from './documents.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { StorageService } from '../storage/storage.service.js';
import { MAX_DOCUMENT_SIZE } from './upload.constants.js';
import { DocumentItemsController } from './document-items.controller.js';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    StorageModule,

    // multer 文件上传配置
    MulterModule.registerAsync({
      imports: [StorageModule],
      inject: [StorageService],
      useFactory: (storage: StorageService) => ({
        storage: diskStorage({
          // 文件先写入服务端临时目录。
          destination: (_request, _file, callback) => {
            callback(null, storage.tempDir);
          },

          // 文件名由服务端生成，不使用客户端文件名。
          filename: (_request, _file, callback) => {
            callback(null, storage.createTempName());
          },
        }),
        limits: {
          fileSize: MAX_DOCUMENT_SIZE,
          files: 1,
          fields: 0, // 表示只接收一个 file 文件上传
        },
      }),
    }),
  ],
  controllers: [DocumentController, DocumentItemsController],
  providers: [DocumentService],
})
export class DocumentsModule {}
