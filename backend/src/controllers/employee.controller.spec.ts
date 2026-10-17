import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Request, Response } from 'express';
import type { Employee } from '../domain/employee.js';
import { AppError, NotFoundError } from '../errors/app-error.js';
import type { IEmployeeRepository } from '../repositories/employee.repository.js';
import { EmployeeController } from './employee.controller.js';

// Prueba unitaria del controlador (ISO/IEC 25010: Mantenibilidad > Capacidad de ser probado).
// El controlador depende de la abstracción IEmployeeRepository (Inversión de Dependencias), así que
// se le inyecta un doble de prueba: no se importa Mongoose ni se necesita Docker o MongoDB.
// Cada método del controlador tiene 2 escenarios de éxito y 2 de error.
describe('Unit Test: EmployeeController (Mantenibilidad & Testabilidad)', () => {
  let controller: EmployeeController;
  let mockRepository: jest.Mocked<IEmployeeRepository>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const empleado: Employee = { id: 'e-1', nombre: 'Andrés Mendoza', cargo: 'Arquitecto', departamento: 'TI', sueldo: 4000 };
  const fakeEmployees: Employee[] = [
    empleado,
    { id: 'e-2', nombre: 'Lucía Paredes', cargo: 'QA', departamento: 'Calidad', sueldo: 2500 }
  ];
  const { id: _id, ...datosEmpleado } = empleado;
  const errorBase = new Error('Conexión con la base de datos perdida');

  // Ejecuta un método del controlador con los dobles de Express del escenario.
  const run = (method: keyof EmployeeController) =>
    (controller[method] as (req: Request, res: Response) => Promise<void>)(mockRequest as Request, mockResponse as Response);

  // Cuerpo enviado con res.status(...).json(...): el Response Wrapper del proyecto.
  const body = () => jsonMock.mock.calls[0]?.[0] as Record<string, unknown>;

  beforeEach(() => {
    // 1. Mock 100 % aislado de la interfaz: cero dependencia de Mongoose.
    mockRepository = {
      findAll: jest.fn<IEmployeeRepository['findAll']>(),
      findPage: jest.fn<IEmployeeRepository['findPage']>(),
      findById: jest.fn<IEmployeeRepository['findById']>(),
      create: jest.fn<IEmployeeRepository['create']>(),
      update: jest.fn<IEmployeeRepository['update']>(),
      delete: jest.fn<IEmployeeRepository['delete']>()
    };

    // Inyección por constructor: la misma vía que usa la raíz de composición (index.ts) con Mongo.
    controller = new EmployeeController(mockRepository);

    // 2. Objetos del ciclo de vida de Express. res.status() devuelve un objeto con json(), como en Express.
    // res.locals.query simula el query que deja validado el middleware de Zod (vacío = consulta completa).
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = { status: statusMock, locals: { query: {} } } as unknown as Partial<Response>;
    mockRequest = {};
  });

  describe('getAll (GET /empleados)', () => {
    it('Éxito: debería retornar un estado 200 y la lista de empleados de la abstracción', async () => {
      mockRepository.findAll.mockResolvedValue(fakeEmployees);

      await run('getAll');

      // La API responde con el Response Wrapper, así que la lista va en data.
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true, statusCode: 200, data: fakeEmployees }));
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockRepository.findPage).not.toHaveBeenCalled();
    });

    it('Éxito: debería usar la consulta paginada y calcular los metadatos cuando llegan page y limit', async () => {
      mockRepository.findPage.mockResolvedValue({ items: fakeEmployees, total: 21 });
      mockResponse.locals = { query: { page: 2, limit: 10 } } as unknown as Response['locals'];

      await run('getAll');

      expect(mockRepository.findPage).toHaveBeenCalledWith(2, 10);
      expect(mockRepository.findAll).not.toHaveBeenCalled();
      expect(body()).toMatchObject({ data: fakeEmployees, meta: { page: 2, limit: 10, total: 21, totalPages: 3 } });
    });

    it('Error: debería propagar la falla del repositorio en la consulta completa sin responder', async () => {
      mockRepository.findAll.mockRejectedValue(errorBase);

      // El error sube al middleware global (error-handler), que es el que responde 500.
      await expect(run('getAll')).rejects.toBe(errorBase);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('Error: debería propagar la falla del repositorio en la consulta paginada sin responder', async () => {
      mockRepository.findPage.mockRejectedValue(errorBase);
      mockResponse.locals = { query: { page: 1 } } as unknown as Response['locals'];

      await expect(run('getAll')).rejects.toBe(errorBase);
      expect(mockRepository.findPage).toHaveBeenCalledWith(1, 10);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('getById (GET /empleados/:id)', () => {
    it('Éxito: debería responder 200 con el empleado encontrado', async () => {
      mockRepository.findById.mockResolvedValue(empleado);
      mockRequest = { params: { id: 'e-1' } };

      await run('getById');

      expect(mockRepository.findById).toHaveBeenCalledWith('e-1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(body()).toMatchObject({ data: empleado });
    });

    it('Éxito: debería responder con el Response Wrapper completo', async () => {
      mockRepository.findById.mockResolvedValue(empleado);
      mockRequest = { params: { id: 'e-1' } };

      await run('getById');

      expect(body()).toEqual({
        success: true,
        statusCode: 200,
        message: 'Empleado encontrado',
        data: empleado,
        error: null,
        timestamp: expect.any(String)
      });
    });

    it('Error: debería lanzar NotFoundError (404) cuando la abstracción no encuentra el empleado', async () => {
      mockRepository.findById.mockResolvedValue(null);
      mockRequest = { params: { id: 'no-existe' } };

      // El controlador no responde el error: lo lanza y lo atiende el middleware global.
      await expect(run('getById')).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('Error: debería propagar la falla del repositorio', async () => {
      mockRepository.findById.mockRejectedValue(errorBase);
      mockRequest = { params: { id: 'e-1' } };

      await expect(run('getById')).rejects.toBe(errorBase);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('create (POST /empleados)', () => {
    it('Éxito: debería responder 201 con el empleado creado por la abstracción', async () => {
      mockRepository.create.mockResolvedValue(empleado);
      mockRequest = { body: datosEmpleado };

      await run('create');

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(body()).toMatchObject({ statusCode: 201, message: 'Empleado creado correctamente', data: empleado });
    });

    it('Éxito: debería delegar el body validado una sola vez y sin usar otros métodos del repositorio', async () => {
      mockRepository.create.mockResolvedValue(empleado);
      mockRequest = { body: datosEmpleado };

      await run('create');

      expect(mockRepository.create).toHaveBeenCalledTimes(1);
      expect(mockRepository.create).toHaveBeenCalledWith(datosEmpleado);
      expect(mockRepository.update).not.toHaveBeenCalled();
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('Error: debería propagar la falla de conexión del repositorio sin responder', async () => {
      mockRepository.create.mockRejectedValue(errorBase);
      mockRequest = { body: datosEmpleado };

      await expect(run('create')).rejects.toBe(errorBase);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('Error: debería propagar intacto un AppError de la persistencia (p. ej. 409 por duplicado)', async () => {
      const conflicto = new AppError(409, 'CONFLICT', 'El empleado ya existe');
      mockRepository.create.mockRejectedValue(conflicto);
      mockRequest = { body: datosEmpleado };

      // El middleware global usa statusCode y code del AppError para responder.
      await expect(run('create')).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('replace (PUT /empleados/:id)', () => {
    const reemplazo = { ...datosEmpleado, cargo: 'Líder Técnico', sueldo: 4800 };

    it('Éxito: debería responder 200 con el empleado reemplazado', async () => {
      mockRepository.update.mockResolvedValue({ id: 'e-1', ...reemplazo });
      mockRequest = { params: { id: 'e-1' }, body: reemplazo };

      await run('replace');

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(body()).toMatchObject({ message: 'Empleado actualizado correctamente', data: { id: 'e-1', ...reemplazo } });
    });

    it('Éxito: debería enviar al repositorio el id y todos los campos del body', async () => {
      mockRepository.update.mockResolvedValue({ id: 'e-1', ...reemplazo });
      mockRequest = { params: { id: 'e-1' }, body: reemplazo };

      await run('replace');

      expect(mockRepository.update).toHaveBeenCalledWith('e-1', reemplazo);
    });

    it('Error: debería lanzar NotFoundError cuando el empleado no existe', async () => {
      mockRepository.update.mockResolvedValue(null);
      mockRequest = { params: { id: 'no-existe' }, body: reemplazo };

      await expect(run('replace')).rejects.toBeInstanceOf(NotFoundError);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('Error: debería propagar la falla del repositorio', async () => {
      mockRepository.update.mockRejectedValue(errorBase);
      mockRequest = { params: { id: 'e-1' }, body: reemplazo };

      await expect(run('replace')).rejects.toBe(errorBase);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('update (PATCH /empleados/:id)', () => {
    const cambio = { sueldo: 4500 };

    it('Éxito: debería responder 200 con el empleado actualizado parcialmente', async () => {
      mockRepository.update.mockResolvedValue({ ...empleado, ...cambio });
      mockRequest = { params: { id: 'e-1' }, body: cambio };

      await run('update');

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(body()).toMatchObject({ data: { ...empleado, sueldo: 4500 } });
    });

    it('Éxito: debería enviar al repositorio solo los campos recibidos', async () => {
      mockRepository.update.mockResolvedValue({ ...empleado, ...cambio });
      mockRequest = { params: { id: 'e-1' }, body: cambio };

      await run('update');

      expect(mockRepository.update).toHaveBeenCalledWith('e-1', { sueldo: 4500 });
    });

    it('Error: debería lanzar NotFoundError cuando el empleado no existe', async () => {
      mockRepository.update.mockResolvedValue(null);
      mockRequest = { params: { id: 'no-existe' }, body: cambio };

      await expect(run('update')).rejects.toBeInstanceOf(NotFoundError);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('Error: debería propagar la falla del repositorio', async () => {
      mockRepository.update.mockRejectedValue(errorBase);
      mockRequest = { params: { id: 'e-1' }, body: cambio };

      await expect(run('update')).rejects.toBe(errorBase);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('delete (DELETE /empleados/:id)', () => {
    it('Éxito: debería responder 200 con el id eliminado', async () => {
      mockRepository.delete.mockResolvedValue(true);
      mockRequest = { params: { id: 'e-1' } };

      await run('delete');

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(body()).toMatchObject({ message: 'Empleado eliminado correctamente', data: { id: 'e-1' } });
    });

    it('Éxito: debería pedir la eliminación una sola vez con el id de la ruta', async () => {
      mockRepository.delete.mockResolvedValue(true);
      mockRequest = { params: { id: 'e-2' } };

      await run('delete');

      expect(mockRepository.delete).toHaveBeenCalledTimes(1);
      expect(mockRepository.delete).toHaveBeenCalledWith('e-2');
    });

    it('Error: debería lanzar NotFoundError cuando el empleado no existe', async () => {
      mockRepository.delete.mockResolvedValue(false);
      mockRequest = { params: { id: 'no-existe' } };

      await expect(run('delete')).rejects.toBeInstanceOf(NotFoundError);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('Error: debería propagar la falla del repositorio', async () => {
      mockRepository.delete.mockRejectedValue(errorBase);
      mockRequest = { params: { id: 'e-1' } };

      await expect(run('delete')).rejects.toBe(errorBase);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });
});
