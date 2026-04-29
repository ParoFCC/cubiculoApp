# CubiculoApp — Revisión técnica · Abril 2026

## 1. Bugs confirmados

### B-01 · `/auth/verify-email` siempre lanza 500
**Archivo:** `backend/app/routers/auth.py`  
El endpoint `POST /auth/verify-email` (sin `-full`) termina con `raise HTTPException(status_code=500, detail="Use /verify-email-full")`. Si algún cliente llama a esa ruta (antigua integración, deep link, etc.) recibirá un 500 engañoso.  
**Fix:** eliminar el endpoint muerto o responder 410 Gone.

---

### B-02 · SQL dinámico con f-string en `main.py`
**Archivo:** `backend/app/main.py` línea ~88  
```python
await conn.execute(sa.text(
    "UPDATE users SET is_super_admin = TRUE "
    f"WHERE student_id = '{settings.SUPER_ADMIN_ID}' "   # ← SQLi potencial
    "AND is_super_admin = FALSE"
))
```
`SUPER_ADMIN_ID` viene de `.env`, pero si algún día se edita con caracteres especiales (`'` o `;`) hay inyección SQL.  
**Fix:** usar parámetros enlazados: `sa.text("... WHERE student_id = :sid").bindparams(sid=settings.SUPER_ADMIN_ID)`.

---

### B-03 · `quantity_avail` no se recalcula al editar `quantity_total`
**Archivo:** `backend/app/services/games_service.py` — `update_game`  
Si un admin cambia `quantity_total` de 3 → 5 el campo `quantity_avail` no se ajusta, quedando desfasado.  
**Fix:** en `update_game`, si `quantity_total` cambia, calcular el delta y aplicarlo a `quantity_avail`.

---

### B-04 · Tokens de refresco sin revocación (logout vacío)
**Archivo:** `backend/app/routers/auth.py` — `POST /auth/logout`  
El endpoint devuelve 204 sin invalidar el refresh token. Un token robado sigue siendo válido hasta expirar (7 días).  
**Fix a corto plazo:** añadir tabla `token_blacklist` o una lista en Redis y verificar en `/auth/refresh`.

---

### B-05 · Rate limiting faltante en `/auth/verify-email-full`
**Archivo:** `backend/app/routers/auth.py`  
`/register` tiene `@limiter.limit("5/minute")` pero `/verify-email-full` no tiene decorador, permitiendo fuerza bruta del código de 6 dígitos (1M combinaciones pero 10^6 intentos/min).  
**Fix:** agregar `@limiter.limit("10/minute")` y bloquear el código tras 5 intentos fallidos.

---

### B-06 · `GameCatalogScreen` no refresca tras préstamo exitoso
**Archivo:** `src/screens/student/games/GameCatalogScreen.tsx`  
El catálogo se carga en `useEffect` pero no usa `useFocusEffect`, por lo que si el estudiante registra un préstamo y vuelve, el stock mostrado es el antiguo.  
**Fix:** reemplazar `useEffect` por `useFocusEffect`.

---

### B-07 · `LoanHistoryScreen` no muestra error si `getLoanHistory` falla
**Archivo:** `src/screens/admin/games/LoanHistoryScreen.tsx`  
El bloque `catch` en `loadLoans` silencia el error sin notificar al usuario, dejando la pantalla vacía sin explicación.  
**Fix:** mostrar un Toast con el mensaje de error o un estado vacío con mensaje.

---

### B-08 · `RegisterLoanScreen` — juegos cargados sin `useFocusEffect`
**Archivo:** `src/screens/admin/games/RegisterLoanScreen.tsx`  
La lista de juegos se carga en un `useEffect` de montaje. Si el admin acaba de agregar un juego en `InventoryScreen` y navega a `RegisterLoan`, el juego nuevo no aparecerá.  
**Fix:** usar `useFocusEffect`.

---

## 2. Deuda técnica / Code smells

