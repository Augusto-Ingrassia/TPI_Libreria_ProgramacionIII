# Despliegue en Easypanel — Global de Programación III

Documentación completa del despliegue integrado (`frontend` + `backend` + `PostgreSQL 16`) en la VPS administrada con **Easypanel**.

---

## 1. Resumen del Despliegue

| Parámetro | Valor |
| :--- | :--- |
| **Proyecto en Easypanel** | `el_piso_es_laburo-3` |
| **URL pública HTTPS (Frontend + `/api/`)** | `https://el-piso-es-laburo-3-frontend.sajp60.easypanel.host` *(o el dominio HTTPS asignado al servicio `frontend`)* |
| **Endpoint de salud a través del Proxy** | `https://el-piso-es-laburo-3-frontend.sajp60.easypanel.host/api/health/ready` |
| **Servicio Backend (interno en Easypanel)** | `libreria-api` (o `backend`) — escucha en `0.0.0.0:8000` |
| **Servicio Base de Datos (interno en Easypanel)** | `libreria-db` (`postgres:16-alpine`, puerto privado `5432`) |
| **Revisión / Rama** | `main` |

---

## 2. Arquitectura y Proxy Inverso en Easypanel

```text
Navegador del usuario (HTTPS :443)
        │
        ▼
Traefik (Easypanel)
        │  HTTP interno -> puerto 80
        ▼
Servicio App "frontend" (nginx:1.30-alpine)
  ├── GET /...       ──► Sirve /usr/share/nginx/html (frontend/public/)
  └── /api/...       ──► proxy_pass http://${API_UPSTREAM}/;
                              │  Red interna de Easypanel (puerto 8000)
                              ▼
                    Servicio App "libreria-api" / "backend" (FastAPI + Uvicorn 0.0.0.0:8000)
                              │  Red interna de Easypanel (puerto 5432 privado)
                              ▼
                    Servicio Postgres "libreria-db" (PostgreSQL 16)
```

- La barra final en `proxy_pass http://${API_UPSTREAM}/;` dentro de `frontend/default.conf.template` hace que cualquier petición a `/api/libros/` llegue a FastAPI como `/libros/`.
- El cliente HTTP (`frontend/public/js/api.js`) centraliza todas las llamadas `fetch` con base `/api` conservando las barras finales.

---

## 3. Configuración de los Servicios en Easypanel

### A. Servicio PostgreSQL (`libreria-db`)
- **Tipo**: Servicio Postgres de Easypanel (`postgres:16-alpine`).
- **Puerto**: `5432` (mantenido privado dentro de la red interna del proyecto).
- **Host interno**: `el_piso_es_laburo-3_libreria-db`.

### B. Servicio Backend (`libreria-api` / `backend`)
- **Tipo**: App Service.
- **Source (Origen)**:
  - Repositorio Git del grupo, rama `main`.
  - **Build Path**: `/backend` (si se usa el monorepo) o `/` (si apunta al repositorio del backend).
- **Build**:
  - Builder: `Dockerfile`
  - Ruta relativa: `Dockerfile` (`python:3.12-alpine`, usuario `appuser`, `EXPOSE 8000`).
- **Environment (Variables de entorno — sólo nombres, sin credenciales reales)**:
  ```env
  DATABASE_URL=postgresql+asyncpg://<USUARIO>:<PASSWORD>@el_piso_es_laburo-3_libreria-db:5432/<NOMBRE_DB>
  SQL_ECHO=false
  APP_PORT=8000
  CORS_ORIGINS=*
  ```
- **Esquema y Carga Inicial**:
  - Al iniciar el contenedor, el `lifespan` de FastAPI ejecuta `SQLModel.metadata.create_all` y crea las 9 tablas del dominio si no existen.
  - Desde la pestaña **Console / Shell** del servicio backend se comprueba la salud y se cargan los datos iniciales (idempotente):
    ```bash
    URL=http://127.0.0.1:8000/health/ready
    python -c "from urllib.request import urlopen; print(urlopen('$URL').status)"
    python -m app.initial_data
    ```

### C. Servicio Frontend (`frontend`)
- **Tipo**: App Service en el mismo proyecto `el_piso_es_laburo-3`.
- **Source (Origen)**:
  - Repositorio Git del grupo, rama `main`.
  - **Build Path**: `/frontend`.
- **Build**:
  - Builder: `Dockerfile`
  - Ruta relativa: `Dockerfile` (`nginx:1.30-alpine`, `ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$`).
- **Environment (Variables de entorno)**:
  ```env
  API_UPSTREAM=el_piso_es_laburo-3_libreria-api:8000
  ```
  *(Nota: Si el servicio backend se llamó `backend`, usar `API_UPSTREAM=el_piso_es_laburo-3_backend:8000`).*
- **Domains (Dominio público HTTPS)**:
  - **HTTPS**: Activado.
  - **Protocolo destino**: `HTTP`.
  - **Puerto destino**: `80`.
  - **Ruta**: `/`.

---

## 4. Pasos de Actualización y Redespliegue sin Pérdida de Datos

