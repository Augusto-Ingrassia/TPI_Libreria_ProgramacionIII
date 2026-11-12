// Ejercicio 2 — Alta de libros (POST /api/libros/), actualización de precio (PATCH /api/libros/{id}),
// alta de clientes (POST /api/clientes/) y consultas por ID (GET /api/autores/{id}, GET /api/clientes/{id}).

window.LALIBRE_CACHE = {
  editoriales: [],
  generos: [],
  autores: [],
  libros: [],
  clientes: []
};

var autoriasBorradorLibro = [];

function buscarAutorEnCache(id) {
  var lista = window.LALIBRE_CACHE.autores || [];
  for (var i = 0; i < lista.length; i++) {
    if (Number(lista[i].id) === Number(id)) return lista[i];
  }
  return null;
}

function renderSelectoresLibro() {
  var api = window.LALIBRE_API;
  var cache = window.LALIBRE_CACHE;

  var selEd = document.getElementById("libro-editorial");
  if (selEd) {
    api.vaciarElemento(selEd);
    for (var i = 0; i < cache.editoriales.length; i++) {
      var ed = cache.editoriales[i];
      var opt = document.createElement("option");
      opt.value = String(ed.id);
      opt.textContent = ed.nombre + " (" + ed.pais + ") [ID " + ed.id + "]";
      selEd.appendChild(opt);
    }
  }

  var selGen = document.getElementById("libro-genero");
  if (selGen) {
    api.vaciarElemento(selGen);
    var optNulo = document.createElement("option");
    optNulo.value = "";
    optNulo.textContent = "Sin clasificar (nulo)";
    selGen.appendChild(optNulo);
    for (var g = 0; g < cache.generos.length; g++) {
      var gen = cache.generos[g];
      var optG = document.createElement("option");
      optG.value = String(gen.id);
      optG.textContent = gen.nombre + " [ID " + gen.id + "]";
      selGen.appendChild(optG);
    }
  }

  var selAut = document.getElementById("libro-autor-select");
  if (selAut) {
    api.vaciarElemento(selAut);
    for (var a = 0; a < cache.autores.length; a++) {
      var aut = cache.autores[a];
      var optA = document.createElement("option");
      optA.value = String(aut.id);
      optA.textContent = aut.nombre + " (" + aut.nacionalidad + ") [ID " + aut.id + "]";
      selAut.appendChild(optA);
    }
  }

  var selPatch = document.getElementById("patch-libro-select");
  if (selPatch) {
    var previo = selPatch.value;
    api.vaciarElemento(selPatch);
    for (var l = 0; l < cache.libros.length; l++) {
      var lib = cache.libros[l];
      var optL = document.createElement("option");
      optL.value = String(lib.id);
      optL.textContent =
        "#" + lib.id + " — " + lib.titulo + " (Precio actual: " + api.formatearMoneda(lib.precio) + ")";
      selPatch.appendChild(optL);
    }
    if (previo) selPatch.value = previo;
  }
}

function renderTablaAutoriasBorrador() {
  var api = window.LALIBRE_API;
  var tbody = document.querySelector("#libro-autorias-tabla tbody");
  if (!tbody) return;
  api.vaciarElemento(tbody);

  if (autoriasBorradorLibro.length === 0) {
    var trVacio = document.createElement("tr");
    var tdVacio = document.createElement("td");
    tdVacio.colSpan = 5;
    tdVacio.textContent = "Todavía no agregaste autores para este libro. Agregá al menos uno.";
    trVacio.appendChild(tdVacio);
    tbody.appendChild(trVacio);
    return;
  }

  for (var i = 0; i < autoriasBorradorLibro.length; i++) {
    (function (idx) {
      var item = autoriasBorradorLibro[idx];
      var tr = document.createElement("tr");

      var tdId = document.createElement("td");
      tdId.textContent = String(item.autor_id);
      tr.appendChild(tdId);

      var tdNombre = document.createElement("td");
      tdNombre.textContent = item.nombre || "Autor ID " + item.autor_id;
      tr.appendChild(tdNombre);

      var tdRol = document.createElement("td");
      tdRol.textContent = item.rol;
      tr.appendChild(tdRol);

      var tdOrden = document.createElement("td");
      tdOrden.textContent = String(item.orden);
      tr.appendChild(tdOrden);

      var tdAccion = document.createElement("td");
      var btnQuitar = document.createElement("button");
      btnQuitar.type = "button";
      btnQuitar.className = "boton boton--peligro";
      btnQuitar.textContent = "Quitar";
      btnQuitar.addEventListener("click", function () {
        autoriasBorradorLibro.splice(idx, 1);
        renderTablaAutoriasBorrador();
      });
      tdAccion.appendChild(btnQuitar);
      tr.appendChild(tdAccion);

      tbody.appendChild(tr);
    })(i);
  }
}

