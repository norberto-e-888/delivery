import {
  UsersModule,
  UsersProfileEndpoint,
  UsersProfileUpdateInfoBody,
} from '@delivery/api';
import { AccessTokenPayload, IsLoggedIn } from '@delivery/auth';
import { Body, Controller, Patch, UseGuards } from '@nestjs/common';

import { ProfileService } from './profile.service';

@UseGuards(IsLoggedIn)
@Controller(UsersModule.Profile)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Patch(UsersProfileEndpoint.UpdateProfileInfo)
  async handleUpdateProfile(
    @AccessTokenPayload()
    atp: AccessTokenPayload,
    @Body() body: UsersProfileUpdateInfoBody
  ) {
    const user = await this.profileService.updateProfile(atp.id, body);

    return {
      user,
    };
  }
}
