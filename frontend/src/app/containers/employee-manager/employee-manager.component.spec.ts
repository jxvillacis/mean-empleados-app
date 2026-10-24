import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { EmployeeFormComponent } from '../../components/employee-form/employee-form.component';
import { EmployeeListComponent } from '../../components/employee-list/employee-list.component';
import { ErrorAlertComponent } from '../../components/error-alert/error-alert.component';
import { EmployeeManagerComponent } from './employee-manager.component';

describe('EmployeeManagerComponent (smart)', () => {
  let fixture: ComponentFixture<EmployeeManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmployeeManagerComponent, EmployeeFormComponent, EmployeeListComponent, ErrorAlertComponent],
      imports: [HttpClientTestingModule, FormsModule, RouterTestingModule]
    }).compileComponents();
    fixture = TestBed.createComponent(EmployeeManagerComponent);
    fixture.detectChanges();
  });

  it('compone los componentes presentacionales', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance).toBeTruthy();
    expect(el.querySelector('app-employee-form')).not.toBeNull();
    expect(el.querySelector('app-employee-list')).not.toBeNull();
  });
});