function renderTablaLibros() {
  var api = window.LALIBRE_API;
  var tbody = document.querySelector("#libros-tabla tbody");
  if (!tbody) return;
  api.vaciarElemento(tbody);

  var lista = window.LALIBRE_CACHE.libros || [];
  if (lista.length === 0) {
    var trV = document.createElement("tr");
    var tdV = document.createElement("td");
    tdV.colSpan = 7;
    tdV.textContent = "No hay libros registrados.";
    trV.appendChild(tdV);
    tbody.appendChild(trV);
    return;
  }

  for (var i = 0; i < lista.length; i++) {
    var libro = lista[i];
    var tr = document.createElement("tr");

    var tdId = document.createElement("td");
    tdId.textContent = String(libro.id);
    tr.appendChild(tdId);

    var tdTitulo = document.createElement("td");
    tdTitulo.textContent = libro.titulo;
    tr.appendChild(tdTitulo);

    var tdIsbn = document.createElement("td");
    tdIsbn.textContent = libro.isbn;
    tr.appendChild(tdIsbn);

    var tdEd = document.createElement("td");
    tdEd.textContent = libro.editorial ? libro.editorial.nombre : "";
    tr.appendChild(tdEd);

    var tdGen = document.createElement("td");
    tdGen.textContent = libro.genero && libro.genero.nombre ? libro.genero.nombre : "Sin clasificar";
    tr.appendChild(tdGen);

    var tdStock = document.createElement("td");
    tdStock.textContent = String(libro.stock);
    tr.appendChild(tdStock);

    var tdPrecio = document.createElement("td");
    tdPrecio.textContent = api.formatearMoneda(libro.precio);
    tr.appendChild(tdPrecio);

    tbody.appendChild(tr);
  }
}

function renderTablaClientes() {
  var api = window.LALIBRE_API;
  var tbody = document.querySelector("#clientes-tabla tbody");
  if (!tbody) return;
  api.vaciarElemento(tbody);

  var lista = window.LALIBRE_CACHE.clientes || [];
  if (lista.length === 0) {
    var trV = document.createElement("tr");
    var tdV = document.createElement("td");
    tdV.colSpan = 3;
    tdV.textContent = "No hay clientes registrados.";
    trV.appendChild(tdV);
    tbody.appendChild(trV);
    return;
  }

  for (var i = 0; i < lista.length; i++) {
    var c = lista[i];
    var tr = document.createElement("tr");

    var tdId = document.createElement("td");
    tdId.textContent = String(c.id);
    tr.appendChild(tdId);

    var tdN = document.createElement("td");
    tdN.textContent = c.nombre;
    tr.appendChild(tdN);

    var tdE = document.createElement("td");
    tdE.textContent = c.email;
    tr.appendChild(tdE);

    tbody.appendChild(tr);
  }
}

async function cargarDatosMaestrosAltas() {
  var api = window.LALIBRE_API;
  var promesas = await Promise.all([
    api.listarEditoriales(),
    api.listarGeneros(),
    api.listarAutores(),
    api.listarLibros({ limit: 100, offset: 0 }),
    api.listarClientes()
  ]);

  if (promesas[0].ok && Array.isArray(promesas[0].data)) {
    window.LALIBRE_CACHE.editoriales = promesas[0].data;
  }
  if (promesas[1].ok && Array.isArray(promesas[1].data)) {
    window.LALIBRE_CACHE.generos = promesas[1].data;
  }
  if (promesas[2].ok && Array.isArray(promesas[2].data)) {
    window.LALIBRE_CACHE.autores = promesas[2].data;
  }
  if (promesas[3].ok && Array.isArray(promesas[3].data)) {
    window.LALIBRE_CACHE.libros = promesas[3].data;
  }
  if (promesas[4].ok && Array.isArray(promesas[4].data)) {
    window.LALIBRE_CACHE.clientes = promesas[4].data;
  }

  renderSelectoresLibro();
  renderTablaAutoriasBorrador();
  renderTablaLibros();
  renderTablaClientes();

  if (typeof window.recargarSelectoresVentas === "function") {
    window.recargarSelectoresVentas();
  }
}

