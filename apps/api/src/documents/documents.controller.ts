import {
  Controller,
  UseGuards,
  Get,
  Req,
  Param,
  Query,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeBaseUploadGuard } from './knowledge-base-upload.guard.js';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../auth/access-token.guard.js';
import { DocumentService } from './documents.service.js';
import { ListDocumentsDto } from './dto/list-documents.dto.js';

@Controller('knowledge-bases/:knowledgeBaseId/documents')
@UseGuards(AccessTokenGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * 查询指定用户的知识库中的文档
   * GET /knowledge-bases/:knowledgeBaseId/documents
   */
  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: string,
    @Query() query: ListDocumentsDto,
  ) {
    return this.documentService.findAll(
      request.user.id,
      knowledgeBaseId,
      query,
    );
  }

  /**
   * 实现单文件上传接口
   * POST /knowledge-bases/:knowledgeBaseId/documents
   *
   * multipart/form-data 字段名：file。
   */
  @Post()
  @UseGuards(KnowledgeBaseUploadGuard)
  @UseInterceptors(FileInterceptor('file')) // NestJS 提供的文件上传拦截器，作用是把 HTTP 请求中的文件交给 Multer 处理
  upload(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.documentService.upload(request.user.id, knowledgeBaseId, file);
  }
  // TODO: 实现文件名和类型筛选。
}
