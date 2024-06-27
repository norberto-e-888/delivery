import { Service } from '@delivery/api';

export const getDLQName = (service: Service) => `_dlq.${service}`;
