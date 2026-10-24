import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../../models/api-response';

/** Traduce la respuesta de error del backend (Response Wrapper) a un mensaje legible para la vista. */
export function toErrorMessage(err: HttpErrorResponse): string {
  if (err.status === 0) return 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.';
  const body = err.error as ApiResponse<null> | null;
  const details = body?.error?.details;
  if (details?.length) return details.map(d => d.mensaje).join(' · ');
  return body?.message ?? 'Ocurrió un error inesperado.';
}
