// src/config/database.ts
import mongoose from 'mongoose';

// La cadena de conexión se toma de la variable de entorno MONGO_URI;
// si no existe, se usa la base local del laboratorio.
const MONGO_URI = process.env['MONGO_URI'] ?? 'mongodb://127.0.0.1/usuarios_db';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🔄 [Database]: Conexión exitosa a MongoDB');
  } catch (error) {
    // Sin base de datos la API no puede operar: se detiene el proceso.
    console.error('❌ Error crítico al conectar a la base de datos:', error);
    process.exit(1);
  }
};
