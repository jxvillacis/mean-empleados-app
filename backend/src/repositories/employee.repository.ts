import type { CreateEmployeeData, Employee, UpdateEmployeeData } from '../domain/employee.js';

// Contrato de persistencia. Los controladores dependen de esta abstracción,
// nunca de una implementación concreta (Mongoose, SQL, memoria, etc.).
// Resultado de una consulta paginada: la página pedida y el total de registros.
export interface Page<T> {
  items: T[];
  total: number;
}

export interface IEmployeeRepository {
  findAll(): Promise<Employee[]>;
  findPage(page: number, limit: number): Promise<Page<Employee>>;
  findById(id: string): Promise<Employee | null>;
  create(data: CreateEmployeeData): Promise<Employee>;
  update(id: string, data: UpdateEmployeeData): Promise<Employee | null>;
  delete(id: string): Promise<boolean>;
}
