import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { User } from '../domain/user.js';
import { AppError } from '../errors/app-error.js';
import type { IAuthRepository } from '../repositories/auth.repository.js';
import { AuthController } from './auth.controller.js';

// Prueba unitaria del controlador de autenticación (ISO/IEC 25010: Seguridad > Autenticidad).
// El repositorio es un doble de IAuthRepository: no se importa Mongoose ni hace falta MongoDB.
describe('Unit Test: AuthController (Seguridad & Testabilidad)', () => {
  const SECRET = 'llave-de-prueba-solo-para-jest';
  let user: User;
  let controller: AuthController;
  let mockRepository: jest.Mocked<IAuthRepository>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const login = (email: string, password: string) =>
    controller.login({ body: { email, password } } as Request<object, unknown, { email: string; password: string }>, mockResponse as Response);
  const body = () => jsonMock.mock.calls[0]?.[0] as { success: boolean; data: { token: string; user: Record<string, unknown> } };

  beforeAll(async () => {
    // Costo bajo solo en la prueba, para que corra rápido; el script real usa 12.
    user = { id: 'u-1', email: 'admin@empresa.com', passwordHash: await bcrypt.hash('secreto123', 4), rol: 'admin' };
  });

  beforeEach(() => {
    mockRepository = { findByEmail: jest.fn<IAuthRepository['findByEmail']>(), createUser: jest.fn<IAuthRepository['createUser']>() };
    controller = new AuthController(mockRepository, SECRET);
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = { status: statusMock } as unknown as Partial<Response>;
  });

  it('Éxito: con credenciales correctas responde 200 con un JWT firmado (id y rol, 2 horas)', async () => {
    mockRepository.findByEmail.mockResolvedValue(user);

    await login('admin@empresa.com', 'secreto123');

    expect(statusMock).toHaveBeenCalledWith(200);
    const { token, user: datos } = body().data;
    const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    expect(payload).toMatchObject({ id: 'u-1', rol: 'admin' });
    expect(payload.exp! - payload.iat!).toBe(2 * 60 * 60);
    expect(datos).toEqual({ email: 'admin@empresa.com', rol: 'admin' });
  });

  it('Éxito: la respuesta no expone el hash de la contraseña', async () => {
    mockRepository.findByEmail.mockResolvedValue(user);

    await login('admin@empresa.com', 'secreto123');

    expect(JSON.stringify(body())).not.toContain(user.passwordHash);
  });

  it('Error: con un correo no registrado lanza 401 AUTH_FAILED y no responde por su cuenta', async () => {
    mockRepository.findByEmail.mockResolvedValue(null);

    await expect(login('nadie@empresa.com', 'secreto123')).rejects.toMatchObject({ statusCode: 401, code: 'AUTH_FAILED' });
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('Error: con una contraseña incorrecta lanza 401 AUTH_FAILED', async () => {
    mockRepository.findByEmail.mockResolvedValue(user);

    await expect(login('admin@empresa.com', 'otra-clave')).rejects.toBeInstanceOf(AppError);
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('Seguridad: el mensaje es idéntico para correo inexistente y contraseña incorrecta (no revela cuentas)', async () => {
    mockRepository.findByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce(user);

    const sinCuenta = await login('nadie@empresa.com', 'secreto123').catch((e: AppError) => e.message);
    const claveMala = await login('admin@empresa.com', 'otra-clave').catch((e: AppError) => e.message);

    expect(sinCuenta).toBe(claveMala);
  });

  it('Error: una falla del repositorio se propaga al middleware global de errores', async () => {
    mockRepository.findByEmail.mockRejectedValue(new Error('Conexión con la base de datos perdida'));

    await expect(login('admin@empresa.com', 'secreto123')).rejects.toThrow('Conexión con la base de datos perdida');
    expect(statusMock).not.toHaveBeenCalled();
  });
});
