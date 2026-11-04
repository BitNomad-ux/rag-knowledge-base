import { Transform } from 'class-transformer';
import { IsString, Length, IsOptional, MaxLength } from 'class-validator';

export class CreateKnowledgeBaseDto {
  // 字符串先去掉首尾空格；非字符串保留原值，由校验器返回 400。
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: '知识库名称必须是字符串' })
  @Length(1, 100, { message: '知识库名称长度需要在 1 到 100 个字符之间' })
  name!: string;

  // description 可以省略，也可以传 null。
  @IsOptional()
  @IsString({ message: '知识库描述必须是字符串' })
  @MaxLength(500, { message: '知识库描述不能超过 500 个字符' })
  description?: string | null;
}
