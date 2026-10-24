import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
// Smart components (orquestadores)
import { EmployeeManagerComponent } from './containers/employee-manager/employee-manager.component';
import { LoginDashboardComponent } from './containers/login-dashboard/login-dashboard.component';
// Dumb components (presentacionales)
import { EmployeeFormComponent } from './components/employee-form/employee-form.component';
import { EmployeeListComponent } from './components/employee-list/employee-list.component';
import { ErrorAlertComponent } from './components/error-alert/error-alert.component';
import { LoginFormComponent } from './components/login-form/login-form.component';

@NgModule({
  declarations: [
    AppComponent,
    EmployeeManagerComponent,
    LoginDashboardComponent,
    EmployeeFormComponent,
    EmployeeListComponent,
    ErrorAlertComponent,
    LoginFormComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [
    provideClientHydration(),
    // fetch es el transporte recomendado con SSR; withInterceptorsFromDi activa los interceptores de clase.
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true // Permite encadenar múltiples interceptores si fuera necesario
    }
    // EmployeeService se registra solo con providedIn: 'root' (instancia única para toda la app).
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
