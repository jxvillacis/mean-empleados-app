import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Empleado, EmpleadoPayload } from '../../models/empleado';
import { EmployeeService } from '../../services/employee.service';

/**
 * Smart component (orquestador):
 * - Es el único componente que conoce a EmployeeService.
 * - Expone los observables del servicio a la vista, que los consume con el async pipe.
 * - Traduce los eventos de los componentes presentacionales (@Output) en llamadas al servicio.
 * - No tiene suscripciones manuales: todo el estado llega por flujos y el async pipe
 *   gestiona la suscripción y la desuscripción.
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
  readonly selected$ = this.employeeService.selected$;
  readonly formReset$ = this.employeeService.formReset$;

  ngOnInit(): void {
    // Con SSR el componente también se ejecuta en el servidor; la carga se hace solo en el navegador.
    if (this.isBrowser) this.employeeService.loadAll();
  }

  onSave(payload: EmpleadoPayload): void {
    this.employeeService.save(payload);
  }

  onEdit(employee: Empleado): void {
    this.employeeService.select(employee);
  }

  onRemove(employee: Empleado): void {
    if (confirm(`¿Eliminar a ${employee.nombre}?`)) this.employeeService.delete(employee.id);
  }

  onCancel(): void {
    this.employeeService.cancelEdit();
  }

  onDismissError(): void {
    this.employeeService.clearError();
  }
}
