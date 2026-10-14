import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { MongoEmployeeRepository } from './infrastructure/mongo/mongo-employee.repository.js';

// Raíz de composición: el único lugar que decide qué implementación concreta se usa.
const port = 3000;

const main = async (): Promise<void> => {
  await connectDatabase();

  const employeeRepository = new MongoEmployeeRepository();
  const app = createApp(employeeRepository);

  app.listen(port, () => {
    console.log('Servidor escuchando en el puerto ' + port);
  });
};

main();
