// TODO: 暂定，后续要与 list-knowledge-bases.dto.ts 合并优化
import { Transform } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';

/**
 * URL 查询参数默认是字符串。
 * 只转换纯数字，其余值保留给校验器处理。
 */
function toQueryInteger(value: unknown): unknown {
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value);
  }

  return value;
}

export class ListDocumentsDto {
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
