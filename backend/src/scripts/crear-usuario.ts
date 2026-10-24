import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { BCRYPT_COST } from '../controllers/auth.controller.js';
import { LoginSchema } from '../dto/auth.dto.js';
import { MongoAuthRepository } from '../infrastructure/mongo/mongo-auth.repository.js';

// Crea un usuario con la contraseña cifrada con bcrypt (no hay endpoint público de registro).
// Uso: npm run crear-usuario -- <email> <contraseña> [rol]   (rol por defecto: alumno)
const [email, password, rol = 'alumno'] = process.argv.slice(2);

const main = async (): Promise<void> => {
  // Las mismas reglas que el login: un usuario que no podría iniciar sesión no se crea.
  const credenciales = LoginSchema.parse({ email, password });

  await connectDatabase();
  const repository = new MongoAuthRepository();
  if (await repository.findByEmail(credenciales.email)) {
    console.log(`Ya existe un usuario con el correo ${credenciales.email}`);
    return;
  }

  // Costo 12: cada intento de adivinar la contraseña cuesta unos cientos de milisegundos.
  const passwordHash = await bcrypt.hash(credenciales.password, BCRYPT_COST);
  const user = await repository.createUser({ email: credenciales.email, passwordHash, rol });
  console.log(`Usuario creado: ${user.email} (rol ${user.rol}, id ${user.id})`);
};

main()
  .catch(error => { console.error('No se pudo crear el usuario:', error.issues ?? error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
