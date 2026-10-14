// Empleado tal como lo devuelve la API.
export interface Empleado {
  id: string;
  nombre: string;
  cargo: string;
  departamento: string;
  sueldo: number;
  createdAt?: string;
  updatedAt?: string;
}

// Datos editables que se envían para crear o actualizar un empleado.
export type EmpleadoPayload = Pick<Empleado, 'nombre' | 'cargo' | 'departamento' | 'sueldo'>;
