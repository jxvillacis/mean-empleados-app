import express, { type Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { EmployeeController } from './controllers/employee.controller.js';
import { authenticateJWT } from './middlewares/auth.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import type { IEmployeeRepository } from './repositories/employee.repository.js';
import { createEmployeeRouter } from './routes/employee.routes.js';

// Construye la aplicación Express a partir de cualquier implementación del repositorio y de la llave JWT.
export const createApp = (employeeRepository: IEmployeeRepository, jwtSecret: string): Express => {
  const app = express();

  app.use(morgan('dev'));
  app.use(express.json());
  app.use(cors());

  const employeeController = new EmployeeController(employeeRepository);
  app.use('/api/v1', createEmployeeRouter(employeeController, authenticateJWT(jwtSecret)));

  // Siempre al final: rutas inexistentes y el interceptor global de errores.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
