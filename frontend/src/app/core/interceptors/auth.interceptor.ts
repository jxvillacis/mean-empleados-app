import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Clave donde se guarda el JWT de la sesión (la misma que usará el servicio de autenticación al hacer login).
export const ACCESS_TOKEN_KEY = 'access_token';

/**
 * Interceptor global de la tubería HTTP: agrega `Authorization: Bearer <token>` a cada petición hacia la API.
 * Los componentes y servicios no manejan el token: queda centralizado aquí, sin contaminar la vista.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Con SSR no hay localStorage en el servidor; y el token solo viaja a nuestra API, nunca a terceros.
    if (!this.isBrowser || !request.url.startsWith(environment.apiUrl)) {
      return next.handle(request);
    }

    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      return next.handle(request);
    }

    // Las peticiones son inmutables: se clona con la cabecera agregada.
    return next.handle(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
}