async function verificarAutorPorId() {
  var api = window.LALIBRE_API;
  var input = document.getElementById("libro-autor-id-input");
  var idTexto = input ? input.value.trim() : "";
  if (!idTexto) {
    api.mostrarEstado("libro-autor-verificado", "Ingresá un ID de autor para verificar con GET /api/autores/{id}.", "error");
    return;
  }

  var res = await api.obtenerAutor(idTexto);
  if (!res.ok) {
    api.mostrarEstado("libro-autor-verificado", res.mensaje, "error");
    return;
  }

  var autor = res.data;
  if (!buscarAutorEnCache(autor.id)) {
    window.LALIBRE_CACHE.autores.push(autor);
    renderSelectoresLibro();
  }
  var sel = document.getElementById("libro-autor-select");
  if (sel) sel.value = String(autor.id);

  api.mostrarEstado(
    "libro-autor-verificado",
    "Autor verificado: ID " + autor.id + " — " + autor.nombre + " (" + autor.nacionalidad + ").",
    "exito"
  );
}

async function agregarAutoriaAlBorrador() {
  var api = window.LALIBRE_API;
  var inputManual = document.getElementById("libro-autor-id-input");
  var selectAutor = document.getElementById("libro-autor-select");
  var selectRol = document.getElementById("libro-autor-rol");
  var inputOrden = document.getElementById("libro-autor-orden");

  var idRaw = inputManual && inputManual.value.trim() !== ""
    ? inputManual.value.trim()
    : (selectAutor ? selectAutor.value : "");
  var autorId = parseInt(idRaw, 10);
  if (isNaN(autorId) || autorId <= 0) {
    api.mostrarEstado("libro-autor-verificado", "Seleccioná un autor o ingresá un ID entero positivo.", "error");
    return;
  }

  var rol = selectRol ? selectRol.value : "autor";
  var orden = parseInt(inputOrden ? inputOrden.value : "1", 10);
  if (isNaN(orden) || orden < 1) {
    api.mostrarEstado("libro-autor-verificado", "El orden de autoría debe ser un entero mayor o igual a 1.", "error");
    return;
  }

  var autorEnCache = buscarAutorEnCache(autorId);
  var nombreAutor = autorEnCache ? autorEnCache.nombre : null;

  if (!nombreAutor) {
    var verif = await api.obtenerAutor(autorId);
    if (verif.ok && verif.data) {
      nombreAutor = verif.data.nombre;
      window.LALIBRE_CACHE.autores.push(verif.data);
      renderSelectoresLibro();
    } else {
      nombreAutor = "ID " + autorId + " (no verificado)";
    }
  }

  autoriasBorradorLibro.push({
    autor_id: autorId,
    nombre: nombreAutor,
    rol: rol,
    orden: orden
  });

  if (inputManual) inputManual.value = "";
  if (inputOrden) inputOrden.value = String(autoriasBorradorLibro.length + 1);
  renderTablaAutoriasBorrador();
  api.mostrarEstado(
    "libro-autor-verificado",
    "Autoría agregada: " + nombreAutor + " (" + rol + ", orden " + orden + ").",
    "exito"
  );
}

