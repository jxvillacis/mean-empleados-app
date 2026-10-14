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

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(EmployeeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('publica la lista cargada en employees$', async () => {
    service.loadAll();
    http.expectOne(url).flush({ success: true, data: [ana] });
    expect(await firstValueFrom(service.employees$)).toEqual([ana]);
  });

  it('al crear emite un arreglo nuevo (no muta el anterior)', async () => {
    service.loadAll();
    http.expectOne(url).flush({ success: true, data: [ana] });
    const before = await firstValueFrom(service.employees$);

    const luis: Empleado = { id: '2', nombre: 'Luis', cargo: 'Dev', departamento: 'TI', sueldo: 1500 };
    service.create({ nombre: 'Luis', cargo: 'Dev', departamento: 'TI', sueldo: 1500 }).subscribe();
    http.expectOne(url).flush({ success: true, data: luis });

    const after = await firstValueFrom(service.employees$);
    expect(after).toEqual([ana, luis]);
    expect(after).not.toBe(before);
    expect(before).toEqual([ana]);
  });
});
