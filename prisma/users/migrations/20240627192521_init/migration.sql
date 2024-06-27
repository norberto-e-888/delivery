-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLERK', 'DINER', 'DRIVER', 'RESTAURANT_OWNER', 'RESTAURANT_ADMIN', 'ROOT');

-- CreateTable
CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "routingKey" TEXT,
    "payload" TEXT NOT NULL,
    "aggregate" JSONB,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "roles" "UserRole"[],
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Outbox_aggregate_entityId_version_key" ON "Outbox"(("aggregate"->>'entityId'), (("aggregate"->>'version')::numeric));


