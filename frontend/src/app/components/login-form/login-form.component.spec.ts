import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { LoginFormComponent } from './login-form.component';

describe('LoginFormComponent (dumb)', () => {
  let fixture: ComponentFixture<LoginFormComponent>;
  let component: LoginFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [LoginFormComponent], imports: [FormsModule] }).compileComponents();
    fixture = TestBed.createComponent(LoginFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emite una copia de las credenciales al enviar', () => {
    const emitidas: unknown[] = [];
    component.submitLogin.subscribe(c => emitidas.push(c));
    component.formModel = { email: 'admin@empleados.local', password: 'secreto123' };

    component.onSubmit();

    expect(emitidas).toEqual([{ email: 'admin@empleados.local', password: 'secreto123' }]);
    expect(emitidas[0]).not.toBe(component.formModel);
  });

  it('no emite si falta el correo o la contraseña', () => {
    const emit = spyOn(component.submitLogin, 'emit');
    component.formModel = { email: 'admin@empleados.local', password: '' };

    component.onSubmit();

    expect(emit).not.toHaveBeenCalled();
  });

  it('mientras valida deshabilita el botón y cambia su texto', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;

    expect(button.disabled).toBeTrue();
    expect(button.textContent).toContain('Validando');
  });
});
