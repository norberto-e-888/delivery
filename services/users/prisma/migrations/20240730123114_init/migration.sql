-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DINER', 'DRIVER', 'RESTAURANT_ADMIN', 'RESTAURANT_OWNER', 'ROOT');

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
CREATE INDEX "Outbox_isSent_createdAt_idx" ON "Outbox"("isSent", "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
