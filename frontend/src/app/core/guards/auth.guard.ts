import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Impide entrar directamente a /employees sin pasar por /auth: sin sesión vigente redirige al login
 * y recuerda la ruta pedida en returnUrl. En el servidor (SSR) deja pasar: allí no existe la sesión
 * (vive en localStorage) y la lista se carga solo en el navegador, donde el guard vuelve a decidir.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  if (inject(AuthService).isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/auth'], { queryParams: { returnUrl: state.url } });
};
