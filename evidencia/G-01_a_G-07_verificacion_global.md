# Evidencia — Evaluación Global (Casos G-01 a G-07)

Registro de ejecución de los casos de prueba G-01 a G-07 sobre la aplicación integrada (`frontend/` + `backend/` + PostgreSQL 16).

---

## G-01 · Catálogo (`GET /api/libros/` y `GET /api/libros/{id}`)

- **Búsqueda inicial y paginación**:
  - `GET /api/libros/?limit=20&offset=0` → `200 OK` con los 6 libros iniciales (incluyendo `"Antología de la literatura fantástica"` con `genero: null`, renderizado como `Género: Sin clasificar`).
  - Al cambiar `limit=2` y pulsar «Página siguiente», el cliente envía `GET /api/libros/?limit=2&offset=2` → `200 OK`.
- **Búsqueda parcial por título (insensible a mayúsculas)**:
  - Filtro `titulo=rayuela` → reinicia `offset=0` y envía `GET /api/libros/?limit=20&offset=0&titulo=rayuela` → `200 OK` (`[{"id": 1, "titulo": "Rayuela", ...}]`).
- **Búsqueda sin coincidencias**:
  - Filtro `titulo=inexistente_xyz` → `GET /api/libros/?limit=20&offset=0&titulo=inexistente_xyz` → `200 OK` con `[]`. La interfaz muestra el estado específico: `Búsqueda sin coincidencias: no se encontraron libros para "inexistente_xyz".`
- **Detalle y autores del libro**:
  - Al pulsar «Ver detalle y autores» sobre Rayuela (`id=1`), el cliente consulta `GET /api/libros/1` → `200 OK` y muestra:
    - `Orden 1: Julio Cortázar — Rol: autor (autor_id: 2)`

---

## G-02 · Alta de libro (`POST /api/libros/`)

- **Verificación previa de autor por ID**:
  - `GET /api/autores/1` → `200 OK` (`{"id": 1, "nombre": "Jorge Luis Borges", "nacionalidad": "Argentina"}`).
- **Alta válida (`201 Created`)**:
  - Cuerpo enviado a `POST /api/libros/`:
    ```json
    {
      "titulo": "El Aleph (Edición Global)",
      "isbn": "978-950-00-0099-0",
      "precio": "29500.00",
      "stock": 12,
      "editorial_id": 2,
      "genero_id": 2,
      "autores": [
        { "autor_id": 1, "rol": "autor", "orden": 1 }
      ]
    }
    ```
  - Respuesta: `201 Created` con el detalle del libro creado. Se actualizan automáticamente el Catálogo, la tabla de Libros y el selector de Ventas.
- **Rechazo por ISBN repetido (`409 Conflict`)**:
  - Al reenviar el mismo ISBN `978-950-00-0099-0`, el backend responde `409 Conflict` con `{"detail": "Ya existe un libro con ese ISBN"}` y el formulario lo muestra en `#libros-mensaje`.

---

## G-03 · Alta de cliente (`POST /api/clientes/` y `GET /api/clientes/{id}`)

- **Alta válida (`201 Created`)**:
  - Cuerpo enviado a `POST /api/clientes/`:
    ```json
    {
      "nombre": "Lucía Fernández",
      "email": "lucia.fernandez@example.com"
    }
    ```
  - Respuesta: `201 Created` con `{"id": 3, "nombre": "Lucía Fernández", "email": "lucia.fernandez@example.com", "perfil": null}`.
- **Recuperación por ID (`GET /api/clientes/3`)**:
  - Desde el bloque «Consultar cliente por ID», se consulta `GET /api/clientes/3` → `200 OK` mostrando `ID 3 — Lucía Fernández (lucia.fernandez@example.com)`.
- **Rechazo por email repetido (`409 Conflict`)**:
  - Al intentar registrar nuevamente `lucia.fernandez@example.com`, la API responde `409 Conflict` (`{"detail": "Ya existe un cliente con ese email"}`) y se informa en la interfaz.

---

## G-04 · Venta (`POST /api/ventas/`, `GET /api/ventas/` y `GET /api/ventas/{id}`)

- **Envío de venta con dos renglones**:
  - Cuerpo enviado a `POST /api/ventas/`:
    ```json
    {
      "cliente_id": 2,
      "renglones": [
        { "libro_id": 1, "cantidad": 2 },
        { "libro_id": 4, "cantidad": 1 }
      ]
    }
    ```
  - Mientras se procesa el envío, el botón `#ventas-confirmar` permanece deshabilitado (`disabled`).
  - Respuesta: `201 Created`:
    ```json
    {
      "id": 1,
      "fecha": "2026-11-12T12:15:00Z",
      "total": "77000.00",
      "cliente": { "id": 2, "nombre": "Ana Gómez", "email": "ana@example.com" },
      "renglones": [
        { "libro_id": 1, "titulo": "Rayuela", "cantidad": 2, "precio_unitario": "25000.00", "subtotal": "50000.00" },
        { "libro_id": 4, "titulo": "Cuentos de Poe", "cantidad": 1, "precio_unitario": "27000.00", "subtotal": "27000.00" }
      ]
    }
    ```
- **Verificación tras recargar la página (`F5`)**:
  - Al recargar el navegador y abrir «Ver detalle» en el Historial (`GET /api/ventas/1`), la API devuelve exactamente los mismos renglones e importes desde PostgreSQL.

---

## G-05 · Precio histórico (`PATCH /api/libros/{id}` vs `GET /api/ventas/{id}`)

- **Cambio de precio del libro**:
  - Se ejecuta `PATCH /api/libros/1` con `{"precio": "35000.00"}` → `200 OK` (`Rayuela` pasa a costar `$35000.00` en el catálogo).
- **Verificación en el historial**:
  - Se vuelve a consultar `GET /api/ventas/1` en el Historial → el renglón de `Rayuela` conserva `precio_unitario: "25000.00"`, `subtotal: "50000.00"` y el `total: "77000.00"` histórico de la venta.

---

## G-06 · Rechazo (`409` y `422` conservando el borrador)

- **ID inexistente (`409 Conflict`)**:
  - Se envía `POST /api/ventas/` con `cliente_id: 9999` → la API responde `409 Conflict` (`{"detail": "El cliente o alguno de los libros indicados no existe"}`). El borrador en memoria permanece en la tabla de renglones y el historial no sufre modificaciones.
- **Renglones con libro repetido (`422 Unprocessable Entity`)**:
  - Se envía `POST /api/ventas/` con dos renglones para `libro_id: 1` → la API responde `422 Unprocessable Entity` (`Un mismo libro no puede aparecer en dos renglones`). El borrador se conserva intacto y el historial queda igual.

---

## G-07 · Despliegue en Easypanel

- **Construcción del contenedor `frontend`**:
  - Imagen `nginx:1.30-alpine` con `ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$`, archivos públicos en `/usr/share/nginx/html/` y plantilla `/etc/nginx/templates/default.conf.template`.
- **Salud por HTTPS y Proxy `/api/`**:
  - `GET /api/health/ready` bajo el dominio HTTPS del frontend devuelve `200 OK` (`{"estado":"listo","database":"conectada"}`).
- **Persistencia tras redespliegue**:
  - Al redesplegar el servicio en Easypanel, los libros, clientes y ventas continúan disponibles en PostgreSQL.
