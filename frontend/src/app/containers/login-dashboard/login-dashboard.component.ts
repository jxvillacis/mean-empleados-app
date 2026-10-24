import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, Credentials } from '../../core/services/auth.service';

/**
 * Smart component (orquestador del login): captura el evento del formulario, invoca al servicio de
 * autenticación y gobierna la redirección o el mensaje de error. No contiene lógica de presentación.
 */
@Component({
  selector: 'app-login-dashboard',
  template: `
    <div class="container">
      <div class="row login">
        <div class="col s12 m8 offset-m2 l6 offset-l3">
          <!-- Alerta de errores semánticos devueltos por el Response Wrapper -->
          <app-error-alert [message]="errorMessage" (dismiss)="errorMessage = null"></app-error-alert>

          <!-- Componente de presentación pura (Dumb) -->
          <app-login-form [isLoading]="loading" (submitLogin)="onExecuteLogin($event)"></app-login-form>
        </div>
      </div>
    </div>
  `,
  styles: ['.login { margin-top: 48px; }'],
  // Su contenido depende de la sesión del navegador: no se reutiliza el DOM renderizado en el servidor.
  host: { ngSkipHydration: 'true' }
})
export class LoginDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  loading = false;
  errorMessage: string | null = null;

  ngOnInit(): void {
    // Con una sesión vigente no tiene sentido mostrar el login.
    if (this.isBrowser && this.authService.isAuthenticated()) this.router.navigateByUrl(this.returnUrl());
  }

  onExecuteLogin(credentials: Credentials): void {
    this.loading = true;
    this.errorMessage = null;

    this.authService.login(credentials).subscribe({
      next: () => {
        this.loading = false;
        // Redirección una vez guardado el token: a la ruta que se pidió antes del login, o a la lista.
        this.router.navigateByUrl(this.returnUrl());
      },
      error: (err: Error) => {
        this.loading = false;
        this.errorMessage = err.message || 'Error de infraestructura al validar credenciales.';
      }
    });
  }

  // Solo rutas internas de la app: evita redirecciones abiertas a otros sitios (returnUrl=//sitio-malicioso).
  private returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/employees';
  }
}