### D-01 · `useNavigation<any>()` en todas las pantallas
Más de 10 pantallas usan `useNavigation<any>()` perdiendo type-safety de navegación.  
Oportunidad de definir `RootStackParamList` completo en `src/navigation/types.ts`.

---

### D-02 · IP hardcodeada en `api.ts`
```ts
"http://146.190.119.145:8085"  // ← DropletIP:puerto
```
Si la IP del droplet cambia hay que hacer un nuevo build. Mover a variable de entorno con `react-native-config` o `expo-constants`.

---

### D-03 · `timeout` de Axios demasiado bajo (10 s) para uploads
Subir un PDF de 50 MB con un timeout de 10 s fallará casi siempre.  
**Fix:** crear una segunda instancia de Axios con `timeout: 120_000` exclusiva para `uploadService`.

---

### D-04 · `_configure()` en `upload_service.py` se llama en cada upload
Llama `cloudinary.config(...)` en cada invocación. Es idempotente pero innecesario.  
**Fix:** configurar una sola vez al inicio (en `lifespan`).

---

### D-05 · `printing_service.py` tiene precios hardcodeados
```python
unit_cost = {"bw": 0.50, "color_text": 1.00, "color_images_half": 2.50}[payload.kind.value]
```
No están en `Settings` ni en la base de datos, hacen falta cambios de código para modificarlos.

---

### D-06 · Falta paginación en `GameCatalogScreen` (estudiante)
La API soporta `skip/limit` en préstamos pero el catálogo de juegos del estudiante carga todo en un array. Con catálogos grandes el render es lento.

---

### D-07 · Tests sin fixture de cubículo real
Los tests de juegos/préstamos no envían el header `X-Cubiculo-Id`, lo que significa que esos tests fallan si el dependency `get_cubiculo_id` es requerido. Verificar cobertura real con `pytest --cov`.

---

### D-08 · No hay manejo offline en la app
Si el droplet es inaccesible la app sólo muestra pantallas vacías sin mensaje de "sin conexión".

---

## 3. Oportunidades de mejora

### O-01 · Push Notifications para vencimiento de préstamos
El cron `_mark_overdue_loans` corre cada hora pero no notifica al estudiante. Con Firebase Cloud Messaging (FCM) se puede avisar 24 h antes del vencimiento.

### O-02 · Modo oscuro
La app usa colores fijos. Adoptar `useColorScheme` + tema dinámico para modo oscuro.

### O-03 · Búsqueda global también en estudiantes
El `searchService` y la pantalla de búsqueda solo existe para admins. Los estudiantes podrían beneficiarse de buscar juegos por nombre desde el catálogo.  
*(El filtro de texto ya existe; podría expandirse a descripción/instrucciones.)*

### O-04 · Exportar historial (CSV/PDF)
El historial de préstamos y ventas no tiene opción de exportar. Útil para reportes mensuales del cubículo.

### O-05 · Imágenes de productos
Los productos (`ProductCreate`) tienen precio, nombre y descripción pero no tienen `image_url`. Homogeneizar con juegos.

### O-06 · WebSocket o polling para dashboard en tiempo real
El dashboard usa `useFocusEffect` pero sin auto-refresco. Un intervalo de 30 s (o websocket) mantendría métricas actualizadas sin acción del admin.

### O-07 · Validación de contraseña más robusta
El registro sólo valida longitud ≥ 8. Agregar al menos un dígito/mayúscula reduce el riesgo de contraseñas triviales.

### O-08 · Health check endpoint documentado
El backend no tiene un `GET /health` estandarizado con estado de DB, Cloudinary, etc. Útil para monitoreo desde el droplet (cron/uptime robot).

---

## 4. Plan de tareas (priorizado)

### 🔴 Prioridad 1 — Seguridad / Bugs críticos

