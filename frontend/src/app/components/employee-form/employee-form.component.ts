import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Empleado, EmpleadoPayload } from '../../models/empleado';

// Modelo interno del formulario: el sueldo empieza vacío (null) para que se vea el placeholder.
type EmpleadoForm = Omit<EmpleadoPayload, 'sueldo'> & { sueldo: number | null };

const emptyForm = (): EmpleadoForm => ({ nombre: '', cargo: '', departamento: '', sueldo: null });

/**
 * Dumb component (presentacional): formulario de registro y edición.
 * - @Input() employee: empleado a editar (null = modo registro).
 * - @Input() resetSignal: cada cambio de valor limpia el formulario (lo usa el orquestador
 *   tras guardar con éxito, porque employee puede seguir siendo null).
 * - @Output() save / cancel: avisa al orquestador; nunca llama al servicio.
 */
@Component({
  selector: 'app-employee-form',
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeFormComponent implements OnChanges {
  @Input() employee: Empleado | null = null;
  @Input() resetSignal = 0;

  @Output() save = new EventEmitter<EmpleadoPayload>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('empleadoForm') private ngForm?: NgForm;

  model: EmpleadoForm = emptyForm();

  // Cada vez que cambia employee o resetSignal se carga una COPIA en el modelo local:
  // escribir en el formulario nunca modifica el objeto que vive en el estado del servicio.
  ngOnChanges(): void {
    const e = this.employee;
    this.model = e ? { nombre: e.nombre, cargo: e.cargo, departamento: e.departamento, sueldo: e.sueldo } : emptyForm();
    this.ngForm?.resetForm(this.model);
  }

  submit(): void {
    // Un sueldo vacío se envía como 0 para que el backend responda con su mensaje de validación.
    this.save.emit({ ...this.model, sueldo: this.model.sueldo ?? 0 });
  }
}
