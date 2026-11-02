/*
  Warnings:

  - You are about to drop the column `user_id` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[owner_id,name]` on the table `knowledge_bases` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "knowledge_bases_owner_id_name_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "user_id",
ADD COLUMN     "email" VARCHAR(254) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_bases_owner_id_name_key" ON "knowledge_bases"("owner_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
