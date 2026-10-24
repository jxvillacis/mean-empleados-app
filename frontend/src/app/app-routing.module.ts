import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { EmployeeManagerComponent } from './containers/employee-manager/employee-manager.component';
import { LoginDashboardComponent } from './containers/login-dashboard/login-dashboard.component';

// /auth es la puerta de entrada; /employees exige sesión (authGuard). Cualquier otra ruta va a /employees,
// que sin sesión redirige al login.
const routes: Routes = [
  { path: 'auth', component: LoginDashboardComponent, title: 'Iniciar sesión' },
  { path: 'employees', component: EmployeeManagerComponent, canActivate: [authGuard], title: 'Gestión de Empleados' },
  { path: '', pathMatch: 'full', redirectTo: 'employees' },
  { path: '**', redirectTo: 'employees' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
