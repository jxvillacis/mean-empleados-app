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
  // Orígenes que pueden llamar a la API desde el navegador (p. ej. el frontend en Azure). Vacío = cualquiera (desarrollo).
  corsOrigins?: string[];
}

// Construye la aplicación Express a partir de cualquier implementación de los repositorios.
export const createApp = ({ employeeRepository, authRepository, jwtSecret, corsOrigins = [] }: AppDependencies): Express => {
  const app = express();

  // Detrás de Nginx: la IP real del cliente llega en X-Forwarded-For (se confía solo en el proxy inmediato).
  app.set('trust proxy', 1);
  app.use(morgan(':remote-addr :method :url :status :response-time ms'));
  app.use(express.json());
  app.use(cors(corsOrigins.length ? { origin: corsOrigins } : undefined));

  // Estado del servicio en la raíz: lo que se ve al abrir http://<IP> detrás de Nginx.
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      statusCode: 200,
      message: 'API de empleados en línea v2',
      data: { entorno: process.env.NODE_ENV ?? 'development', instancia: process.env.NODE_APP_INSTANCE ?? '0' },
      timestamp: new Date().toISOString()
    });
  });

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
