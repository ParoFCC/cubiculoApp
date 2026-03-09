# Arquitectura — CubiculoApp

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE MÓVIL                            │
│                 React Native CLI (iOS / Android)                 │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Auth    │  │  Juegos  │  │Impresión │  │  Productos   │  │
│  │  Module  │  │  Module  │  │  Module  │  │  Module      │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       └─────────────┴──────────────┴───────────────┘           │
│                          API Service Layer                       │
│                       (Axios + JWT Interceptors)                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS / REST API
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND — FastAPI                         │
│                                                                 │
│  ┌───────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  /auth    │  │ /games   │  │ /print   │  │  /products  │  │
│  │  /users   │  │          │  │          │  │  /sales     │  │
│  └─────┬─────┘  └─────┬────┘  └─────┬────┘  └──────┬──────┘  │
│        └───────────────┴─────────────┴───────────────┘         │
│                      Services + Repositories                     │
│                      JWT Middleware (Bearer)                     │
│                      Role Guard (student / admin)               │
└───────────────────────────────┬─────────────────────────────────┘
                                │ SQLAlchemy ORM
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BASE DE DATOS — PostgreSQL (Neon)              │
│                                                                 │
│   users  │  games  │  game_loans  │  print_balance             │
│           print_history  │  products  │  sales  │  sale_items  │
│           cash_register                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Separación Frontend / Backend

| Responsabilidad          | Frontend (React Native)          | Backend (FastAPI)                    |
|--------------------------|----------------------------------|--------------------------------------|
| UI / UX                  | ✅ Pantallas, navegación          | ❌                                   |
| Estado local             | ✅ Zustand / Redux Toolkit        | ❌                                   |
| Llamadas HTTP            | ✅ Axios con interceptors JWT     | ❌                                   |
| Lógica de negocio        | ❌ (mínima, solo validaciones UI) | ✅ Services layer                    |
| Autenticación            | ✅ Almacena token (MMKV)          | ✅ Genera / valida JWT               |
| Autorización por rol     | ✅ Oculta rutas según rol         | ✅ Dependencias de FastAPI           |
| Persistencia de datos    | ❌                                | ✅ PostgreSQL vía SQLAlchemy         |
| Migraciones DB           | ❌                                | ✅ Alembic                           |

---

## 3. Estructura de Carpetas

### 3A. Frontend — React Native CLI

```
CubiculoApp/
├── android/
├── ios/
├── src/
│   ├── assets/                   # Imágenes, íconos, fuentes
│   │   ├── images/
│   │   └── icons/
│   │
│   ├── components/               # Componentes reutilizables
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── LoadingOverlay.tsx
│   │   └── modules/
│   │       ├── GameCard.tsx
│   │       ├── PrintBalanceBar.tsx
│   │       └── ProductItem.tsx
│   │
│   ├── navigation/               # React Navigation v6
│   │   ├── index.tsx             # Root navigator
│   │   ├── AuthNavigator.tsx
│   │   ├── StudentNavigator.tsx  # Stack + Bottom Tabs
│   │   └── AdminNavigator.tsx    # Stack + Bottom Tabs
│   │
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── SplashScreen.tsx
│   │   │
│   │   ├── student/
│   │   │   ├── games/
│   │   │   │   ├── GameCatalogScreen.tsx
│   │   │   │   ├── GameDetailScreen.tsx    # instrucciones
│   │   │   │   └── RequestLoanScreen.tsx
│   │   │   ├── printing/
│   │   │   │   ├── PrintBalanceScreen.tsx
│   │   │   │   └── PrintHistoryScreen.tsx
│   │   │   └── products/
│   │   │       └── ProductCatalogScreen.tsx
│   │   │
│   │   └── admin/
│   │       ├── games/
│   │       │   ├── InventoryScreen.tsx
│   │       │   ├── RegisterLoanScreen.tsx
│   │       │   ├── RegisterReturnScreen.tsx
│   │       │   └── LoanHistoryScreen.tsx
│   │       ├── printing/
│   │       │   ├── RegisterPrintScreen.tsx
│   │       │   └── PrintHistoryAdminScreen.tsx
│   │       └── products/
│   │           ├── RegisterSaleScreen.tsx
│   │           ├── CashRegisterScreen.tsx
│   │           ├── InventoryProductScreen.tsx
│   │           └── SalesReportScreen.tsx
│   │
│   ├── services/                 # Capa de comunicación con API
│   │   ├── api.ts                # Instancia Axios + interceptors
│   │   ├── authService.ts
│   │   ├── gamesService.ts
│   │   ├── printingService.ts
│   │   └── productsService.ts
│   │
│   ├── store/                    # Estado global con Zustand
│   │   ├── useAuthStore.ts
│   │   ├── useGamesStore.ts
│   │   ├── usePrintingStore.ts
│   │   └── useProductsStore.ts
│   │
│   ├── hooks/                    # Custom hooks
│   │   ├── useAuth.ts
│   │   └── useRole.ts
│   │
│   ├── utils/
│   │   ├── storage.ts            # MMKV para token
│   │   ├── formatters.ts
│   │   └── constants.ts
│   │
│   └── types/                    # Tipos TypeScript globales
│       ├── auth.types.ts
│       ├── games.types.ts
│       ├── printing.types.ts
│       └── products.types.ts
│
├── .env                          # REACT_APP_API_URL
├── app.json
├── babel.config.js
├── tsconfig.json
└── package.json
```

