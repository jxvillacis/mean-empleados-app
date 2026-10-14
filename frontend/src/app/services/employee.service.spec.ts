import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Empleado } from '../models/empleado';
import { EmployeeService } from './employee.service';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/empleados`;
  const ana: Empleado = { id: '1', nombre: 'Ana', cargo: 'QA', departamento: 'TI', sueldo: 1000 };
  const luis: Empleado = { id: '2', nombre: 'Luis', cargo: 'Dev', departamento: 'TI', sueldo: 1500 };
  const value = <T>(obs: import('rxjs').Observable<T>) => firstValueFrom(obs);

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(EmployeeService);
    http = TestBed.inject(HttpTestingController);
    service.loadAll();
    http.expectOne(url).flush({ success: true, data: [ana] });
  });

  afterEach(() => http.verify());

  it('publica la lista cargada en employees$', async () => {
    expect(await value(service.employees$)).toEqual([ana]);
    expect(await value(service.loading$)).toBeFalse();
  });

  it('save() sin selección crea y emite un arreglo nuevo (no muta el anterior)', async () => {
    const before = await value(service.employees$);
    service.save({ nombre: 'Luis', cargo: 'Dev', departamento: 'TI', sueldo: 1500 });
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, data: luis });

    const after = await value(service.employees$);
    expect(after).toEqual([ana, luis]);
    expect(after).not.toBe(before);
    expect(before).toEqual([ana]);
    expect(await value(service.formReset$)).toBe(1);
  });

  it('save() con un empleado seleccionado actualiza (PATCH) y vuelve a modo registro', async () => {
    service.select(ana);
    service.save({ nombre: 'Ana', cargo: 'Líder', departamento: 'TI', sueldo: 2000 });
    const req = http.expectOne(`${url}/1`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, data: { ...ana, cargo: 'Líder', sueldo: 2000 } });

    expect((await value(service.employees$))[0].cargo).toBe('Líder');
    expect(await value(service.selected$)).toBeNull();
  });

  it('delete() quita el empleado con filter', async () => {
    service.delete('1');
    http.expectOne(`${url}/1`).flush({ success: true, data: { id: '1' } });
    expect(await value(service.employees$)).toEqual([]);
  });

  it('un error publica el mensaje del backend y no limpia el formulario', async () => {
    service.save({ nombre: 'A', cargo: 'QA', departamento: 'TI', sueldo: 0 });
    http.expectOne(url).flush(
      { success: false, error: { code: 'VALIDATION_ERROR', details: [{ campo: 'nombre', mensaje: 'El nombre debe tener al menos 2 caracteres' }] } },
      { status: 400, statusText: 'Bad Request' }
    );
    expect(await value(service.error$)).toBe('El nombre debe tener al menos 2 caracteres');
    expect(await value(service.formReset$)).toBe(0);
  });
});
