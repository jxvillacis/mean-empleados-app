import { z } from 'zod';

// Texto obligatorio, sin espacios sobrantes y con longitud acotada.
const requiredText = (field: string, max: number) =>
  z.string({ error: `${field} es obligatorio y debe ser texto` })
    .trim()
    .min(2, `${field} debe tener al menos 2 caracteres`)
    .max(max, `${field} no puede superar ${max} caracteres`);

// Mensajes para el objeto completo: body ausente/no-objeto o campos no permitidos.
const objectErrors = {
  error: (issue: { code?: string; keys?: string[] }) =>
    issue.code === 'unrecognized_keys'
      ? `Campos no permitidos: ${(issue.keys ?? []).join(', ')}`
      : 'El cuerpo de la petición debe ser un objeto JSON'
};

// req.params: identificador único del empleado.
export const EmployeeIdParamsSchema = z.object({
  id: z.string().trim().regex(/^[A-Za-z0-9_-]{1,64}$/, 'El id tiene un formato inválido')
});

// req.body para crear (POST) o reemplazar (PUT): todos los campos son obligatorios.
// strictObject rechaza campos extra (p. ej. _id, createdAt) y evita la asignación masiva.
export const CreateEmployeeSchema = z.strictObject({
  nombre: requiredText('El nombre', 100),
  cargo: requiredText('El cargo', 80),
  departamento: requiredText('El departamento', 80),
  sueldo: z.number({ error: 'El sueldo es obligatorio y debe ser numérico' })
    .positive('El sueldo debe ser mayor que 0')
    .max(100000, 'El sueldo no puede superar 100000')
}, objectErrors);

// req.body para actualizar parcialmente (PATCH): campos opcionales, pero al menos uno.
export const UpdateEmployeeSchema = CreateEmployeeSchema.partial()
  .refine(data => Object.keys(data).length > 0, { error: 'Debe enviar al menos un campo para actualizar' });

// req.query para la consulta paginada (GET /empleados?page=1&limit=10).
// Sin page ni limit la consulta es completa. coerce convierte "2" (texto de la URL) en 2.
export const ListEmployeesQuerySchema = z.strictObject({
  page: z.coerce.number().int('page debe ser un entero').min(1, 'page debe ser mayor o igual a 1').optional(),
  limit: z.coerce.number().int('limit debe ser un entero').min(1, 'limit debe ser mayor o igual a 1')
    .max(100, 'limit no puede superar 100').optional()
}, { error: issue => issue.code === 'unrecognized_keys' ? `Parámetros no permitidos: ${issue.keys.join(', ')}` : undefined });

export type CreateEmployeeDto = z.infer<typeof CreateEmployeeSchema>;
export type ListEmployeesQueryDto = z.infer<typeof ListEmployeesQuerySchema>;
export type UpdateEmployeeDto = Partial<CreateEmployeeDto>;
