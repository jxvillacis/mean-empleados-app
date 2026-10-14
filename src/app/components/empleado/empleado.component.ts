import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgForm } from '@angular/forms';
import { Empleado, EmpleadoPayload } from '../../models/empleado';
import { EmployeeService } from '../../services/employee.service';

// Modelo del formulario: el sueldo empieza vacío (null) para que se vea el placeholder.
type EmpleadoForm = Omit<EmpleadoPayload, 'sueldo'> & { sueldo: number | null };

const emptyForm = (): EmpleadoForm => ({ nombre: '', cargo: '', departamento: '', sueldo: null });

@Component({
  selector: 'app-empleado',
  templateUrl: './empleado.component.html',
  styleUrl: './empleado.component.css'
})
export class EmpleadoComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // El componente no guarda la lista: la lee del servicio (la vista usa el async pipe).
  readonly employees$ = this.employeeService.employees$;
  readonly loading$ = this.employeeService.loading$;
  readonly error$ = this.employeeService.error$;

  // Estado local de la vista: solo el formulario y el empleado en edición.
  form: EmpleadoForm = emptyForm();
  editingId: string | null = null;

  ngOnInit(): void {
    // Con SSR el componente también se ejecuta en el servidor; la carga se hace solo en el navegador.
    if (this.isBrowser) this.employeeService.loadAll();
  }

  save(ngForm: NgForm): void {
    // Un sueldo vacío se envía como 0 para que el backend responda con su mensaje de validación.
    const payload: EmpleadoPayload = { ...this.form, sueldo: this.form.sueldo ?? 0 };
    const request$ = this.editingId
      ? this.employeeService.update(this.editingId, payload)
      : this.employeeService.create(payload);
    // El servicio actualiza el estado; aquí solo se limpia el formulario si la operación tuvo éxito.
    // Los errores ya se muestran a través de error$.
    request$.subscribe({ next: () => this.resetForm(ngForm), error: () => undefined });
  }

  edit(employee: Empleado): void {
    this.editingId = employee.id;
    // Copia de los campos: editar el formulario no modifica el objeto del estado.
    const { nombre, cargo, departamento, sueldo } = employee;
    this.form = { nombre, cargo, departamento, sueldo };
    this.employeeService.clearError();
  }

  remove(employee: Empleado): void {
    if (!confirm(`¿Eliminar a ${employee.nombre}?`)) return;
    this.employeeService.delete(employee.id).subscribe({
      next: () => { if (this.editingId === employee.id) this.cancel(); },
      error: () => undefined
    });
  }

  cancel(ngForm?: NgForm): void {
    this.resetForm(ngForm);
    this.employeeService.clearError();
  }

  trackById(_index: number, employee: Empleado): string {
    return employee.id;
  }

  private resetForm(ngForm?: NgForm): void {
    this.editingId = null;
    this.form = emptyForm();
    ngForm?.resetForm(this.form);
  }
}
