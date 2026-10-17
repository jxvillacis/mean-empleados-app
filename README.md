# Sistema de Gestión de Empleados: Stack MEAN

**Práctica 03 · Patrones de Diseño de APIs** · Maestría de Software, Universidad Politécnica Salesiana
**Autor:** Jhonatan Villacís

Aplicación CRUD de empleados con **MongoDB, Express, Angular y Node.js** sobre TypeScript. El código inicial del laboratorio se refactorizó en **4 retos** para pasar de un CRUD acoplado y mutable a una arquitectura desacoplada, validada y reactiva.

| Capa | Tecnología |
|---|---|
| Backend | Node.js 24, Express 5, TypeScript, Mongoose 9, Zod 4, `tsx` |
| Frontend | Angular 17 (SSR), RxJS 7, Materialize CSS |
| Base de datos | MongoDB 9 (local o Atlas) |

---

## Estructura del repositorio

```
mean-empleados-app/
├── backend/                         API REST (Express + TypeScript)
│   └── src/
│       ├── index.ts                 raíz de composición: decide la implementación del repositorio
│       ├── app.ts                   createApp(repositorio): middlewares, rutas, manejo de errores
│       ├── config/database.ts       conexión a MongoDB (MONGO_URI)
│       ├── domain/employee.ts       entidad Employee (sin dependencias de BD)
│       ├── repositories/            IEmployeeRepository (contrato)                      ← Reto 1
│       ├── infrastructure/mongo/    modelo Mongoose + MongoEmployeeRepository            ← Reto 1
│       ├── dto/employee.dto.ts      esquemas Zod para body, params y query               ← Reto 2
│       ├── middlewares/             validate (Zod) e interceptor global de errores       ← Reto 2
│       ├── http/api-response.ts     Response Wrapper (sendSuccess / sendError)           ← Reto 2
│       ├── errors/app-error.ts      AppError, NotFoundError
│       ├── controllers/             EmployeeController (solo conoce la interfaz) y su prueba Jest  ← Práctica 5
│       └── routes/                  rutas /api/v1/empleados
├── frontend/                        Angular 17
│   └── src/app/
│       ├── services/employee.service.ts         servicio reactivo con BehaviorSubject     ← Reto 3
│       ├── containers/employee-manager/         Smart component (orquestador)             ← Reto 4
│       ├── components/employee-form/            Dumb: formulario (@Input / @Output)       ← Reto 4
│       ├── components/employee-list/            Dumb: rejilla (@Input / @Output)          ← Reto 4
│       ├── components/error-alert/              Dumb: alerta de error reutilizable        ← Reto 4
│       └── models/                              Empleado y ApiResponse
└── docs/README-guia-docente.md      enunciado original del laboratorio
```

---

## Puesta en marcha

### Requisitos

- Node.js 20 o superior y npm.
- MongoDB en ejecución (local en `mongodb://127.0.0.1:27017` o una cadena de MongoDB Atlas).
- Opcional: Postman, MongoDB Compass.

### 1. Backend (puerto 3000)

```bash
cd backend
npm install
npm run dev          # recarga automática con tsx watch
```

La conexión se configura con la variable `MONGO_URI`. Si no se define, se usa `mongodb://127.0.0.1/usuarios_db`.

Para MongoDB Atlas, copia `backend/.env.example` como `backend/.env` y coloca la cadena del cluster. `npm run dev` y `npm start` cargan ese archivo, que no se versiona.

```bash
# PowerShell, alternativa sin archivo .env
$env:MONGO_URI="mongodb+srv://usuario:clave@cluster/usuarios_db"; npm run dev
```

### 2. Frontend (puerto 4200)

```bash
cd frontend
npm install
npm start            # ng serve con el Angular CLI local; abrir http://localhost:4200
```

La URL del API está en `frontend/src/environments/environment.ts`.

---

## API REST

Base: `http://localhost:3000/api/v1`

| Método | Ruta | Descripción | Éxito |
|---|---|---|---|
| GET | `/empleados` | Consulta completa | 200 |
| GET | `/empleados?page=1&limit=10` | Consulta paginada (incluye `meta`) | 200 |
| GET | `/empleados/:id` | Consulta por id | 200 / 404 |
| POST | `/empleados` | Registro con validación | 201 |
| PUT | `/empleados/:id` | Actualización total (todos los campos) | 200 / 404 |
| PATCH | `/empleados/:id` | Actualización parcial (al menos un campo) | 200 / 404 |
| DELETE | `/empleados/:id` | Eliminación | 200 / 404 |

