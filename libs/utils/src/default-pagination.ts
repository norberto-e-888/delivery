import { Pagination } from './validators';

export const defaultPagination = (pagination?: Pagination): Pagination =>
  pagination || {
    page: 1,
    size: 10,
  };
