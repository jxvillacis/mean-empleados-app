import type { Response } from 'express';

// Metadatos de paginación; solo se incluyen en las consultas paginadas.
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Response Wrapper Pattern: toda respuesta, exitosa o fallida, tiene la misma forma.
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  meta?: PaginationMeta;
  error: { code: string; details?: unknown } | null;
  timestamp: string;
}

export const sendSuccess = <T>(res: Response, data: T, message: string, statusCode = 200, meta?: PaginationMeta): void => {
  const body: ApiResponse<T> = {
    success: true,
    statusCode,
    message,
    data,
    ...(meta ? { meta } : {}),
    error: null,
    timestamp: new Date().toISOString()
  };
  res.status(statusCode).json(body);
};

export const sendError = (res: Response, statusCode: number, code: string, message: string, details?: unknown): void => {
  const body: ApiResponse<null> = {
    success: false,
    statusCode,
    message,
    data: null,
    error: details === undefined ? { code } : { code, details },
    timestamp: new Date().toISOString()
  };
  res.status(statusCode).json(body);
};
