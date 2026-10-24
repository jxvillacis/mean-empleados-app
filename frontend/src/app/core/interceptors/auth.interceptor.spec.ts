import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { ACCESS_TOKEN_KEY } from '../services/auth.service';
import { fakeJwt } from '../testing/jwt';
import { AuthInterceptor } from './auth.interceptor';

describe('AuthInterceptor (token centralizado)', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/empleados`;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  it('agrega Authorization: Bearer a las peticiones hacia la API', () => {
    const token = fakeJwt(7200);
    localStorage.setItem(ACCESS_TOKEN_KEY, token);

    http.post(api, {}).subscribe();

    expect(backend.expectOne(api).request.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('no envía el token a otros dominios', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, fakeJwt(7200));

    http.get('https://otro-sitio.example/datos').subscribe();

    expect(backend.expectOne('https://otro-sitio.example/datos').request.headers.has('Authorization')).toBeFalse();
  });

  it('no envía un token vencido', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, fakeJwt(-60));

    http.post(api, {}).subscribe();

    expect(backend.expectOne(api).request.headers.has('Authorization')).toBeFalse();
  });

  it('si la API rechaza el token (403), cierra la sesión y vuelve al login', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, fakeJwt(7200));
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    http.post(api, {}).subscribe({ error: () => undefined });
    backend.expectOne(api).flush({ success: false }, { status: 403, statusText: 'Forbidden' });

    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/auth'], jasmine.objectContaining({ queryParams: jasmine.any(Object) }));
  });
});