async function manejarSubmitLibro(ev) {
  ev.preventDefault();
  var api = window.LALIBRE_API;

  var titulo = (document.getElementById("libro-titulo").value || "").trim();
  var isbn = (document.getElementById("libro-isbn").value || "").trim();
  var precioStr = (document.getElementById("libro-precio").value || "").trim();
  var stockStr = (document.getElementById("libro-stock").value || "").trim();
  var editorialStr = document.getElementById("libro-editorial").value;
  var generoStr = document.getElementById("libro-genero").value;

  if (!titulo) {
    api.mostrarEstado("libros-mensaje", "El título del libro es obligatorio.", "error");
    return;
  }
  if (!isbn) {
    api.mostrarEstado("libros-mensaje", "El ISBN del libro es obligatorio.", "error");
    return;
  }
  var precioNum = Number(precioStr);
  if (!precioStr || isNaN(precioNum) || precioNum <= 0) {
    api.mostrarEstado("libros-mensaje", "El precio debe ser un número positivo mayor que 0.", "error");
    return;
  }
  if (!/^\d+$/.test(stockStr)) {
    api.mostrarEstado("libros-mensaje", "El stock debe ser un número entero mayor o igual a 0.", "error");
    return;
  }
  var stockNum = parseInt(stockStr, 10);
  var editorialId = parseInt(editorialStr, 10);
  if (isNaN(editorialId)) {
    api.mostrarEstado("libros-mensaje", "Seleccioná una editorial válida.", "error");
    return;
  }
  if (autoriasBorradorLibro.length === 0) {
    api.mostrarEstado("libros-mensaje", "Agregá al menos un autor con su rol y orden antes de registrar el libro.", "error");
    return;
  }

  var payload = {
    titulo: titulo,
    isbn: isbn,
    precio: precioNum.toFixed(2),
    stock: stockNum,
    editorial_id: editorialId,
    genero_id: generoStr === "" ? null : parseInt(generoStr, 10),
    autores: autoriasBorradorLibro.map(function (a) {
      return {
        autor_id: a.autor_id,
        rol: a.rol,
        orden: a.orden
      };
    })
  };

  var btnSubmit = document.getElementById("libros-submit");
  if (btnSubmit) btnSubmit.disabled = true;
  api.mostrarEstado("libros-mensaje", "Enviando POST /api/libros/...");

  try {
    var res = await api.crearLibro(payload);
    if (!res.ok) {
      api.mostrarEstado("libros-mensaje", res.mensaje + " (HTTP " + res.status + ")", "error");
      return;
    }

    var creado = res.data;
    api.mostrarEstado(
      "libros-mensaje",
      "Libro creado (201): ID " +
        creado.id +
        ' — "' +
        creado.titulo +
        '" (ISBN ' +
        creado.isbn +
        ", precio " +
        api.formatearMoneda(creado.precio) +
        ", stock " +
        creado.stock +
        ").",
      "exito"
    );

    document.getElementById("libros-form").reset();
    document.getElementById("libro-stock").value = "10";
    document.getElementById("libro-autor-orden").value = "1";
    autoriasBorradorLibro = [];
    renderTablaAutoriasBorrador();

    await cargarDatosMaestrosAltas();
    if (typeof window.recargarVistaCatalogo === "function") {
      await window.recargarVistaCatalogo();
    }
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
  }
}

async function manejarPatchPrecioLibro(ev) {
  ev.preventDefault();
  var api = window.LALIBRE_API;
  var sel = document.getElementById("patch-libro-select");
  var inputPrecio = document.getElementById("patch-libro-precio");

  var libroId = sel ? parseInt(sel.value, 10) : NaN;
  var nuevoPrecio = inputPrecio ? Number(inputPrecio.value) : NaN;

  if (isNaN(libroId)) {
    api.mostrarEstado("patch-libro-mensaje", "Seleccioná un libro para actualizar su precio.", "error");
    return;
  }
  if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
    api.mostrarEstado("patch-libro-mensaje", "Ingresá un nuevo precio mayor que 0.", "error");
    return;
  }

  var res = await api.actualizarLibro(libroId, { precio: nuevoPrecio.toFixed(2) });
  if (!res.ok) {
    api.mostrarEstado("patch-libro-mensaje", res.mensaje + " (HTTP " + res.status + ")", "error");
    return;
  }

  var actualizado = res.data;
  api.mostrarEstado(
    "patch-libro-mensaje",
    "Precio actualizado con PATCH /api/libros/" +
      actualizado.id +
      ': "' +
      actualizado.titulo +
      '" ahora cuesta ' +
      api.formatearMoneda(actualizado.precio) +
      ". Las ventas ya registradas en el historial conservan su precio histórico.",
    "exito"
  );
  inputPrecio.value = "";
  await cargarDatosMaestrosAltas();
  if (typeof window.recargarVistaCatalogo === "function") {
    await window.recargarVistaCatalogo();
  }
}

