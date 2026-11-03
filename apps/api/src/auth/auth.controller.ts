import {
  Controller,
  Post,
  Body,
  HttpCode,
  Req,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * @Body()：读取 HTTP 请求中的请求体（request body），并把它作为参数传给方法
   * @param dto
   * @returns
   */
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200) // 设置响应状态码为 200 OK，默认情况下，POST 请求的响应状态码是 201 Created
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // 本地开发允许 Vite 前端和直接访问后端的同源请求。
    // 部署时应替换为实际前端域名，并继续做 CSRF 防护。
    const allowedOrigins = new Set([
      'http://localhost:5173',
      'http://localhost:3000',
    ]);

    const origin = request.headers.origin;

    if (
      (origin && !allowedOrigins.has(origin)) ||
      request.headers['sec-fetch-site'] === 'cross-site'
    ) {
      throw new ForbiddenException('请求来源不被允许');
    }

    const result = await this.authService.login(dto);

    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true, // 前端 JS 不能通过 document.cookie 读取这个 Cookie
      secure: process.env.NODE_ENV === 'production', // 生产环境下，Cookie 只允许通过 HTTPS 发送
      sameSite: 'lax', // 防止 CSRF 攻击，允许跨站点请求携带 Cookie，但仅限于安全的 HTTP 方法（GET、HEAD、OPTIONS、POST）
      path: '/auth', // 仅在 /auth 路径下发送 Cookie，其他路径不会发送
      expires: result.expiresAt, // 设置 Cookie 的过期时间，单位是毫秒
    });

    return {
      accessToken: result.accessToken,
      expiresIn: 900,
      user: result.user,
    };
  }
}
