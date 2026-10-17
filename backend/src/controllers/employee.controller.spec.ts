import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Request, Response } from 'express';
import type { Employee } from '../domain/employee.js';
import { NotFoundError } from '../errors/app-error.js';
import type { IEmployeeRepository } from '../repositories/employee.repository.js';
import { EmployeeController } from './employee.controller.js';

// Prueba unitaria del controlador (ISO/IEC 25010: Mantenibilidad > Capacidad de ser probado).
// El controlador depende de la abstracción IEmployeeRepository (Inversión de Dependencias), así que
// se le inyecta un doble de prueba: no se importa Mongoose ni se necesita Docker o MongoDB.
describe('Unit Test: EmployeeController (Mantenibilidad & Testabilidad)', () => {
  let controller: EmployeeController;
  let mockRepository: jest.Mocked<IEmployeeRepository>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const fakeEmployees: Employee[] = [
    { id: 'e-1', nombre: 'Andrés Mendoza', cargo: 'Arquitecto', departamento: 'TI', sueldo: 4000 }
  ];

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

  it('Debería retornar un estado 200 y la lista de empleados de la abstracción', async () => {
    // Comportamiento esperado de la abstracción
    mockRepository.findAll.mockResolvedValue(fakeEmployees);

    await controller.getAll(mockRequest as Request, mockResponse as Response);

    // Verificaciones del contrato. La API responde con el Response Wrapper, así que la lista va en data.
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true, statusCode: 200, data: fakeEmployees }));
    expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    expect(mockRepository.findPage).not.toHaveBeenCalled();
  });

  it('Debería usar la consulta paginada y calcular los metadatos cuando llegan page y limit', async () => {
    mockRepository.findPage.mockResolvedValue({ items: fakeEmployees, total: 21 });
    mockResponse.locals = { query: { page: 2, limit: 10 } } as unknown as Response['locals'];

    await controller.getAll(mockRequest as Request, mockResponse as Response);

    expect(mockRepository.findPage).toHaveBeenCalledWith(2, 10);
    expect(mockRepository.findAll).not.toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      data: fakeEmployees,
      meta: { page: 2, limit: 10, total: 21, totalPages: 3 }
    }));
  });

  it('Debería responder 201 con el empleado creado por la abstracción', async () => {
    const [nuevo] = fakeEmployees as [Employee];
    const { id: _id, ...datos } = nuevo;
    mockRepository.create.mockResolvedValue(nuevo);
    mockRequest = { body: datos };

    await controller.create(mockRequest as Request, mockResponse as Response);

    expect(mockRepository.create).toHaveBeenCalledWith(datos);
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 201, data: nuevo }));
  });

  it('Debería lanzar NotFoundError cuando la abstracción no encuentra el empleado', async () => {
    mockRepository.findById.mockResolvedValue(null);
    mockRequest = { params: { id: 'no-existe' } };

    // El controlador no responde el error: lo lanza y lo atiende el middleware global (error-handler).
    await expect(controller.getById(mockRequest as Request<{ id: string }>, mockResponse as Response))
      .rejects.toBeInstanceOf(NotFoundError);
    expect(statusMock).not.toHaveBeenCalled();
  });
});
