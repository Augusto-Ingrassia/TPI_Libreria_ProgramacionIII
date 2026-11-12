// Ejercicio 1 — Catálogo paginado con búsqueda por título y consulta de autores en GET /api/libros/{id}.
// Diferencia explícitamente: carga, lista vacía, búsqueda sin coincidencias y error de conexión.

var estadoCatalogo = {
  titulo: "",
  limit: 20,
  offset: 0,
  librosActuales: []
};

function leerLimitCatalogo() {
  var input = document.getElementById("catalogo-limit");
  if (!input) return 20;
  var n = parseInt(input.value, 10);
  if (isNaN(n) || n < 1) n = 1;
  if (n > 100) n = 100;
  input.value = String(n);
  return n;
}

function actualizarInfoPaginacionCatalogo() {
  var info = document.getElementById("catalogo-pagina-info");
  if (info) {
    info.textContent =
      "Desplazamiento (offset): " +
      estadoCatalogo.offset +
      " · Límite (limit): " +
      estadoCatalogo.limit +
      (estadoCatalogo.titulo ? ' · Filtro título: "' + estadoCatalogo.titulo + '"' : "");
  }
  var btnAnt = document.getElementById("catalogo-anterior");
  var btnSig = document.getElementById("catalogo-siguiente");
  if (btnAnt) {
    btnAnt.disabled = estadoCatalogo.offset <= 0;
  }
  if (btnSig) {
    btnSig.disabled = estadoCatalogo.librosActuales.length < estadoCatalogo.limit;
  }
}

function crearTarjetaLibroCatalogo(libro) {
  var api = window.LALIBRE_API;
  var tarjeta = document.createElement("article");
  tarjeta.className = "tarjeta-libro";

  var titulo = document.createElement("h4");
  titulo.textContent = libro.titulo;
  tarjeta.appendChild(titulo);

  var isbn = document.createElement("p");
  isbn.textContent = "ISBN: " + libro.isbn;
  tarjeta.appendChild(isbn);

  var editorialNombre = libro.editorial && libro.editorial.nombre ? libro.editorial.nombre : "Sin editorial";
  var editorialP = document.createElement("p");
  editorialP.textContent = "Editorial: " + editorialNombre;
  tarjeta.appendChild(editorialP);

  var generoNombre = libro.genero && libro.genero.nombre ? libro.genero.nombre : "Sin clasificar";
  var generoP = document.createElement("p");
  generoP.textContent = "Género: " + generoNombre;
  tarjeta.appendChild(generoP);

  var precioP = document.createElement("p");
  precioP.textContent = "Precio: " + api.formatearMoneda(libro.precio);
  tarjeta.appendChild(precioP);

  var stockP = document.createElement("p");
  stockP.textContent = "Stock disponible: " + String(libro.stock);
  tarjeta.appendChild(stockP);

  var barra = document.createElement("div");
  barra.className = "barra-acciones";
  var btnDetalle = document.createElement("button");
  btnDetalle.type = "button";
  btnDetalle.className = "boton";
  btnDetalle.textContent = "Ver detalle y autores";
  btnDetalle.addEventListener("click", function () {
    consultarDetalleLibro(libro.id);
  });
  barra.appendChild(btnDetalle);
  tarjeta.appendChild(barra);

  return tarjeta;
}

function renderTarjetasCatalogo(lista) {
  var api = window.LALIBRE_API;
  var contenedor = document.getElementById("catalogo-lista");
  if (!contenedor) return;
  api.vaciarElemento(contenedor);

  var items = Array.isArray(lista) ? lista : [];
  for (var i = 0; i < items.length; i++) {
    contenedor.appendChild(crearTarjetaLibroCatalogo(items[i]));
  }
}

async function consultarDetalleLibro(libroId) {
  var api = window.LALIBRE_API;
  var contenedor = document.getElementById("catalogo-detalle");
  if (!contenedor) return;

  api.mostrarEstado("catalogo-detalle-mensaje", "Consultando detalle de GET /api/libros/" + libroId + "...");
  var res = await api.obtenerLibro(libroId);

  if (!res.ok) {
    api.mostrarEstado("catalogo-detalle-mensaje", res.mensaje, "error");
    return;
  }

  api.mostrarEstado("catalogo-detalle-mensaje", "");
  api.vaciarElemento(contenedor);

  var libro = res.data;
  var h4 = document.createElement("h4");
  h4.textContent = libro.titulo + " (ID " + libro.id + ")";
  contenedor.appendChild(h4);

  var pIsbn = document.createElement("p");
  pIsbn.textContent = "ISBN: " + libro.isbn + " · Precio: " + api.formatearMoneda(libro.precio) + " · Stock: " + libro.stock;
  contenedor.appendChild(pIsbn);

  var editorialTexto = libro.editorial ? libro.editorial.nombre + " (" + libro.editorial.pais + ")" : "Sin editorial";
  var generoTexto = libro.genero && libro.genero.nombre ? libro.genero.nombre : "Sin clasificar";
  var pMeta = document.createElement("p");
  pMeta.textContent = "Editorial: " + editorialTexto + " · Género: " + generoTexto;
  contenedor.appendChild(pMeta);

  var pAutoresTitulo = document.createElement("p");
  pAutoresTitulo.className = "campo__etiqueta";
  pAutoresTitulo.textContent = "Autores registrados:";
  contenedor.appendChild(pAutoresTitulo);

  var autores = Array.isArray(libro.autores) ? libro.autores : [];
  if (autores.length === 0) {
    var pSin = document.createElement("p");
    pSin.textContent = "Sin autores registrados.";
    contenedor.appendChild(pSin);
    return;
  }

  var ul = document.createElement("ul");
  for (var i = 0; i < autores.length; i++) {
    var a = autores[i];
    var li = document.createElement("li");
    li.textContent =
      "Orden " + a.orden + ": " + a.nombre + " — Rol: " + a.rol + " (autor_id: " + a.autor_id + ")";
    ul.appendChild(li);
  }
  contenedor.appendChild(ul);
}

