import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Empleado, EmpleadoPayload } from '../../models/empleado';
import { EmployeeService } from '../../services/employee.service';

/**
 * Smart component (orquestador):
 * - Es el único componente que conoce a EmployeeService.
 * - Expone los observables del servicio a la vista, que los consume con el async pipe.
 * - Recibe los eventos de los componentes presentacionales (@Output) y decide qué hacer.
 */
@Component({
  selector: 'app-employee-manager',
  templateUrl: './employee-manager.component.html'
})
export class EmployeeManagerComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly employees$ = this.employeeService.employees$;
  readonly loading$ = this.employeeService.loading$;
  readonly error$ = this.employeeService.error$;

  // Estado de interacción de la pantalla (no de datos): qué empleado se edita
  // y una señal para que el formulario se limpie tras guardar.
  editing: Empleado | null = null;
  formReset = 0;

  ngOnInit(): void {
    // Con SSR el componente también se ejecuta en el servidor; la carga se hace solo en el navegador.
    if (this.isBrowser) this.employeeService.loadAll();
  }

  onSave(payload: EmpleadoPayload): void {
    const request$ = this.editing
      ? this.employeeService.update(this.editing.id, payload)
      : this.employeeService.create(payload);
    // Si falla, el formulario conserva lo escrito y el error se muestra mediante error$.
    request$.subscribe({ next: () => this.resetForm(), error: () => undefined });
  }

  onEdit(employee: Empleado): void {
    this.editing = employee;
    this.employeeService.clearError();
  }

  onRemove(employee: Empleado): void {
    if (!confirm(`¿Eliminar a ${employee.nombre}?`)) return;
    this.employeeService.delete(employee.id).subscribe({
      next: () => { if (this.editing?.id === employee.id) this.resetForm(); },
      error: () => undefined
    });
  }

  onCancel(): void {
    this.resetForm();
    this.employeeService.clearError();
  }

  onDismissError(): void {
    this.employeeService.clearError();
  }

  private resetForm(): void {
    this.editing = null;
    this.formReset++;
  }
}
