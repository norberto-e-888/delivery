import { Global, Logger, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sendgrid from '@sendgrid/mail';

import { CommonConfig, Environment } from '@delivery/utils';

import Joi from 'joi';

export const SENDGRID = Symbol('SENDGRID');
export const sendgridProvider: Provider = {
  provide: SENDGRID,
  inject: [ConfigService],
  useFactory: async (config: ConfigService<SendgridConfig & CommonConfig>) => {
    const commonConfig = config.get<CommonConfig['common']>('common');

    if (!commonConfig) {
      throw new Error(
        'Expected to find common configuration under key "common"'
      );
    }

    const { environment } = commonConfig;

    if (
      environment === Environment.Development ||
      environment === Environment.Testing
    ) {
      const sendgridMock = {
        send: async (args: {
          from: string;
          to: string;
          subject: string;
          text: string;
        }) => {
          Logger.debug(
            `Used mock sendgrid instance...\nEmail data:${JSON.stringify(
              args
            )}`,
            'Sendgrid'
          );
        },
      };

      return sendgridMock;
    }

    const sendgridConfig = config.get<SendgridConfig['sendgrid']>('sendgrid');

    if (!sendgridConfig) {
      throw new Error(
        'Expected to find sendgrid configuration under key "sendgrid"'
      );
    }

    const { apiKey } = sendgridConfig;

    sendgrid.setApiKey(apiKey);

    return sendgrid;
  },
};

@Global()
@Module({
  providers: [sendgridProvider],
  exports: [sendgridProvider],
})
export class SendgridModule {}

export const sendgridConfigJoiSchema = Joi.object<SendgridConfig>({
  sendgrid: Joi.object<SendgridConfig['sendgrid']>({
    apiKey: Joi.string().required(),
  }).required(),
});

export type SendgridConfig = {
  sendgrid: { apiKey: string };
};

export type Sendgrid = typeof sendgrid;
