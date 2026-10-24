import express, { type Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { AuthController } from './controllers/auth.controller.js';
import { EmployeeController } from './controllers/employee.controller.js';
import { authenticateJWT } from './middlewares/auth.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import type { IAuthRepository } from './repositories/auth.repository.js';
import type { IEmployeeRepository } from './repositories/employee.repository.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createEmployeeRouter } from './routes/employee.routes.js';

// Dependencias que la raíz de composición (index.ts) inyecta: repositorios concretos y la llave JWT.
export interface AppDependencies {
  employeeRepository: IEmployeeRepository;
  authRepository: IAuthRepository;
  jwtSecret: string;
}

// Construye la aplicación Express a partir de cualquier implementación de los repositorios.
export const createApp = ({ employeeRepository, authRepository, jwtSecret }: AppDependencies): Express => {
  const app = express();

  app.use(morgan('dev'));
  app.use(express.json());
  app.use(cors());

  // Registro ordenado de módulos independientes: autenticación (/api/v1/auth) y empleados (/api/v1/empleados).
  const authController = new AuthController(authRepository, jwtSecret);
  const employeeController = new EmployeeController(employeeRepository);
  app.use('/api/v1', createAuthRouter(authController));
  app.use('/api/v1', createEmployeeRouter(employeeController, authenticateJWT(jwtSecret)));

  // Siempre al final: rutas inexistentes y el interceptor global de errores.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
