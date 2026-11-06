import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../auth/access-token.guard.js';
import { DocumentService } from './documents.service.js';

/**
 * 对文件名进行 RFC 5987 编码，供 Content-Disposition 使用。
 */
function encodeFileName(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

@Controller('documents')
@UseGuards(AccessTokenGuard)
export class DocumentItemsController {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * GET /documents/:id
   */
  @Get(':id')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentService.findOne(request.user.id, id);
  }

  /**
   * GET /documents/:id/content
   */
  @Get(':id/content')
  async download(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.documentService.openDownload(request.user.id, id);

    // 首期统一作为附件下载，避免不可信文件直接作为同源页面展示。
    response.setHeader('Content-Type', 'application/octet-stream');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="download"; filename*=UTF-8''${encodeFileName(file.originalName)}`,
    );

    return new StreamableFile(file.stream, {
      length: file.size,
    });
  }

  // TODO: 实现跨当前用户知识库的文件名搜索。
}
