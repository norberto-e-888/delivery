import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sendgrid from '@sendgrid/mail';
import Joi from 'joi';

export const SENDGRID = Symbol('SENDGRID');
export const sendgridProvider: Provider = {
  provide: SENDGRID,
  inject: [ConfigService],
  useFactory: async (config: ConfigService<SendgridConfig>) => {
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
