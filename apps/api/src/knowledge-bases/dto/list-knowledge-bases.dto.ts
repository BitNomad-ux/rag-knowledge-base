import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/**
 * URL 查询参数原本是字符串。
 * 只将纯数字字符串转换为数字，其他值交给校验器拒绝。
 */
function toQueryInteger(value: unknown): unknown {
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value);
  }
  return value;
}

export class ListKnowledgeBasesDto {
  @Transform(({ value }: { value: unknown }) => toQueryInteger(value))
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码不能小于 1' })
  @Max(1000000, { message: '页码过大' })
  page = 1;

  @Transform(({ value }: { value: unknown }) => toQueryInteger(value))
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量不能小于 1' })
  @Max(100, { message: '每页数量不能超过 100' })
  pageSize = 20;
}
