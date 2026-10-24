import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { fakeJwt } from '../testing/jwt';
import { ACCESS_TOKEN_KEY, AuthService, SessionUser } from './auth.service';

describe('AuthService (sesión reactiva)', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const loginUrl = `${environment.apiUrl}/auth/login`;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('login exitoso: guarda el token, emite el usuario y queda autenticado', () => {
    const token = fakeJwt(7200);
    let emitido: SessionUser | null = null;
    service.currentUser$.subscribe(u => (emitido = u));

    service.login({ email: 'admin@empleados.local', password: 'secreto123' }).subscribe();
    const req = http.expectOne(loginUrl);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, statusCode: 200, message: 'ok', data: { token, user: { email: 'admin@empleados.local', rol: 'admin' } }, error: null, timestamp: '' });

    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe(token);
    expect(emitido as SessionUser | null).toEqual({ email: 'admin@empleados.local', rol: 'admin' });
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('login fallido: propaga el mensaje del backend y no guarda nada', () => {
    let mensaje = '';
    service.login({ email: 'admin@empleados.local', password: 'mala' }).subscribe({ error: (e: Error) => (mensaje = e.message) });
    http.expectOne(loginUrl).flush(
      { success: false, statusCode: 401, message: 'Credenciales inválidas: correo o contraseña incorrectos', data: null, error: { code: 'AUTH_FAILED' }, timestamp: '' },
      { status: 401, statusText: 'Unauthorized' });

    expect(mensaje).toBe('Credenciales inválidas: correo o contraseña incorrectos');
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('un token vencido no cuenta como sesión', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, fakeJwt(-60));
    expect(service.getToken()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('logout borra el token y emite null', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, fakeJwt(7200));
    let emitido: SessionUser | null | undefined;
    service.currentUser$.subscribe(u => (emitido = u));

    service.logout();

    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(emitido).toBeNull();
  });
});
