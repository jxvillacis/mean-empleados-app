import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Credentials } from '../../core/services/auth.service';

/**
 * Dumb component (presentación pura): agnóstico a las rutas de red, al entorno y a localStorage.
 * Recibe el estado con @Input() y notifica el intento de inicio de sesión con @Output().
 */
@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginFormComponent {
  @Input() isLoading = false;
  @Output() submitLogin = new EventEmitter<Credentials>();

  // Estado temporal puramente local del formulario.
  formModel: Credentials = { email: '', password: '' };

  onSubmit(): void {
    if (this.formModel.email && this.formModel.password) {
      // Se emite una copia: el padre no puede modificar el estado interno del formulario.
      this.submitLogin.emit({ ...this.formModel });
    }
  }
}
