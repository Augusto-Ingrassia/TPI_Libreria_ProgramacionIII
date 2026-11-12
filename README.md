# Global de Programación III — Librería Web Integrada ("la libre")

Aplicación web integrada que conecta las pantallas en **HTML5, CSS3 y JavaScript nativo** del Frontend (`frontend/`) con la **API REST asincrónica en FastAPI + SQLModel + PostgreSQL 16** del Backend (`backend/`), servida bajo un mismo origen mediante **Nginx Reverse Proxy** (`/api/` → `http://${API_UPSTREAM}/`) y desplegada en **Easypanel**.

---

## Integrantes del Grupo

- Lautaro Mejías
- Augusto Ingrassia
- Franco Squillo
- Uriel Vega
- Matheo Bazán
- Elías Pérez

---

## Estructura del Proyecto

```text
TPI_Programacion/
├── frontend/
│   ├── Dockerfile              # Imagen nginx:1.30-alpine con NGINX_ENVSUBST_FILTER=^API_UPSTREAM$
│   ├── .dockerignore           # Excluye .git, .env, node_modules y .DS_Store
│   ├── default.conf.template   # Plantilla Nginx: sirve / y redirige /api/ -> http://${API_UPSTREAM}/
│   └── public/                 # Archivos públicos estáticos
│       ├── index.html          # Interfaz integrada (Catálogo, Libros, Clientes, Ventas, Historial)
│       ├── css/                # Estilos propios (base.css, layout.css, componentes.css)
│       └── js/                 # Cliente HTTP centralizado y lógica (api.js, catalogo.js, altas.js, ventas.js)
├── backend/
│   ├── app/                    # Módulos FastAPI + SQLModel (health, editoriales, generos, autores, libros, clientes, ventas)
│   ├── tests/                  # Suite de pruebas automatizadas (pytest)
│   ├── test/                   # Colecciones de peticiones .http
│   ├── Dockerfile              # Imagen python:3.12-alpine (usuario sin privilegios appuser, puerto 8000)
│   ├── .dockerignore           # Exclusiones del build de backend
│   ├── requirements.txt        # Dependencias de producción
│   └── env.example             # Ejemplo de variables del backend
├── evidencia/                  # Evidencia de pruebas y despliegue (casos G-01 a G-07 y D-01 a D-07)
├── env.example                 # Variables de entorno de ejemplo de ambos servicios
├── DEPLOY.md                   # Configuración, arquitectura, variables y pasos de despliegue en Easypanel
└── README.md                   # Este documento
```

---

## Decisiones de Integración (Consultas por ID y Listados)

En cumplimiento de la consigna del **Ejercicio 2 (*Consultas por ID*)**:
- El backend implementa tanto las **consultas individuales por ID** (`GET /autores/{id}` y `GET /clientes/{id}`) como los **listados paginados** (`GET /autores/` y `GET /clientes/`).
- En el frontend se integraron **ambas modalidades** para ofrecer la mejor experiencia y cubrir todos los casos de prueba (`G-02`, `G-03` y `G-06`):
  1. Los selectores `<select>` se pueblan automáticamente desde `GET /api/editoriales/`, `GET /api/generos/`, `GET /api/autores/` y `GET /api/clientes/`.
  2. Además, cada formulario cuenta con un buscador/verificador explícito por ID que consulta **`GET /api/autores/{id}`** (mostrando nombre y nacionalidad antes de agregar la autoría con su `rol` y `orden`) y **`GET /api/clientes/{id}`** (mostrando nombre, email y perfil del cliente recuperado por ID).

---

## Cómo Ejecutar Localmente y Cargar Datos de Prueba

### 1. Levantar el Backend y Cargar Datos Iniciales (Seed)

Desde la carpeta `backend/` con Python 3.12+ y una base PostgreSQL 16 activa:

```bash
cd backend
python -m venv .venv
# Windows (PowerShell): .\.venv\Scripts\Activate.ps1  |  Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env
# Editar .env con DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/libreria_db
```

El esquema de tablas se crea automáticamente en el `lifespan` al iniciar la aplicación (`SQLModel.metadata.create_all`). Iniciar el servidor en `0.0.0.0:8000`:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

En otra terminal (con el entorno virtual activo), ejecutar el comando idempotente de **carga de datos iniciales** (crea editoriales, géneros, autores, 6 libros con sus autorías y clientes de prueba):

```bash
cd backend
python -m app.initial_data
```

### 2. Construir y Ejecutar el Contenedor del Frontend en Local

Desde la carpeta `frontend/`, con Docker Desktop iniciado:

```powershell
cd frontend
docker build -t libreria-frontend .
docker run --rm --name libreria-frontend -p 127.0.0.1:8080:80 -e API_UPSTREAM=host.docker.internal:8000 libreria-frontend
```

*(En Linux agregar `--add-host=host.docker.internal:host-gateway` al `docker run`).*

### 3. Comprobación en el Navegador

1. Abrir **`http://127.0.0.1:8080/api/health/ready`** → debe responder `200 OK` con `{"estado":"listo","database":"conectada"}`.
2. Abrir **`http://127.0.0.1:8080`** → consultar el catálogo, abrir el detalle de un libro con sus autores, dar de alta libros/clientes y registrar ventas viendo el historial persistido en PostgreSQL.
