import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../http/api-response.js';

// Datos del usuario autenticado que el interceptor inyecta en la petición.
export interface AuthUser {
  id: string;
  rol: string;
}

// Extiende la petición de Express con el usuario autenticado.
export interface IAuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Interceptor de seguridad: exige `Authorization: Bearer <TOKEN>`, verifica la firma HS256 con la llave
 * del servidor y deja el payload en req.user. Recibe la llave desde la raíz de composición (index.ts), así
 * que no hay ninguna llave escrita en el código.
 */
export const authenticateJWT = (secret: string): RequestHandler =>
  (req: IAuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.setHeader('WWW-Authenticate', 'Bearer');
      sendError(res, 401, 'UNAUTHORIZED', 'Acceso denegado: No se proporcionó un token de autenticación válido');
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();

    try {
      // algorithms fija HS256: rechaza tokens que declaran otro algoritmo (por ejemplo "none").
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
      if (typeof decoded === 'string' || typeof decoded.id !== 'string' || typeof decoded.rol !== 'string') {
        throw new Error('Payload sin id o rol');
      }
      req.user = { id: decoded.id, rol: decoded.rol }; // Inyección de contexto seguro
      next();
    } catch {
      sendError(res, 403, 'FORBIDDEN', 'El token proporcionado ha expirado o su firma es inválida');
    }
  };
