/*
  Warnings:

  - A unique constraint covering the columns `[operationId]` on the table `Conflict` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Todo" ALTER COLUMN "status" SET DEFAULT 'pending';

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Note_deletedAt_idx" ON "Note"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conflict_operationId_key" ON "Conflict"("operationId");

-- CreateIndex
CREATE INDEX "Conflict_status_idx" ON "Conflict"("status");

-- CreateIndex
CREATE INDEX "Conflict_tableName_recordId_idx" ON "Conflict"("tableName", "recordId");

-- CreateIndex
CREATE INDEX "Todo_deletedAt_idx" ON "Todo"("deletedAt");
