import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true, // 允许跨域请求携带 Cookie
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 只保留 DTO 中声明并带有校验规则的字段
      forbidNonWhitelisted: true, // 如果请求传入额外字段，直接报错
      transform: true, // 按 DTO 类型转换请求数据
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
