// Entidad de dominio: credenciales de un usuario sin depender de ningún motor de base de datos.
// La contraseña nunca se guarda en claro: solo su hash bcrypt.
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  rol: string;
}

// Datos para registrar un usuario (el id lo asigna la persistencia).
export type CreateUserData = Omit<User, 'id'>;
