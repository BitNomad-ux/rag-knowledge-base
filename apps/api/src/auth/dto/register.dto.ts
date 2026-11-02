import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @MaxLength(254, { message: '邮箱不能超过 254 个字符' })
  email!: string;

  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码至少需要 8 个字符' })
  @MaxLength(128, { message: '密码不能超过 128 个字符' })
  password!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: '显示名称必须是字符串' })
  @Length(1, 50, { message: '显示名称长度需要在 1 到 50 个字符之间' })
  displayName!: string;
}