async function cargarCatalogo() {
  var api = window.LALIBRE_API;
  estadoCatalogo.limit = leerLimitCatalogo();

  // Estado 1: Cargando
  api.mostrarEstado("catalogo-mensaje", "Cargando catálogo desde la API...");
  renderTarjetasCatalogo([]);

  var res = await api.listarLibros({
    titulo: estadoCatalogo.titulo,
    limit: estadoCatalogo.limit,
    offset: estadoCatalogo.offset
  });

  // Estado 4: Error de conexión o respuesta de error
  if (!res.ok) {
    estadoCatalogo.librosActuales = [];
    actualizarInfoPaginacionCatalogo();
    if (res.errorConexion) {
      api.mostrarEstado("catalogo-mensaje", "Error de conexión: " + res.mensaje, "error");
    } else {
      api.mostrarEstado("catalogo-mensaje", res.mensaje, "error");
    }
    return;
  }

  var lista = Array.isArray(res.data) ? res.data : [];
  estadoCatalogo.librosActuales = lista;
  renderTarjetasCatalogo(lista);
  actualizarInfoPaginacionCatalogo();

  if (lista.length === 0) {
    if (estadoCatalogo.titulo !== "") {
      // Estado 3: Búsqueda sin coincidencias
      api.mostrarEstado(
        "catalogo-mensaje",
        'Búsqueda sin coincidencias: no se encontraron libros para "' + estadoCatalogo.titulo + '".'
      );
    } else if (estadoCatalogo.offset > 0) {
      api.mostrarEstado(
        "catalogo-mensaje",
        "No hay más libros en este desplazamiento (offset " + estadoCatalogo.offset + "). Volvé a la página anterior."
      );
    } else {
      // Estado 2: Lista vacía
      api.mostrarEstado("catalogo-mensaje", "Lista vacía: todavía no hay libros cargados en el catálogo.");
    }
  } else {
    api.mostrarEstado("catalogo-mensaje", "");
  }
}

function ejecutarBusquedaCatalogo() {
  var input = document.getElementById("catalogo-busqueda");
  estadoCatalogo.titulo = input ? input.value.trim() : "";
  // Al cambiar el filtro se reinicia el desplazamiento (offset = 0)
  estadoCatalogo.offset = 0;
  cargarCatalogo();
}

function limpiarBusquedaCatalogo() {
  var input = document.getElementById("catalogo-busqueda");
  if (input) input.value = "";
  estadoCatalogo.titulo = "";
  estadoCatalogo.offset = 0;
  cargarCatalogo();
}

window.recargarVistaCatalogo = cargarCatalogo;

(function iniciarCatalogo() {
  var btnBuscar = document.getElementById("catalogo-buscar");
  var btnLimpiar = document.getElementById("catalogo-limpiar");
  var btnAnterior = document.getElementById("catalogo-anterior");
  var btnSiguiente = document.getElementById("catalogo-siguiente");
  var inputBusqueda = document.getElementById("catalogo-busqueda");
  var inputLimit = document.getElementById("catalogo-limit");

  if (btnBuscar) btnBuscar.addEventListener("click", ejecutarBusquedaCatalogo);
  if (btnLimpiar) btnLimpiar.addEventListener("click", limpiarBusquedaCatalogo);

  if (btnAnterior) {
    btnAnterior.addEventListener("click", function () {
      estadoCatalogo.limit = leerLimitCatalogo();
      estadoCatalogo.offset = Math.max(0, estadoCatalogo.offset - estadoCatalogo.limit);
      cargarCatalogo();
    });
  }

  if (btnSiguiente) {
    btnSiguiente.addEventListener("click", function () {
      estadoCatalogo.limit = leerLimitCatalogo();
      estadoCatalogo.offset += estadoCatalogo.limit;
      cargarCatalogo();
    });
  }

  if (inputBusqueda) {
    inputBusqueda.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        ejecutarBusquedaCatalogo();
      }
    });
  }

  if (inputLimit) {
    inputLimit.addEventListener("change", function () {
      estadoCatalogo.offset = 0;
      cargarCatalogo();
    });
  }

  cargarCatalogo();
})();
