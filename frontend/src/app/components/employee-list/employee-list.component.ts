import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Empleado } from '../../models/empleado';

/**
 * Dumb component (presentacional): solo dibuja la rejilla.
 * Recibe los datos por @Input() y avisa las acciones del usuario por @Output();
 * no conoce el servicio ni hace peticiones HTTP.
 */
@Component({
  selector: 'app-employee-list',
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush // solo se redibuja cuando cambian sus @Input()
})
export class EmployeeListComponent {
  @Input() employees: Empleado[] = [];
  @Input() loading = false;

  @Output() edit = new EventEmitter<Empleado>();
  @Output() remove = new EventEmitter<Empleado>();

  // Angular reutiliza las filas existentes y solo vuelve a dibujar las que cambiaron.
  trackById(_index: number, employee: Empleado): string {
    return employee.id;
  }
}
