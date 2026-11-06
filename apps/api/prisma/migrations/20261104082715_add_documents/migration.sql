-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "knowledge_base_id" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "file_extension" VARCHAR(10) NOT NULL,
    "media_type" VARCHAR(127),
    "size_bytes" BIGINT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'uploaded',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_storage_key_key" ON "documents"("storage_key");

-- CreateIndex
CREATE INDEX "documents_knowledge_base_id_created_at_idx" ON "documents"("knowledge_base_id", "created_at");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 文件必须非空，且不能超过 50 MiB。
ALTER TABLE "documents"
ADD CONSTRAINT "documents_size_bytes_check"
CHECK ("size_bytes" > 0 AND "size_bytes" <= 52428800);

-- 限制第一阶段支持的扩展名。
ALTER TABLE "documents"
ADD CONSTRAINT "documents_file_extension_check"
CHECK ("file_extension" IN ('pdf', 'md', 'doc', 'docx'));

-- 限制文档状态。
ALTER TABLE "documents"
ADD CONSTRAINT "documents_status_check"
CHECK ("status" IN ('uploaded', 'deleting'));