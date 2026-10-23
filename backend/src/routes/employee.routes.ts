import { type RequestHandler, Router } from 'express';
import type { EmployeeController } from '../controllers/employee.controller.js';
import { CreateEmployeeSchema, EmployeeIdParamsSchema, ListEmployeesQuerySchema, UpdateEmployeeSchema } from '../dto/employee.dto.js';
import { validate } from '../middlewares/validate.js';

// La lectura queda abierta para la rejilla; toda operación que escribe exige JWT (authenticate va antes de
// validar el body: una petición sin token no llega a procesar datos).
export const createEmployeeRouter = (controller: EmployeeController, authenticate: RequestHandler): Router => {
  const router = Router();

  router.get('/empleados', validate({ query: ListEmployeesQuerySchema }), controller.getAll);
  router.get('/empleados/:id', validate({ params: EmployeeIdParamsSchema }), controller.getById);
  router.post('/empleados', authenticate, validate({ body: CreateEmployeeSchema }), controller.create);
  router.put('/empleados/:id', authenticate, validate({ params: EmployeeIdParamsSchema, body: CreateEmployeeSchema }), controller.replace);
  router.patch('/empleados/:id', authenticate, validate({ params: EmployeeIdParamsSchema, body: UpdateEmployeeSchema }), controller.update);
  router.delete('/empleados/:id', authenticate, validate({ params: EmployeeIdParamsSchema }), controller.delete);

  return router;
};
