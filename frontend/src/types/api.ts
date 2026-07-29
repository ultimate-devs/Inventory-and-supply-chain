export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: PaginationMeta;
}

export interface ApiErrorPayload {
  success: false;
  data: null;
  message: string;
  details?: Array<{ field?: string; message: string }>;
}
