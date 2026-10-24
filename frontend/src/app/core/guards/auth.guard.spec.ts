import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ACCESS_TOKEN_KEY } from '../services/auth.service';
import { fakeJwt } from '../testing/jwt';
import { authGuard } from './auth.guard';

describe('authGuard (no se entra a /employees sin pasar por /auth)', () => {
  const run = () => TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, { url: '/employees' } as RouterStateSnapshot));

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule] });
  });

  afterEach(() => localStorage.clear());

  it('sin sesión redirige a /auth y recuerda la ruta pedida', () => {
    const result = run() as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/auth?returnUrl=%2Femployees');
  });

  it('con un token vencido también redirige al login', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, fakeJwt(-60));
    expect(run() instanceof UrlTree).toBeTrue();
  });

  it('con una sesión vigente deja pasar', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, fakeJwt(7200));
    expect(run()).toBeTrue();
  });
});
