import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

type RequestSchemas = { params?: ZodType; query?: ZodType; body?: ZodType };

// Validación perimetral: si los datos no cumplen el esquema, Zod lanza un ZodError
// que el middleware global de errores convierte en una respuesta 400.
export const validate = (schemas: RequestSchemas): RequestHandler => (req, res, next) => {
  if (schemas.params) schemas.params.parse(req.params);
  // En Express 5 req.query es de solo lectura: la versión validada y tipada va en res.locals.
  if (schemas.query) res.locals['query'] = schemas.query.parse(req.query);
  if (schemas.body) req.body = schemas.body.parse(req.body); // body limpio: trim y sin campos extra
  next();
};
