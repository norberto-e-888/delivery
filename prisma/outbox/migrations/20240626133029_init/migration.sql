-- CreateTable
CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "routingKey" TEXT,
    "payload" TEXT NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxAggregate" (
    "outboxId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxAggregate_pkey" PRIMARY KEY ("outboxId")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutboxAggregate_entityId_version_key" ON "OutboxAggregate"("entityId", "version" DESC);

-- AddForeignKey
ALTER TABLE "OutboxAggregate" ADD CONSTRAINT "OutboxAggregate_outboxId_fkey" FOREIGN KEY ("outboxId") REFERENCES "Outbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