### 3B. Backend — FastAPI

```
cubículo-backend/
├── app/
│   ├── main.py                   # FastAPI app, CORS, routers
│   │
│   ├── core/
│   │   ├── config.py             # Settings (pydantic-settings)
│   │   ├── security.py           # JWT create/verify, bcrypt
│   │   └── database.py           # SQLAlchemy engine + Session
│   │
│   ├── models/                   # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── game.py
│   │   ├── game_loan.py
│   │   ├── print_balance.py
│   │   ├── print_history.py
│   │   ├── product.py
│   │   ├── sale.py
│   │   └── cash_register.py
│   │
│   ├── schemas/                  # Pydantic schemas (request/response)
│   │   ├── auth.py
│   │   ├── games.py
│   │   ├── printing.py
│   │   └── products.py
│   │
│   ├── routers/                  # Endpoints por módulo
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── games.py
│   │   ├── printing.py
│   │   └── products.py
│   │
│   ├── services/                 # Lógica de negocio
│   │   ├── auth_service.py
│   │   ├── games_service.py
│   │   ├── printing_service.py
│   │   └── products_service.py
│   │
│   └── dependencies/
│       ├── auth.py               # get_current_user
│       └── roles.py              # require_admin, require_student
│
├── migrations/                   # Alembic
│   ├── env.py
│   └── versions/
│
├── tests/
│   ├── test_auth.py
│   ├── test_games.py
│   ├── test_printing.py
│   └── test_products.py
│
├── .env
├── alembic.ini
├── requirements.txt
└── Dockerfile
```

---

## 4. Modelo de Base de Datos

```sql
-- USUARIOS
users
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name          VARCHAR(120) NOT NULL
  email         VARCHAR(120) UNIQUE NOT NULL
  password_hash VARCHAR(255) NOT NULL
  role          ENUM('student', 'admin') NOT NULL DEFAULT 'student'
  student_id    VARCHAR(20)            -- matrícula
  period        VARCHAR(10)            -- ej. "2026-1"
  is_active     BOOLEAN DEFAULT TRUE
  created_at    TIMESTAMPTZ DEFAULT NOW()

-- JUEGOS (inventario)
games
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name           VARCHAR(120) NOT NULL
  description    TEXT
  instructions   TEXT
  image_url      VARCHAR(255)
  quantity_total INT NOT NULL DEFAULT 1
  quantity_avail INT NOT NULL DEFAULT 1
  created_at     TIMESTAMPTZ DEFAULT NOW()

-- PRÉSTAMOS DE JUEGOS
game_loans
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
  game_id      UUID REFERENCES games(id)
  student_id   UUID REFERENCES users(id)
  admin_id     UUID REFERENCES users(id)
  borrowed_at  TIMESTAMPTZ DEFAULT NOW()
  due_at       TIMESTAMPTZ
  returned_at  TIMESTAMPTZ
  status       ENUM('active', 'returned', 'overdue') DEFAULT 'active'

-- SALDO DE IMPRESIONES (por periodo)
print_balance
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  student_id      UUID REFERENCES users(id)
  period          VARCHAR(10) NOT NULL
  free_remaining  INT NOT NULL DEFAULT 10
  created_at      TIMESTAMPTZ DEFAULT NOW()
  UNIQUE (student_id, period)

-- HISTORIAL DE IMPRESIONES
print_history
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  student_id  UUID REFERENCES users(id)
  admin_id    UUID REFERENCES users(id)
  pages       INT NOT NULL
  type        ENUM('free', 'paid') NOT NULL
  cost        NUMERIC(8,2) DEFAULT 0.00
  printed_at  TIMESTAMPTZ DEFAULT NOW()

-- PRODUCTOS
products
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name       VARCHAR(120) NOT NULL
  category   VARCHAR(60)           -- 'snack', 'bebida', etc.
  price      NUMERIC(8,2) NOT NULL
  stock      INT NOT NULL DEFAULT 0
  is_active  BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ DEFAULT NOW()

-- VENTAS
sales
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  admin_id    UUID REFERENCES users(id)
  student_id  UUID REFERENCES users(id)  -- nullable (venta anónima)
  total       NUMERIC(10,2) NOT NULL
  sold_at     TIMESTAMPTZ DEFAULT NOW()

-- DETALLE DE VENTA
sale_items
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  sale_id     UUID REFERENCES sales(id)
  product_id  UUID REFERENCES products(id)
  quantity    INT NOT NULL
  unit_price  NUMERIC(8,2) NOT NULL

-- CAJA
cash_register
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
  admin_id         UUID REFERENCES users(id)
  opening_balance  NUMERIC(10,2) NOT NULL
  closing_balance  NUMERIC(10,2)
  opened_at        TIMESTAMPTZ DEFAULT NOW()
  closed_at        TIMESTAMPTZ
  status           ENUM('open', 'closed') DEFAULT 'open'
```

