import { Router } from 'express';
import type { EmployeeController } from '../controllers/employee.controller.js';
import { CreateEmployeeSchema, EmployeeIdParamsSchema, ListEmployeesQuerySchema, UpdateEmployeeSchema } from '../dto/employee.dto.js';
import { validate } from '../middlewares/validate.js';

export const createEmployeeRouter = (controller: EmployeeController): Router => {
  const router = Router();

  router.get('/empleados', validate({ query: ListEmployeesQuerySchema }), controller.getAll);
  router.get('/empleados/:id', validate({ params: EmployeeIdParamsSchema }), controller.getById);
  router.post('/empleados', validate({ body: CreateEmployeeSchema }), controller.create);
  router.put('/empleados/:id', validate({ params: EmployeeIdParamsSchema, body: CreateEmployeeSchema }), controller.replace);
  router.patch('/empleados/:id', validate({ params: EmployeeIdParamsSchema, body: UpdateEmployeeSchema }), controller.update);
  router.delete('/empleados/:id', validate({ params: EmployeeIdParamsSchema }), controller.delete);

  return router;
};
