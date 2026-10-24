import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor global de la tubería HTTP: agrega `Authorization: Bearer <token>` a cada petición hacia la API.
 * Los componentes y servicios no manejan el token: queda centralizado aquí, sin contaminar la vista.
 * Si la API rechaza el token enviado (401 o 403: vencido o inválido), cierra la sesión y vuelve al login.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // El token solo viaja a nuestra API, nunca a terceros. getToken() devuelve null en el servidor (SSR).
    const token = request.url.startsWith(environment.apiUrl) ? this.auth.getToken() : null;
    if (!token) {
      return next.handle(request);
    }

    // Las peticiones son inmutables: se clona con la cabecera agregada.
    return next.handle(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
          this.auth.logout();
          this.router.navigate(['/auth'], { queryParams: { returnUrl: this.router.url } });
        }
        return throwError(() => err);
      })
    );
  }
}
