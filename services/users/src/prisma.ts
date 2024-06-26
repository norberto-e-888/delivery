import {
  HttpException,
  HttpStatus,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/users';

export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async findUserById(id: string, throwIfNotFound = true) {
    const user = await this.user.findUnique({
      where: {
        id,
      },
    });

    if (!user && throwIfNotFound) {
      throw new HttpException(
        `User with id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }

    return user;
  }
}
