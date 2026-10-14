// Contrato del Response Wrapper del backend: toda respuesta llega con esta forma.
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  meta?: { page: number; limit: number; total: number; totalPages: number };
  error: { code: string; details?: { campo: string; mensaje: string }[] } | null;
  timestamp: string;
}
