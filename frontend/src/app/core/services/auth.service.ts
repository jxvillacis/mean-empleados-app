import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response';
import { toErrorMessage } from '../http/api-error';

// Claves de localStorage: el JWT de la sesión y los datos básicos del usuario (para mostrarlos al recargar).
export const ACCESS_TOKEN_KEY = 'access_token';
const CURRENT_USER_KEY = 'current_user';

export interface Credentials { email: string; password: string; }
export interface SessionUser { email: string; rol: string; }
interface LoginData { token: string; user: SessionUser; }

/**
 * Servicio de autenticación reactivo: única fuente de verdad de la sesión.
 * - Hace el login contra POST /auth/login y desempaqueta el Response Wrapper.
 * - Guarda el token en localStorage como efecto controlado (tap) y publica el usuario en currentUser$.
 * - Ningún componente lee localStorage: el interceptor y el guard le preguntan a este servicio.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  // Con SSR el servicio también vive en el servidor, donde no existe localStorage.
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  private readonly currentUserSubject = new BehaviorSubject<SessionUser | null>(this.readSession());
  readonly currentUser$: Observable<SessionUser | null> = this.currentUserSubject.asObservable();

  /** Login transaccional: si el backend responde con éxito, guarda la sesión y emite el usuario. */
  login(credentials: Credentials): Observable<SessionUser> {
    return this.http.post<ApiResponse<LoginData>>(`${this.apiUrl}/login`, credentials).pipe(
      map(response => {
        if (response.success && response.data) return response.data; // desempaqueta la envoltura estándar
        throw new Error(response.message || 'Fallo de autenticación.');
      }),
      // El mensaje del backend (401 credenciales, 400 validación) llega tal cual a la vista.
      catchError((err: unknown) => throwError(() => err instanceof HttpErrorResponse ? new Error(toErrorMessage(err)) : err)),
      tap(data => {
        localStorage.setItem(ACCESS_TOKEN_KEY, data.token);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
        this.currentUserSubject.next(data.user);
      }),
      map(data => data.user)
    );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    this.currentUserSubject.next(null);
  }

  /** Token vigente o null (sin sesión, en el servidor o con el token vencido). */
  getToken(): string | null {
    if (!this.isBrowser) return null;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    return token && !isExpired(token) ? token : null;
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  // Sesión guardada al recargar la página: solo si el token sigue vigente.
  private readSession(): SessionUser | null {
    if (!this.getToken()) {
      if (this.isBrowser) localStorage.removeItem(CURRENT_USER_KEY);
      return null;
    }
    try {
      return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) ?? 'null') as SessionUser | null;
    } catch {
      return null;
    }
  }
}

// Lee el claim exp del JWT (sin verificar la firma: eso lo hace el backend) para no usar un token vencido.
function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return true; // un token ilegible se trata como vencido
  }
}