async function manejarSubmitCliente(ev) {
  ev.preventDefault();
  var api = window.LALIBRE_API;

  var nombre = (document.getElementById("cliente-nombre").value || "").trim();
  var email = (document.getElementById("cliente-email").value || "").trim();

  if (!nombre) {
    api.mostrarEstado("clientes-mensaje", "El nombre completo del cliente es obligatorio.", "error");
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    api.mostrarEstado("clientes-mensaje", "Ingresá un correo electrónico con formato válido.", "error");
    return;
  }

  var btn = document.getElementById("clientes-submit");
  if (btn) btn.disabled = true;
  api.mostrarEstado("clientes-mensaje", "Enviando POST /api/clientes/...");

  try {
    var res = await api.crearCliente({ nombre: nombre, email: email });
    if (!res.ok) {
      api.mostrarEstado("clientes-mensaje", res.mensaje + " (HTTP " + res.status + ")", "error");
      return;
    }

    var cliente = res.data;
    api.mostrarEstado(
      "clientes-mensaje",
      "Cliente registrado (201): ID " + cliente.id + " — " + cliente.nombre + " (" + cliente.email + ").",
      "exito"
    );
    document.getElementById("clientes-form").reset();
    var inputBuscar = document.getElementById("cliente-buscar-id");
    if (inputBuscar) inputBuscar.value = String(cliente.id);

    await cargarDatosMaestrosAltas();
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function buscarClientePorId() {
  var api = window.LALIBRE_API;
  var input = document.getElementById("cliente-buscar-id");
  var idTexto = input ? input.value.trim() : "";
  if (!idTexto) {
    api.mostrarEstado("cliente-buscar-resultado", "Ingresá un ID de cliente para consultar GET /api/clientes/{id}.", "error");
    return;
  }

  var res = await api.obtenerCliente(idTexto);
  if (!res.ok) {
    api.mostrarEstado("cliente-buscar-resultado", res.mensaje + " (HTTP " + res.status + ")", "error");
    return;
  }

  var c = res.data;
  var perfilTexto = c.perfil
    ? " · Teléfono: " + c.perfil.telefono + " · Dirección: " + c.perfil.direccion
    : " · Sin perfil adicional";
  api.mostrarEstado(
    "cliente-buscar-resultado",
    "Cliente encontrado (GET /api/clientes/" + c.id + "): ID " + c.id + " — " + c.nombre + " (" + c.email + ")" + perfilTexto,
    "exito"
  );
}

window.recargarDatosMaestros = cargarDatosMaestrosAltas;

(function iniciarAltas() {
  var btnVerifAutor = document.getElementById("libro-autor-verificar");
  var btnAgregarAutor = document.getElementById("libro-autor-agregar");
  var formLibros = document.getElementById("libros-form");
  var btnResetLibros = document.getElementById("libros-reset");
  var formPatchLibro = document.getElementById("libros-patch-form");
  var formClientes = document.getElementById("clientes-form");
  var btnBuscarCliente = document.getElementById("cliente-buscar-btn");

  if (btnVerifAutor) btnVerifAutor.addEventListener("click", verificarAutorPorId);
  if (btnAgregarAutor) btnAgregarAutor.addEventListener("click", agregarAutoriaAlBorrador);
  if (formLibros) formLibros.addEventListener("submit", manejarSubmitLibro);
  if (btnResetLibros) {
    btnResetLibros.addEventListener("click", function () {
      autoriasBorradorLibro = [];
      renderTablaAutoriasBorrador();
      window.LALIBRE_API.mostrarEstado("libros-mensaje", "");
      window.LALIBRE_API.mostrarEstado("libro-autor-verificado", "");
    });
  }
  if (formPatchLibro) formPatchLibro.addEventListener("submit", manejarPatchPrecioLibro);
  if (formClientes) formClientes.addEventListener("submit", manejarSubmitCliente);
  if (btnBuscarCliente) btnBuscarCliente.addEventListener("click", buscarClientePorId);

  cargarDatosMaestrosAltas();
})();
