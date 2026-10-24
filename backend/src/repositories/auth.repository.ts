import type { CreateUserData, User } from '../domain/user.js';

// Contrato de persistencia de credenciales. El controlador de autenticación depende de esta
// abstracción, nunca de Mongoose: así se puede probar con un doble y cambiar el motor de datos.
export interface IAuthRepository {
  findByEmail(email: string): Promise<User | null>;
  createUser(data: CreateUserData): Promise<User>;
}