| # | Tarea | Archivo(s) | Esfuerzo |
|---|-------|-----------|----------|
| T-01 | Corregir SQL dinámico con f-string → parámetros enlazados | `backend/app/main.py` | 10 min |
| T-02 | Agregar `@limiter.limit` a `/verify-email-full` + bloqueo tras 5 intentos | `backend/app/routers/auth.py` | 30 min |
| T-03 | Eliminar endpoint `/verify-email` muerto (devolver 410) | `backend/app/routers/auth.py` | 5 min |
| T-04 | Implementar blacklist básica de refresh tokens en DB | `backend/app/routers/auth.py`, nuevo modelo `RefreshToken` | 2 h |

### 🟠 Prioridad 2 — Bugs de lógica

| # | Tarea | Archivo(s) | Esfuerzo |
|---|-------|-----------|----------|
| T-05 | Recalcular `quantity_avail` al cambiar `quantity_total` en `update_game` | `backend/app/services/games_service.py` | 15 min |
| T-06 | Reemplazar `useEffect` por `useFocusEffect` en `GameCatalogScreen` | `src/screens/student/games/GameCatalogScreen.tsx` | 10 min |
| T-07 | Reemplazar `useEffect` por `useFocusEffect` en `RegisterLoanScreen` | `src/screens/admin/games/RegisterLoanScreen.tsx` | 10 min |
| T-08 | Mostrar error en `LoanHistoryScreen` cuando `getLoanHistory` falla | `src/screens/admin/games/LoanHistoryScreen.tsx` | 15 min |

### 🟡 Prioridad 3 — Calidad / DX

| # | Tarea | Archivo(s) | Esfuerzo |
|---|-------|-----------|----------|
| T-09 | Mover IP del droplet a variable de entorno con `react-native-config` | `src/services/api.ts`, `.env` | 1 h |
| T-10 | Axios instance separada con `timeout: 120 000` para uploads | `src/services/uploadService.ts`, `src/services/api.ts` | 20 min |
| T-11 | Mover precios de impresión a `Settings` (`.env`) | `backend/app/services/printing_service.py`, `backend/app/core/config.py` | 30 min |
| T-12 | Configurar Cloudinary una sola vez en `lifespan` | `backend/app/main.py`, `backend/app/services/upload_service.py` | 20 min |
| T-13 | Añadir `GET /health` con chequeo de DB y Cloudinary | nuevo `backend/app/routers/health.py` | 45 min |
| T-14 | Definir `RootStackParamList` y tipar todas las navegaciones | `src/navigation/types.ts` (nuevo), todos los screens | 3 h |
| T-15 | Arreglar fixtures de tests para incluir `X-Cubiculo-Id` | `backend/tests/conftest.py` | 1 h |

### 🟢 Prioridad 4 — Mejoras de producto

| # | Tarea | Archivo(s) | Esfuerzo |
|---|-------|-----------|----------|
| T-16 | Agregar `image_url` a productos (schema + modelo + UI) | `backend/app/schemas/products.py`, `backend/app/models/products.py`, `src/screens/admin/products/` | 2 h |
| T-17 | FCM push notifications para préstamos próximos a vencer | nuevo servicio backend + RN push | 1 día |
| T-18 | Exportar historial préstamos/ventas a CSV | backend endpoint + RN share | 4 h |
| T-19 | Auto-refresco del dashboard cada 30 s | `src/screens/admin/dashboard/DashboardScreen.tsx` | 30 min |
| T-20 | Modo oscuro con `useColorScheme` | global theme provider + todos los screens | 2–3 días |
| T-21 | Validación de contraseña más robusta (mínimo 1 número + 1 mayúscula) | `backend/app/routers/auth.py`, `src/screens/auth/RegisterScreen.tsx` | 30 min |
| T-22 | Banner de "sin conexión" cuando el backend es inalcanzable | `src/services/api.ts`, componente global | 1 h |

---

*Generado automáticamente · revisión manual recomendada antes de ejecutar cualquier tarea de Prioridad 1.*
