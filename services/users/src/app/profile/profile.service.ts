import { UsersProfileUpdateInfoBody } from '@delivery/api';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UsersProfileUpdateInfoBody) {
    const user = await this.prisma.extended.user
      .findUniqueOrThrow({
        where: {
          id: userId,
        },
      })
      .catch(() => {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      });

    const updatedUser = await this.prisma.extended.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: dto.name,
      },
    });

    return updatedUser;
  }
}