1. Subir los cambios al repositorio Git (`git push origin main`).
2. En Easypanel, entrar al servicio modificado (`frontend` o `backend`) y pulsar **Deploy**.
3. Easypanel reconstruye la imagen y reemplaza únicamente el contenedor de la aplicación.
4. Los datos permanecen intactos porque viven en el volumen persistente del servicio PostgreSQL (`libreria-db`), y `create_all` al iniciar el backend sólo crea tablas faltantes sin borrar ni truncar registros existentes.

---

## 5. Registro de Casos de Prueba (`G-01` a `G-07`)

| Caso | Qué se prueba | Pasos ejecutados desde la URL pública | Resultado observado |
| :--- | :--- | :--- | :--- |
| **G-01 · Catálogo** | Búsqueda por título, paginación (`limit`/`offset`), búsqueda sin coincidencias y detalle de libro | 1. Consultar catálogo inicial (`GET /api/libros/?limit=20&offset=0`).<br>2. Filtrar por `"rayuela"` y comprobar reinicio de `offset=0`.<br>3. Cambiar `limit=2` y avanzar con «Página siguiente» (`offset=2`).<br>4. Buscar `"zzzz_inexistente"` y verificar mensaje de búsqueda sin coincidencias.<br>5. Hacer clic en «Ver detalle y autores» (`GET /api/libros/1`). | Devuelve `200 OK` en todas las lecturas; muestra tarjetas con editorial y género (`«Sin clasificar»` cuando es `null`), y en el detalle lista los autores con su `rol` y `orden`. |
| **G-02 · Alta de libro** | Crear libro con stock, género opcional y autorías; consultar detalle; repetir ISBN (409) | 1. En vista **Libros**, verificar autor ID `1` (`GET /api/autores/1`), agregar autoría (`rol: autor`, `orden: 1`), completar título, ISBN nuevo, precio, stock y enviar `POST /api/libros/`.<br>2. Consultar su detalle en Catálogo.<br>3. Volver a enviar el mismo ISBN. | El primer envío responde **`201 Created`** y actualiza catálogo y selectores. El segundo envío con ISBN repetido responde **`409 Conflict`** mostrando el mensaje del servidor. |
| **G-03 · Alta de cliente** | Crear cliente, recuperarlo por ID (`GET /api/clientes/{id}`) y repetir email (409) | 1. En vista **Clientes**, registrar cliente nuevo con nombre y email (`POST /api/clientes/`).<br>2. Buscar el ID devuelto en «Consultar cliente por ID» (`GET /api/clientes/{id}`).<br>3. Intentar crear otro cliente con el mismo email. | El alta devuelve **`201 Created`**; la consulta por ID devuelve **`200 OK`** con los datos del cliente; el email repetido devuelve **`409 Conflict`** con el mensaje propio del backend. |
| **G-04 · Venta** | Registrar venta válida con dos renglones (201) y consultar detalle tras recargar | 1. En vista **Ventas**, seleccionar cliente, agregar 2 libros distintos con cantidades enteras positivas y confirmar (`POST /api/ventas/`).<br>2. Recargar la página (`F5`), ir a **Historial** y abrir «Ver detalle» (`GET /api/ventas/{id}`). | `POST /api/ventas/` responde **`201 Created`** con precios unitarios copiados del catálogo, subtotales y total calculado por la API. Tras recargar la página, la venta sigue en el historial con el mismo detalle. |
| **G-05 · Precio histórico** | Cambiar precio con `PATCH /api/libros/{id}` y verificar que la venta anterior conserva sus importes | 1. En vista **Libros**, usar el formulario `PATCH /api/libros/{id}` para cambiar el precio de uno de los libros vendidos en G-04.<br>2. Volver a **Historial** y abrir el detalle de la venta anterior (`GET /api/ventas/{id}`). | El libro muestra el nuevo precio en el catálogo (`200 OK`), mientras que la venta anterior en el historial conserva intactos su `precio_unitario`, `subtotal` y `total` históricos. |
| **G-06 · Rechazo** | Probar ID inexistente (409) y renglones repetidos (422); verificar que borrador e historial quedan iguales | 1. En **Ventas**, activar la casilla de prueba G-06, poner `cliente_id: 9999` y confirmar → recibe `409`.<br>2. Con un cliente válido, agregar dos renglones del mismo `libro_id` y confirmar → recibe `422`. | El servidor rechaza con **`409 Conflict`** y **`422 Unprocessable Entity`** respectivamente; la interfaz muestra el error del servidor, **conserva el borrador en memoria** y el historial no agrega ventas inválidas. |
| **G-07 · Despliegue** | Imagen frontend construida, URL pública HTTPS, `/api/health/ready` en 200 y persistencia tras redespliegue | 1. Construir y desplegar `frontend` en Easypanel.<br>2. Abrir `<URL_HTTPS>/api/health/ready`.<br>3. Redesplegar el servicio y volver a consultar `<URL_HTTPS>` y el historial de ventas. | La URL pública abre por **HTTPS**, `/api/health/ready` responde **`200 OK`** (`{"estado":"listo","database":"conectada"}`) y todas las ventas y libros persisten tras el redespliegue. |
