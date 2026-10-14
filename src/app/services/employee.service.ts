import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, finalize, map, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { Empleado, EmpleadoPayload } from '../models/empleado';

/**
 * Servicio reactivo: única fuente de verdad del estado de empleados.
 * - El estado vive en BehaviorSubject privados: solo este servicio puede emitir valores.
 * - Los componentes solo leen flujos públicos de solo lectura (Observable$).
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

  // Flujos públicos de solo lectura.
  readonly employees$: Observable<Empleado[]> = this.employeesSubject.asObservable();
  readonly loading$: Observable<boolean> = this.loadingSubject.asObservable();
  readonly error$: Observable<string | null> = this.errorSubject.asObservable();

  /** Carga la lista completa y la publica en employees$. */
  loadAll(): void {
    this.loadingSubject.next(true);
    this.http.get<ApiResponse<Empleado[]>>(this.apiUrl).pipe(
      map(res => res.data ?? []),
      finalize(() => this.loadingSubject.next(false))
    ).subscribe({
      next: employees => {
        this.employeesSubject.next(employees);
        this.errorSubject.next(null);
      },
      error: (err: HttpErrorResponse) => this.errorSubject.next(this.toMessage(err))
    });
  }

  /** Crea un empleado y lo agrega al estado sin mutar el arreglo actual. */
  create(payload: EmpleadoPayload): Observable<Empleado> {
    return this.http.post<ApiResponse<Empleado>>(this.apiUrl, payload).pipe(
      map(res => res.data as Empleado),
      tap(created => this.setState([...this.employeesSubject.value, created])),
      catchError(err => this.fail(err))
    );
  }

  /** Actualiza parcial o totalmente un empleado (PATCH) y reemplaza solo ese elemento. */
  update(id: string, changes: Partial<EmpleadoPayload>): Observable<Empleado> {
    return this.http.patch<ApiResponse<Empleado>>(`${this.apiUrl}/${id}`, changes).pipe(
      map(res => res.data as Empleado),
      tap(updated => this.setState(this.employeesSubject.value.map(e => (e.id === id ? updated : e)))),
      catchError(err => this.fail(err))
    );
  }

  /** Elimina un empleado y lo quita del estado con filter (nuevo arreglo). */
  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<{ id: string }>>(`${this.apiUrl}/${id}`).pipe(
      map(() => undefined),
      tap(() => this.setState(this.employeesSubject.value.filter(e => e.id !== id))),
      catchError(err => this.fail(err))
    );
  }

  clearError(): void {
    this.errorSubject.next(null);
  }

  // Publica el nuevo estado y limpia el error previo tras una operación exitosa.
  private setState(employees: Empleado[]): void {
    this.employeesSubject.next(employees);
    this.errorSubject.next(null);
  }

  // Publica el error en error$ y lo propaga para que quien llamó sepa que falló.
  private fail(err: HttpErrorResponse): Observable<never> {
    const message = this.toMessage(err);
    this.errorSubject.next(message);
    return throwError(() => new Error(message));
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
