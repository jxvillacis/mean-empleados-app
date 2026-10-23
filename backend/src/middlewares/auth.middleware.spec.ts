import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateJWT, type IAuthRequest } from './auth.middleware.js';

// Prueba unitaria del interceptor JWT (ISO/IEC 25010: Seguridad > Confidencialidad y Autenticidad).
// Los tokens se firman en la prueba con una llave de prueba: no hace falta el servidor ni la base de datos.
describe('Unit Test: authenticateJWT (Seguridad)', () => {
  const SECRET = 'llave-de-prueba-solo-para-jest';
  const middleware = authenticateJWT(SECRET);

  let mockRequest: Partial<IAuthRequest>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let setHeaderMock: jest.Mock;
  let next: jest.Mock;

  const run = (authorization?: string) => {
    mockRequest = { headers: authorization === undefined ? {} : { authorization } };
    middleware(mockRequest as IAuthRequest, mockResponse as Response, next as unknown as NextFunction);
  };
  const body = () => jsonMock.mock.calls[0]?.[0] as { success: boolean; error: { code: string } };

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    setHeaderMock = jest.fn();
    mockResponse = { status: statusMock, setHeader: setHeaderMock } as unknown as Partial<Response>;
    next = jest.fn();
  });

  it('Éxito: con un token válido deja el usuario en req.user y continúa', () => {
    run(`Bearer ${jwt.sign({ id: 'u-1', rol: 'admin' }, SECRET, { expiresIn: '2h' })}`);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockRequest.user).toEqual({ id: 'u-1', rol: 'admin' });
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('Error: sin cabecera Authorization responde 401 con WWW-Authenticate', () => {
    run();

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(setHeaderMock).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer');
    expect(body()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    expect(next).not.toHaveBeenCalled();
  });

  it('Error: un esquema distinto de Bearer responde 401', () => {
    run('Basic dXN1YXJpbzpjbGF2ZQ==');

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('Error: un token firmado con otra llave responde 403', () => {
    run(`Bearer ${jwt.sign({ id: 'u-1', rol: 'admin' }, 'otra-llave')}`);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(body()).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
    expect(next).not.toHaveBeenCalled();
  });

  it('Error: un token vencido responde 403', () => {
    const vencido = jwt.sign({ id: 'u-1', rol: 'admin', exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
    run(`Bearer ${vencido}`);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('Error: un token sin firma (alg "none") responde 403', () => {
    const sinFirma = jwt.sign({ id: 'u-1', rol: 'admin' }, '', { algorithm: 'none' });
    run(`Bearer ${sinFirma}`);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('Error: un token válido sin rol en el payload responde 403', () => {
    run(`Bearer ${jwt.sign({ id: 'u-1' }, SECRET)}`);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
