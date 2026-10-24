import type { CreateUserData, User } from '../../domain/user.js';
import type { IAuthRepository } from '../../repositories/auth.repository.js';
import { UserModel, type UserRecord } from './user.model.js';

// Traduce el documento de MongoDB a la entidad de dominio (oculta _id y el nombre del campo en la base).
const toUser = (doc: UserRecord): User => ({
  id: doc._id.toString(),
  email: doc.email,
  passwordHash: doc.password,
  rol: doc.rol
});

// Implementación concreta del repositorio de credenciales con Mongoose.
export class MongoAuthRepository implements IAuthRepository {
  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.trim().toLowerCase() }).lean<UserRecord>();
    return doc ? toUser(doc) : null;
  }

  async createUser(data: CreateUserData): Promise<User> {
    const doc = await UserModel.create({ email: data.email, password: data.passwordHash, rol: data.rol });
    return toUser(doc.toObject());
  }
}
