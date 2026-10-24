import { Router } from 'express';
import type { AuthController } from '../controllers/auth.controller.js';
import { LoginSchema } from '../dto/auth.dto.js';
import { validate } from '../middlewares/validate.js';

// Módulo de autenticación: el login queda blindado perimetralmente con el DTO de Zod.
export const createAuthRouter = (controller: AuthController): Router => {
  const router = Router();

  router.post('/auth/login', validate({ body: LoginSchema }), controller.login);

  return router;
};
