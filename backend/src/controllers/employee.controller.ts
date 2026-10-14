import type { Request, Response } from 'express';
import type { CreateEmployeeDto, ListEmployeesQueryDto, UpdateEmployeeDto } from '../dto/employee.dto.js';
import { NotFoundError } from '../errors/app-error.js';
import { sendSuccess } from '../http/api-response.js';
import type { IEmployeeRepository } from '../repositories/employee.repository.js';

type IdParams = { id: string };

// Capa HTTP: recibe datos ya validados por Zod, delega en el repositorio y responde
// con el Response Wrapper. Los errores se lanzan y los atiende el middleware global.
export class EmployeeController {
  constructor(private readonly repository: IEmployeeRepository) {}

  // Consulta completa (sin parámetros) o paginada (?page=&limit=), según el query validado.
  getAll = async (_req: Request, res: Response): Promise<void> => {
    const { page, limit } = res.locals['query'] as ListEmployeesQueryDto;

    if (page === undefined && limit === undefined) {
      const employees = await this.repository.findAll();
      sendSuccess(res, employees, 'Empleados obtenidos correctamente');
      return;
    }

    const currentPage = page ?? 1;
    const pageSize = limit ?? 10;
    const { items, total } = await this.repository.findPage(currentPage, pageSize);
    sendSuccess(res, items, 'Empleados obtenidos correctamente', 200, {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    });
  };

  getById = async (req: Request<IdParams>, res: Response): Promise<void> => {
    const employee = await this.repository.findById(req.params.id);
    if (!employee) throw new NotFoundError(`No existe un empleado con id ${req.params.id}`);
    sendSuccess(res, employee, 'Empleado encontrado');
  };

  create = async (req: Request<object, unknown, CreateEmployeeDto>, res: Response): Promise<void> => {
    const employee = await this.repository.create(req.body);
    sendSuccess(res, employee, 'Empleado creado correctamente', 201);
  };

  // PUT: reemplazo total (el body trae todos los campos).
  replace = async (req: Request<IdParams, unknown, CreateEmployeeDto>, res: Response): Promise<void> => {
    const employee = await this.repository.update(req.params.id, req.body);
    if (!employee) throw new NotFoundError(`No existe un empleado con id ${req.params.id}`);
    sendSuccess(res, employee, 'Empleado actualizado correctamente');
  };

  // PATCH: actualización parcial (al menos un campo).
  update = async (req: Request<IdParams, unknown, UpdateEmployeeDto>, res: Response): Promise<void> => {
    const employee = await this.repository.update(req.params.id, req.body);
    if (!employee) throw new NotFoundError(`No existe un empleado con id ${req.params.id}`);
    sendSuccess(res, employee, 'Empleado actualizado correctamente');
  };

  delete = async (req: Request<IdParams>, res: Response): Promise<void> => {
    const deleted = await this.repository.delete(req.params.id);
    if (!deleted) throw new NotFoundError(`No existe un empleado con id ${req.params.id}`);
    sendSuccess(res, { id: req.params.id }, 'Empleado eliminado correctamente');
  };
}
