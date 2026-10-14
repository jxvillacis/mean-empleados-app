// Entidad de dominio: describe un empleado sin depender de ningún motor de base de datos.
export interface Employee {
  id: string;
  nombre: string;
  cargo: string;
  departamento: string;
  sueldo: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Datos que se reciben para crear un empleado (el id y las fechas los asigna la persistencia).
export type CreateEmployeeData = Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>;

// Actualización parcial o total: cualquier subconjunto de los campos editables.
export type UpdateEmployeeData = Partial<CreateEmployeeData>;
