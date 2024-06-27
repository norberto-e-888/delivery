import { Service } from '@delivery/api';

export const getDLXName = (service: Service) => `_dlx.${service}`;
