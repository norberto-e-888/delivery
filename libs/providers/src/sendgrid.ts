import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sendgrid from '@sendgrid/mail';

export const SENDGRID_PROVIDER_KEY = Symbol('SENDGRID_PROVIDER_KEY');
export const sendgridProvider: Provider = {
  provide: SENDGRID_PROVIDER_KEY,
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
export class AppSendgridModule {}

export type SendgridConfig = {
  sendgrid: { apiKey: string };
};

export type SendgridProviderType = typeof sendgrid;
