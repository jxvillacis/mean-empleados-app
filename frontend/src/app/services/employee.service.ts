import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { Empleado, EmpleadoPayload } from '../models/empleado';

/**
 * Servicio reactivo: única fuente de verdad del estado de empleados.
 * - El estado vive en BehaviorSubject privados: solo este servicio puede emitir valores.
 * - Los componentes solo leen flujos públicos de solo lectura (Observable$) con el async pipe
 *   y llaman a métodos sin valor de retorno: ningún componente necesita .subscribe().
 * - Cada mutación emite un arreglo NUEVO ([...actual, nuevo], map, filter); nunca se modifica el existente.
 */
@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/empleados`;

  // Estado privado.
  private readonly employeesSubject = new BehaviorSubject<Empleado[]>([]);
  // Empieza en true: la primera vista (incluida la que renderiza el servidor con SSR) muestra
  // "Cargando..." en lugar de "No hay empleados" mientras llega la lista.
  private readonly loadingSubject = new BehaviorSubject<boolean>(true);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  // Empleado en edición (null = modo registro).
  private readonly selectedSubject = new BehaviorSubject<Empleado | null>(null);
  // Contador que avanza cada vez que el formulario debe limpiarse (guardado exitoso o cancelar).
  private readonly formResetSubject = new BehaviorSubject<number>(0);

  // Flujos públicos de solo lectura.
  readonly employees$: Observable<Empleado[]> = this.employeesSubject.asObservable();
  readonly loading$: Observable<boolean> = this.loadingSubject.asObservable();
  readonly error$: Observable<string | null> = this.errorSubject.asObservable();
  readonly selected$: Observable<Empleado | null> = this.selectedSubject.asObservable();
  readonly formReset$: Observable<number> = this.formResetSubject.asObservable();

  /** Carga la lista completa y la publica en employees$. */
  loadAll(): void {
    this.loadingSubject.next(true);
    this.http.get<ApiResponse<Empleado[]>>(this.apiUrl).pipe(
      map(res => res.data ?? []),
      finalize(() => this.loadingSubject.next(false))
    ).subscribe({
      next: employees => this.setState(employees),
      error: (err: HttpErrorResponse) => this.fail(err)
    });
  }

  /** Guarda el formulario: crea si no hay empleado seleccionado, o actualiza el seleccionado. */
  save(payload: EmpleadoPayload): void {
    const selected = this.selectedSubject.value;
    if (selected) this.update(selected.id, payload);
    else this.create(payload);
  }

  /** Crea un empleado y lo agrega al estado sin mutar el arreglo actual. */
  create(payload: EmpleadoPayload): void {
    this.http.post<ApiResponse<Empleado>>(this.apiUrl, payload).pipe(
      map(res => res.data as Empleado)
    ).subscribe({
      next: created => {
        this.setState([...this.employeesSubject.value, created]);
        this.finishEdit();
      },
      error: (err: HttpErrorResponse) => this.fail(err) // el formulario conserva lo escrito
    });
  }

  /** Actualiza parcial o totalmente un empleado (PATCH) y reemplaza solo ese elemento. */
  update(id: string, changes: Partial<EmpleadoPayload>): void {
    this.http.patch<ApiResponse<Empleado>>(`${this.apiUrl}/${id}`, changes).pipe(
      map(res => res.data as Empleado)
    ).subscribe({
      next: updated => {
        this.setState(this.employeesSubject.value.map(e => (e.id === id ? updated : e)));
        this.finishEdit();
      },
      error: (err: HttpErrorResponse) => this.fail(err)
    });
  }

  /** Elimina un empleado y lo quita del estado con filter (nuevo arreglo). */
  delete(id: string): void {
    this.http.delete<ApiResponse<{ id: string }>>(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.setState(this.employeesSubject.value.filter(e => e.id !== id));
        if (this.selectedSubject.value?.id === id) this.finishEdit();
      },
      error: (err: HttpErrorResponse) => this.fail(err)
    });
  }

  /** Pasa el formulario a modo edición con el empleado elegido. */
  select(employee: Empleado): void {
    this.selectedSubject.next(employee);
    this.clearError();
  }

  /** Descarta la edición y limpia el formulario. */
  cancelEdit(): void {
    this.finishEdit();
    this.clearError();
  }

  clearError(): void {
    this.errorSubject.next(null);
  }

  // Publica el nuevo estado y limpia el error previo tras una operación exitosa.
  private setState(employees: Empleado[]): void {
    this.employeesSubject.next(employees);
    this.errorSubject.next(null);
  }

  // Vuelve a modo registro y avisa al formulario que debe limpiarse.
  private finishEdit(): void {
    this.selectedSubject.next(null);
    this.formResetSubject.next(this.formResetSubject.value + 1);
  }

  // Publica el error en error$ para que la vista lo muestre.
  private fail(err: HttpErrorResponse): void {
    this.errorSubject.next(this.toMessage(err));
  }

  // Traduce la respuesta de error del backend (Response Wrapper) a un mensaje legible.
  private toMessage(err: HttpErrorResponse): string {
    if (err.status === 0) return 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.';
    const body = err.error as ApiResponse<null> | null;
    const details = body?.error?.details;
    if (details?.length) return details.map(d => d.mensaje).join(' · ');
    return body?.message ?? 'Ocurrió un error inesperado.';
  }
}
