import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Empleado, EmpleadoPayload } from '../../models/empleado';
import { EmployeeFormComponent } from './employee-form.component';

describe('EmployeeFormComponent (dumb)', () => {
  let fixture: ComponentFixture<EmployeeFormComponent>;
  let component: EmployeeFormComponent;
  const ana: Empleado = { id: '1', nombre: 'Ana', cargo: 'QA', departamento: 'TI', sueldo: 1000 };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmployeeFormComponent],
      imports: [FormsModule]
    }).compileComponents();
    fixture = TestBed.createComponent(EmployeeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga una COPIA del empleado recibido por @Input (no modifica el original)', () => {
    fixture.componentRef.setInput('employee', ana);
    fixture.detectChanges();
    component.model.nombre = 'Otro nombre';
    expect(ana.nombre).toBe('Ana');
  });

  it('emite @Output save con los datos del formulario', () => {
    let saved: EmpleadoPayload | undefined;
    component.save.subscribe(p => (saved = p));
    fixture.componentRef.setInput('employee', ana);
    fixture.detectChanges();

    component.submit();

    expect(saved).toEqual({ nombre: 'Ana', cargo: 'QA', departamento: 'TI', sueldo: 1000 });
  });

  it('se limpia cuando cambia resetSignal', () => {
    fixture.componentRef.setInput('employee', ana);
    fixture.detectChanges();
    fixture.componentRef.setInput('employee', null);
    fixture.componentRef.setInput('resetSignal', 1);
    fixture.detectChanges();
    expect(component.model).toEqual({ nombre: '', cargo: '', departamento: '', sueldo: null });
  });
});