---

## 5. Flujo de Autenticación (JWT)

```
CLIENTE                                   SERVIDOR
  │                                           │
  │── POST /auth/login {email, password} ────▶│
  │                                           │  1. Verifica email en DB
  │                                           │  2. bcrypt.verify(password, hash)
  │                                           │  3. Genera access_token (30 min)
  │                                           │  4. Genera refresh_token (7 días)
  │◀── 200 { access_token, refresh_token } ───│
  │                                           │
  │  [Almacena tokens en MMKV (cifrado)]      │
  │                                           │
  │── GET /games (Authorization: Bearer ...) ▶│
  │                                           │  5. Middleware extrae Bearer token
  │                                           │  6. jwt.decode → payload {sub, role}
  │                                           │  7. Carga usuario de DB
  │                                           │  8. Verifica rol si ruta es admin
  │◀── 200 { data }  ─────────────────────────│
  │                                           │
  │  [Token expirado → interceptor Axios]     │
  │── POST /auth/refresh {refresh_token} ────▶│
  │◀── 200 { access_token } ──────────────────│

Token payload:
{
  "sub": "uuid-del-usuario",
  "role": "student" | "admin",
  "exp": 1234567890
}
```

### Dependencias FastAPI

```python
# Cualquier endpoint protegido
@router.get("/loans", dependencies=[Depends(get_current_user)])

# Solo admin
@router.post("/loans", dependencies=[Depends(require_admin)])

# Solo student
@router.get("/balance", dependencies=[Depends(require_student)])
```

---

## 6. Tecnologías Recomendadas

### Frontend

| Categoría         | Librería                       | Razón                                   |
|-------------------|--------------------------------|-----------------------------------------|
| Framework         | React Native CLI               | Control total, sin capa Expo            |
| Navegación        | React Navigation v6            | Stack + Bottom Tabs + Auth flow         |
| Estado global     | Zustand                        | Liviano, simple, sin boilerplate Redux  |
| HTTP              | Axios                          | Interceptors JWT automáticos            |
| Almacenamiento    | react-native-mmkv              | Más rápido que AsyncStorage, cifrado    |
| UI Components     | React Native Paper             | Material Design 3, bien mantenido       |
| Formularios       | React Hook Form + Zod          | Validación tipada y eficiente           |
| Fechas            | date-fns                       | Liviano y tree-shakeable                |
| Tipos             | TypeScript                     | Seguridad de tipos en todo el proyecto  |

### Backend

| Categoría         | Librería                       | Razón                                   |
|-------------------|--------------------------------|-----------------------------------------|
| Framework         | FastAPI                        | Async, rápido, docs automáticas         |
| ORM               | SQLAlchemy 2.x + asyncpg       | ORM maduro, soporte async               |
| Migraciones       | Alembic                        | Migraciones versionadas                 |
| Auth              | python-jose + passlib[bcrypt]  | JWT estándar + hashing seguro           |
| Config            | pydantic-settings              | Variables de entorno tipadas            |
| Servidor          | Uvicorn                        | ASGI de alto rendimiento                |
| Tests             | pytest + httpx                 | AsyncClient para tests de integración  |

### Infraestructura

| Servicio          | Opción                         | Notas                                   |
|-------------------|--------------------------------|-----------------------------------------|
| Base de datos      | Neon (PostgreSQL serverless)   | Gratis en tier inicial, branching DB    |
| Deploy backend    | Railway / Render               | Gratis para apps pequeñas, CI/CD fácil  |
| Almacenamiento    | Cloudinary / Supabase Storage  | Imágenes de juegos y productos           |
| Variables env     | .env + python-dotenv           | No commitear nunca al repositorio        |

---

## 7. Endpoints REST por Módulo

### Auth
```
POST   /auth/login          → { access_token, refresh_token }
POST   /auth/refresh        → { access_token }
POST   /auth/logout
GET    /users/me            → perfil del usuario autenticado
```

### Juegos
```
GET    /games               → catálogo (student + admin)
GET    /games/{id}          → detalle + instrucciones
POST   /games               → crear juego (admin)
PUT    /games/{id}          → editar juego (admin)
GET    /loans               → historial (admin)
POST   /loans               → registrar préstamo (admin)
PATCH  /loans/{id}/return   → registrar devolución (admin)
POST   /loans/request       → solicitar préstamo (student)
```

### Impresiones
```
GET    /print/balance       → saldo del estudiante autenticado
POST   /print               → registrar impresión (admin)
GET    /print/history       → historial del estudiante
GET    /print/history/all   → historial global (admin)
```

### Productos y Ventas
```
GET    /products            → catálogo
POST   /products            → crear producto (admin)
PUT    /products/{id}       → editar producto (admin)
POST   /sales               → registrar venta (admin)
GET    /sales               → historial ventas (admin)
GET    /sales/report        → reporte con filtros fecha (admin)
POST   /cash-register/open  → apertura de caja (admin)
POST   /cash-register/close → cierre de caja (admin)
GET    /cash-register       → estado actual (admin)
```
