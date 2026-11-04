import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { KnowledgeBasesService } from './knowledge-bases.service.js';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto.js';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../auth/access-token.guard.js';
import { ListKnowledgeBasesDto } from './dto/list-knowledge-bases.dto.js';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto.js';

@Controller('knowledge-bases')
@UseGuards(AccessTokenGuard)
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBasesService: KnowledgeBasesService) {}

  /**
   * POST /knowledge-bases
   * 创建知识库
   * 当前用户 ID 由 AccessTokenGuard 验证后写入 request.user。
   */
  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateKnowledgeBaseDto,
  ) {
    return this.knowledgeBasesService.create(request.user.id, dto);
  }

  /**
   * GET /knowledge-bases?page=1&pageSize=20
   * 分页获取当前用户的知识库
   */
  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() dto: ListKnowledgeBasesDto,
  ) {
    return this.knowledgeBasesService.findAll(request.user.id, dto);
  }

  /**
   * GET /knowledge-bases/:id
   * 获取单个知识库详情
   */
  @Get(':id')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.knowledgeBasesService.findOne(request.user.id, id);
  }

  /**
   * PATCH /knowledge-bases/:id
   * 更新知识库信息
   */
  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKnowledgeBaseDto,
  ) {
    return this.knowledgeBasesService.update(request.user.id, id, dto);
  }
}