**Cuerpo de POST / PUT:**

```json
{ "nombre": "Ana Pérez", "cargo": "Analista", "departamento": "TI", "sueldo": 1500 }
```

Reglas: los textos se recortan y deben tener entre 2 y 100 caracteres (cargo y departamento, hasta 80). El `sueldo` debe ser numérico, mayor que 0 y hasta 100000. Se rechazan los campos no permitidos (por ejemplo `_id` o `createdAt`).

**Toda respuesta tiene la misma forma (Response Wrapper):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Empleados obtenidos correctamente",
  "data": [ { "id": "6ac1...", "nombre": "Ana Pérez", "cargo": "Analista", "departamento": "TI", "sueldo": 1500 } ],
  "meta": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 },
  "error": null,
  "timestamp": "2026-10-14T05:00:00.000Z"
}
```

`meta` solo aparece en la consulta paginada. Ejemplo de error:

```json
{
  "success": false, "statusCode": 400, "message": "Los datos enviados no son válidos", "data": null,
  "error": { "code": "VALIDATION_ERROR",
             "details": [ { "campo": "sueldo", "mensaje": "El sueldo es obligatorio y debe ser numérico" } ] },
  "timestamp": "..."
}
```

| Código | HTTP | Cuándo |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Body, params o query no cumplen el esquema Zod |
| `MALFORMED_JSON` | 400 | El body no es JSON válido |
| `NOT_FOUND` | 404 | El empleado no existe |
| `ROUTE_NOT_FOUND` | 404 | La ruta no existe |
| `INTERNAL_ERROR` | 500 | Error no controlado (el detalle solo se registra en el servidor) |

---

## Los 4 retos de refactorización

### Reto 1: Patrón Repository (persistencia invertida)

- **Problema:** los controladores importaban el modelo de Mongoose y acoplaban la capa HTTP al motor de base de datos.
- **Solución:** la interfaz `IEmployeeRepository` define el contrato y `MongoEmployeeRepository` es la única clase que usa Mongoose; traduce `_id` a `id`. El `EmployeeController` recibe el repositorio por constructor (inyección de dependencias), y `index.ts` es el único lugar que decide la implementación concreta. El controlador **no importa Mongoose**: la API funciona igual con otro repositorio, por ejemplo uno en memoria.

### Reto 2: Validación perimetral con DTO y Response Wrapper

- **Problema:** no había validación, las respuestas tenían formatos distintos y los errores salían crudos.
- **Solución:** esquemas Zod en `employee.dto.ts` para `req.body`, `req.params` y `req.query`, aplicados por el middleware reutilizable `validate`. El Response Wrapper (`sendSuccess` / `sendError`) da a todas las respuestas la misma forma, y un **interceptor global de errores** convierte `ZodError`, `AppError` y JSON mal formado en respuestas consistentes, sin exponer detalles internos.

### Reto 3: Servicio reactivo e inmutabilidad (RxJS)

- **Problema:** el componente guardaba arreglos mutables y llamaba directamente a `HttpClient`.
- **Solución:** `EmployeeService` concentra el estado en `BehaviorSubject` **privados** y expone flujos de solo lectura (`employees$`, `loading$`, `error$`, `selected$`, `formReset$`). Cada mutación emite un arreglo **nuevo**: `[...actual, nuevo]` al crear, `map` al actualizar y `filter` al eliminar. Los errores del backend se traducen a mensajes legibles.
- **Sin suscripciones manuales en los componentes:** los métodos del servicio (`save`, `delete`, `select`, `cancelEdit`) no devuelven nada y gestionan internamente las peticiones HTTP. Los componentes solo leen flujos con el `async` pipe, que se suscribe y se desuscribe automáticamente.

### Reto 4: Componentes Smart vs. Dumb

- **Problema:** una sola vista monolítica mezclaba el formulario, la tabla y la lógica.
- **Solución:** `EmployeeManagerComponent` (smart) es el único que conoce el servicio; consume los observables con el **async pipe** y orquesta los eventos. `EmployeeFormComponent`, `EmployeeListComponent` y `ErrorAlertComponent` (dumb) se comunican solo con `@Input()` y `@Output()`, usan `ChangeDetection.OnPush` y no tienen dependencias del servicio.

```
EmployeeService ──employees$──▶ EmployeeManager (smart, | async)
       ▲                           │ [employees] ─▶ EmployeeList ──(edit / remove)──┐
       └── save / select / delete  ◀┤ [employee]  ─▶ EmployeeForm ──(save / cancel)─┤
                                   └─────────────────── orquesta ◀────────────────────┘
