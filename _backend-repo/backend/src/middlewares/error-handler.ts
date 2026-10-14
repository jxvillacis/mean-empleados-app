import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { sendError } from '../http/api-response.js';

// Cualquier ruta que no exista termina aquí.
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `La ruta ${req.method} ${req.originalUrl} no existe`));
};

// Interceptor global: único punto donde los errores se convierten en respuestas HTTP.
// Nunca expone mensajes internos, stack traces ni detalles del motor de base de datos.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const details = err.issues.map(issue => ({
      campo: issue.path.join('.') || '(solicitud)', // sin ruta = error sobre el objeto completo
      mensaje: issue.message
    }));
    sendError(res, 400, 'VALIDATION_ERROR', 'Los datos enviados no son válidos', details);
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // JSON mal formado en el body (lanzado por express.json()).
  if (err?.type === 'entity.parse.failed') {
    sendError(res, 400, 'MALFORMED_JSON', 'El cuerpo de la petición no es un JSON válido');
    return;
  }

  console.error('[ErrorHandler] Error no controlado:', err);
  sendError(res, 500, 'INTERNAL_ERROR', 'Ocurrió un error interno. Intente nuevamente más tarde.');
};
