import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Empleado } from '../../models/empleado';
import { EmployeeListComponent } from './employee-list.component';

describe('EmployeeListComponent (dumb)', () => {
  let fixture: ComponentFixture<EmployeeListComponent>;
  let component: EmployeeListComponent;
  const ana: Empleado = { id: '1', nombre: 'Ana', cargo: 'QA', departamento: 'TI', sueldo: 1000 };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [EmployeeListComponent] }).compileComponents();
    fixture = TestBed.createComponent(EmployeeListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('employees', [ana]);
    fixture.detectChanges();
  });

  it('dibuja una fila por cada empleado recibido por @Input', () => {
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Ana');
  });

  it('emite @Output edit y remove con el empleado de la fila', () => {
    let edited: Empleado | undefined;
    let removed: Empleado | undefined;
    component.edit.subscribe(e => (edited = e));
    component.remove.subscribe(e => (removed = e));

    const [editBtn, removeBtn] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody button'));
    (editBtn as HTMLButtonElement).click();
    (removeBtn as HTMLButtonElement).click();

    expect(edited).toEqual(ana);
    expect(removed).toEqual(ana);
  });
});
