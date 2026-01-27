-- CreateTable
CREATE TABLE "ProcessedOperation" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedOperation_operationId_key" ON "ProcessedOperation"("operationId");

-- CreateIndex
CREATE INDEX "ProcessedOperation_processedAt_idx" ON "ProcessedOperation"("processedAt");
