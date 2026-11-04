import { Transform } from 'class-transformer';
import { ValidateIf, IsString, Length, MaxLength } from 'class-validator';

export class UpdateKnowledgeBaseDto {
  // 只有传入 name 时才校验；传 null 也会进入校验并被拒绝。
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: '知识库名称必须是字符串' })
  @Length(1, 100, { message: '知识库名称长度需要在 1 到 100 个字符之间' })
  name?: string;

  // description 可省略；传 null 表示清空描述。
  // _object 表示整个 DTO 对象，这个参数需要占位，但代码中不会使用它
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString({ message: '知识库描述必须是字符串或 null' })
  @MaxLength(500, { message: '知识库描述不能超过 500 个字符' })
  description?: string | null;
}