```

---

## Verificación

```bash
cd backend  && npm run typecheck                                # TypeScript estricto, sin errores
cd frontend && npx ng build                                     # build de producción con SSR
cd frontend && npx ng test --watch=false --browsers=ChromeHeadless   # 14 pruebas unitarias
```

Las pruebas unitarias cubren:
- el servicio: carga, creación inmutable (arreglo nuevo sin modificar el anterior), actualización con PATCH, eliminación y manejo de errores;
- los `@Input` y `@Output` de los componentes presentacionales;
- que el formulario edita una copia del empleado;
- la composición del orquestador.

La API se probó con casos de éxito, de validación, 404 y paginación, y la interfaz con un flujo completo de crear, editar y eliminar en Chrome.

### Práctica 5: prueba unitaria del backend (Jest)

```bash
cd backend && npm test        # 24 pruebas de EmployeeController, sin Docker ni MongoDB
```

`src/controllers/employee.controller.spec.ts` inyecta en el controlador un doble de `IEmployeeRepository` creado con `jest.fn()`. No importa Mongoose: el controlador depende de la interfaz, no de la base. Cada método del controlador (`getAll`, `getById`, `create`, `replace`, `update`, `delete`) tiene 2 escenarios de éxito y 2 de error: respuestas 200/201 con el Response Wrapper, lo que se delega al repositorio, `NotFoundError` cuando el empleado no existe y la propagación de las fallas del repositorio al middleware de errores.

ts-jest 29 aún no es compatible con TypeScript 7, que usa el proyecto. Por eso las pruebas se compilan con TypeScript 5.9 (alias `typescript5`, ver `jest.ts5-transformer.cjs`); `npm run typecheck` sigue usando TypeScript 7.

### Práctica 5: prueba de estrés (Artillery)

```bash
npm install -g artillery
cd backend && npm start                                              # API contra MongoDB Atlas (backend/.env)
artillery run stress-test.yml --output artillery/resultado.json      # desde la raíz, en otra terminal
```

`stress-test.yml` envía, por cada usuario virtual, un POST válido (esperado 201) y, tras 1 s, uno con `sueldo: -500` (esperado 400). Son 20 s a 5 usuarios/s y 30 s subiendo de 15 a 50 usuarios/s. Los umbrales de `ensure` son p99 < 200 ms y menos de 1 % de errores.

Resultados de dos ejecuciones del 17 de octubre de 2026 (API local, MongoDB Atlas). Salidas completas en `artillery/consola.txt` (primera) y `artillery/consola2.txt` (segunda):

| Métrica | Primera ejecución | Segunda ejecución |
|---|---|---|
| Peticiones | 2150 (1075 usuarios virtuales, 0 fallidos) | 2150 (1075 usuarios virtuales, 0 fallidos) |
| `http.codes.201` / `http.codes.400` | 1075 / 1075 | 1075 / 1075 |
| p99 global (umbral 200 ms) | 175.9 ms: cumple | 333.7 ms: no cumple |
| Respuestas 201: mediana / p99 | 149.9 / 214.9 ms | 153 / 907 ms |
| Respuestas 400: mediana / p99 | 1 / 7 ms | 1 / 125.2 ms |

En ambas la mediana de las escrituras se mantiene cerca de 150 ms con cualquier carga. En la segunda, el p99 de las 201 y también el de las 400 se dispara en las dos ventanas de mayor carga (69 y 86 peticiones/s); como las 400 no llegan a la base, la espera se produce en el propio proceso de Node.

---

## Créditos

**Código base:** [pmpvhr/code](https://github.com/pmpvhr/code) (backend) y [pmpvhr/maestria](https://github.com/pmpvhr/maestria) (frontend).
