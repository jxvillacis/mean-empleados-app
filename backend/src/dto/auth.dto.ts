import { z } from 'zod';

// req.body del login: blinda la petición antes de que llegue al controlador.
// strictObject rechaza campos extra (p. ej. rol): el cliente no puede elegir sus permisos.
export const LoginSchema = z.strictObject({
  email: z.string({ error: 'El correo electrónico es obligatorio' })
    .trim()
    .toLowerCase()
    .pipe(z.email('El formato del correo electrónico proporcionado no es válido')),
  password: z.string({ error: 'La contraseña es obligatoria' })
    .min(6, 'La credencial de acceso debe poseer una longitud mínima de 6 caracteres')
    .max(72, 'La contraseña no puede superar 72 caracteres') // bcrypt solo usa los primeros 72 bytes
}, {
  error: (issue: { code?: string; keys?: string[] }) =>
    issue.code === 'unrecognized_keys'
      ? `Campos no permitidos: ${(issue.keys ?? []).join(', ')}`
      : 'El cuerpo de la petición debe ser un objeto JSON con email y password'
});

export type LoginDto = z.infer<typeof LoginSchema>;
