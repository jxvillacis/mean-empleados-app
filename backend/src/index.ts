import 'dotenv/config'; // Primero: carga .env antes de que cualquier módulo lea process.env
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { MongoEmployeeRepository } from './infrastructure/mongo/mongo-employee.repository.js';

// Raíz de composición: el único lugar que decide qué implementación concreta se usa.
const port = Number(process.env.PORT) || 3000;

// Sin llave no hay seguridad: el servidor no arranca con una llave por defecto escrita en el código.
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('Falta JWT_SECRET en el entorno (ver backend/.env.example)');
}

const main = async (): Promise<void> => {
  await connectDatabase();

  const employeeRepository = new MongoEmployeeRepository();
  const app = createApp(employeeRepository, jwtSecret);

  app.listen(port, () => {
    console.log('Servidor escuchando en el puerto ' + port);
  });
};

main();
