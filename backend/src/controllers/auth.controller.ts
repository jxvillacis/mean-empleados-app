import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { LoginDto } from '../dto/auth.dto.js';
import { AppError } from '../errors/app-error.js';
import { sendSuccess } from '../http/api-response.js';
import type { IAuthRepository } from '../repositories/auth.repository.js';

// Hash bcrypt de una contraseña que nadie conoce. Si el correo no existe se compara contra él, para que la
// respuesta tarde lo mismo que con un correo registrado y no revele qué correos existen. Usa el mismo costo (12)
// que el script crear-usuario: con otro costo, el tiempo de respuesta delataría la diferencia.
export const BCRYPT_COST = 12;
const DUMMY_HASH = bcrypt.hashSync('contraseña-inexistente-para-igualar-tiempos', BCRYPT_COST);

// Capa HTTP de autenticación: recibe credenciales ya validadas por Zod, las verifica contra el repositorio
// y emite el JWT de sesión con el Response Wrapper. Los errores se lanzan al middleware global.
export class AuthController {
  constructor(
    private readonly repository: IAuthRepository,
    private readonly jwtSecret: string
  ) {}

  login = async (req: Request<object, unknown, LoginDto>, res: Response): Promise<void> => {
    const { email, password } = req.body;

    // 1. Identidad y 2. hash de la contraseña. El mensaje es el mismo si falla cualquiera de los dos:
    // decir "usuario no registrado" permitiría averiguar qué correos tienen cuenta.
    const user = await this.repository.findByEmail(email);
    const isMatch = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !isMatch) {
      throw new AppError(401, 'AUTH_FAILED', 'Credenciales inválidas: correo o contraseña incorrectos');
    }

    // 3. Firma del JWT de sesión (HS256, expira en 2 horas). Solo lleva el id y el rol, nunca datos sensibles.
    const token = jwt.sign({ id: user.id, rol: user.rol }, this.jwtSecret, { algorithm: 'HS256', expiresIn: '2h' });

    // 4. Salida con la envoltura estándar.
    sendSuccess(res, { token, user: { email: user.email, rol: user.rol } }, 'Inicio de sesión exitoso');
  };
}
