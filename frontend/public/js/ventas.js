// Ejercicio 3 — Registrar y consultar ventas (POST /api/ventas/, GET /api/ventas/, GET /api/ventas/{id}).
// Mantiene en memoria el borrador de la venta y lo conserva si el servidor rechaza la operación (409 o 422).

var renglonesVenta = [];
var estadoHistorial = {
  limit: 20,
  offset: 0,
  ventasActuales: []
};

function buscarLibroCache(id) {
  var lista = (window.LALIBRE_CACHE && window.LALIBRE_CACHE.libros) || [];
  for (var i = 0; i < lista.length; i++) {
    if (Number(lista[i].id) === Number(id)) return lista[i];
  }
  return null;
}

function buscarClienteCache(id) {
  var lista = (window.LALIBRE_CACHE && window.LALIBRE_CACHE.clientes) || [];
  for (var i = 0; i < lista.length; i++) {
    if (Number(lista[i].id) === Number(id)) return lista[i];
  }
  return null;
}

function parsearEnteroPositivo(valor) {
  var texto = String(valor === undefined || valor === null ? "" : valor).trim();
  if (!/^\d+$/.test(texto)) return null;
  var n = parseInt(texto, 10);
  return n > 0 ? n : null;
}

function calcularSubtotalEstimado(precio, cantidad) {
  return (Math.round(Number(precio) * 100) * Number(cantidad)) / 100;
}

function renderSelectoresVentas() {
  var api = window.LALIBRE_API;
  var cache = window.LALIBRE_CACHE || { clientes: [], libros: [] };

  var selCli = document.getElementById("venta-cliente");
  if (selCli) {
    var cliPrev = selCli.value;
    api.vaciarElemento(selCli);
    var optVacio = document.createElement("option");
    optVacio.value = "";
    optVacio.textContent = "Seleccioná un cliente...";
    selCli.appendChild(optVacio);

    for (var i = 0; i < cache.clientes.length; i++) {
      var c = cache.clientes[i];
      var optC = document.createElement("option");
      optC.value = String(c.id);
      optC.textContent = "#" + c.id + " — " + c.nombre + " (" + c.email + ")";
      selCli.appendChild(optC);
    }
    if (cliPrev) selCli.value = cliPrev;
  }

  var selLib = document.getElementById("venta-libro");
  if (selLib) {
    var libPrev = selLib.value;
    api.vaciarElemento(selLib);
    for (var j = 0; j < cache.libros.length; j++) {
      var l = cache.libros[j];
      var optL = document.createElement("option");
      optL.value = String(l.id);
      optL.textContent = "#" + l.id + " — " + l.titulo + " (" + api.formatearMoneda(l.precio) + ")";
      selLib.appendChild(optL);
    }
    if (libPrev) selLib.value = libPrev;
  }
}

async function verificarClienteVentaPorId() {
  var api = window.LALIBRE_API;
  var inputManual = document.getElementById("venta-cliente-id-manual");
  var idTexto = inputManual ? inputManual.value.trim() : "";
  if (!idTexto) {
    api.mostrarEstado("venta-cliente-info", "Ingresá un ID de cliente para verificar con GET /api/clientes/{id}.", "error");
    return;
  }

  var res = await api.obtenerCliente(idTexto);
  if (!res.ok) {
    api.mostrarEstado(
      "venta-cliente-info",
      res.mensaje + " (Podés igualmente confirmar con este ID si estás probando el rechazo 409 del Caso G-06).",
      "error"
    );
    return;
  }

  var cli = res.data;
  if (!buscarClienteCache(cli.id)) {
    window.LALIBRE_CACHE.clientes.push(cli);
    renderSelectoresVentas();
  }
  var sel = document.getElementById("venta-cliente");
  if (sel) sel.value = String(cli.id);

  api.mostrarEstado(
    "venta-cliente-info",
    "Cliente seleccionado: ID " + cli.id + " — " + cli.nombre + " (" + cli.email + ").",
    "exito"
  );
}

function renderTotalBorrador() {
  var api = window.LALIBRE_API;
  if (renglonesVenta.length === 0) {
    api.mostrarEstado("ventas-total", "Agregá al menos un renglón para estimar el total de la venta.");
    return;
  }

  var centavos = 0;
  for (var i = 0; i < renglonesVenta.length; i++) {
    var r = renglonesVenta[i];
    var cant = parsearEnteroPositivo(r.cantidad);
    if (cant === null) {
      api.mostrarEstado("ventas-total", "Hay cantidades inválidas en el borrador. Deben ser enteros positivos.", "error");
      return;
    }
    if (r.precio_unitario !== null && r.precio_unitario !== undefined) {
      centavos += Math.round(Number(r.precio_unitario) * 100) * cant;
    }
  }

  api.mostrarEstado(
    "ventas-total",
    "Total estimado en borrador: " +
      api.formatearMoneda(centavos / 100) +
      " (" +
      renglonesVenta.length +
      " renglón/es). El precio definitivo y el total los calcula el servidor al confirmar."
  );
}

function renderRenglonesBorrador() {
  var api = window.LALIBRE_API;
  var tbody = document.querySelector("#ventas-renglones tbody");
  if (!tbody) return;
  api.vaciarElemento(tbody);

  if (renglonesVenta.length === 0) {
    var trV = document.createElement("tr");
    var tdV = document.createElement("td");
    tdV.colSpan = 6;
    tdV.textContent = "La venta todavía no tiene renglones cargados.";
    trV.appendChild(tdV);
    tbody.appendChild(trV);
    renderTotalBorrador();
    return;
  }

  for (var i = 0; i < renglonesVenta.length; i++) {
    (function (idx) {
      var r = renglonesVenta[idx];
      var tr = document.createElement("tr");

      var tdId = document.createElement("td");
      tdId.textContent = String(r.libro_id);
      tr.appendChild(tdId);

      var tdTitulo = document.createElement("td");
      tdTitulo.textContent = r.titulo;
      tr.appendChild(tdTitulo);

      var tdCant = document.createElement("td");
      var inputCant = document.createElement("input");
      inputCant.type = "number";
      inputCant.min = "1";
      inputCant.step = "1";
      inputCant.className = "campo__control";
      inputCant.value = String(r.cantidad);
      inputCant.setAttribute("aria-label", "Cantidad de " + r.titulo);
      tdCant.appendChild(inputCant);
      tr.appendChild(tdCant);

      var tdPrecio = document.createElement("td");
      tdPrecio.textContent = r.precio_unitario !== null ? api.formatearMoneda(r.precio_unitario) : "Desconocido";
      tr.appendChild(tdPrecio);

      var tdSubtotal = document.createElement("td");
      var cantVal = parsearEnteroPositivo(r.cantidad);
      tdSubtotal.textContent =
        cantVal !== null && r.precio_unitario !== null
          ? api.formatearMoneda(calcularSubtotalEstimado(r.precio_unitario, cantVal))
          : "—";
      tr.appendChild(tdSubtotal);

      inputCant.addEventListener("input", function () {
        r.cantidad = inputCant.value;
        var cNueva = parsearEnteroPositivo(r.cantidad);
        tdSubtotal.textContent =
          cNueva !== null && r.precio_unitario !== null
            ? api.formatearMoneda(calcularSubtotalEstimado(r.precio_unitario, cNueva))
            : "Cantidad inválida";
        renderTotalBorrador();
      });

      var tdAccion = document.createElement("td");
      var btnQuitar = document.createElement("button");
      btnQuitar.type = "button";
      btnQuitar.className = "boton boton--peligro";
      btnQuitar.textContent = "Quitar renglón";
      btnQuitar.addEventListener("click", function () {
        renglonesVenta.splice(idx, 1);
        renderRenglonesBorrador();
      });
      tdAccion.appendChild(btnQuitar);
      tr.appendChild(tdAccion);

      tbody.appendChild(tr);
    })(i);
  }

  renderTotalBorrador();
}

function agregarRenglonBorrador() {
  var api = window.LALIBRE_API;
  var inputManualLibro = document.getElementById("venta-libro-id-manual");
  var selectLibro = document.getElementById("venta-libro");
  var inputCant = document.getElementById("venta-cantidad");
  var chkPermitirPruebas = document.getElementById("venta-permitir-duplicado");
  var modoPruebaServidor = chkPermitirPruebas && chkPermitirPruebas.checked;

  var idRaw = inputManualLibro && inputManualLibro.value.trim() !== ""
    ? inputManualLibro.value.trim()
    : (selectLibro ? selectLibro.value : "");
  var libroId = parseInt(idRaw, 10);

  if (isNaN(libroId) || libroId <= 0) {
    api.mostrarEstado("ventas-mensaje", "Seleccioná un libro válido para agregar al renglón.", "error");
    return;
  }

  var cantidad = parsearEnteroPositivo(inputCant ? inputCant.value : "");
  if (cantidad === null) {
    api.mostrarEstado("ventas-mensaje", "La cantidad debe ser un número entero positivo mayor que 0.", "error");
    return;
  }

  var yaExiste = renglonesVenta.some(function (r) {
    return Number(r.libro_id) === libroId;
  });
  if (yaExiste && !modoPruebaServidor) {
    api.mostrarEstado(
      "ventas-mensaje",
      "Ese libro ya figura en un renglón de la venta. Cambiá la cantidad en su fila (o marcá la casilla de prueba G-06 para enviar renglones repetidos al servidor).",
      "error"
    );
    return;
  }

  var libroEnCache = buscarLibroCache(libroId);
  renglonesVenta.push({
    libro_id: libroId,
    titulo: libroEnCache ? libroEnCache.titulo : "Libro ID " + libroId,
    precio_unitario: libroEnCache ? Number(libroEnCache.precio) : null,
    cantidad: String(cantidad)
  });

  if (inputManualLibro) inputManualLibro.value = "";
  if (inputCant) inputCant.value = "1";
  renderRenglonesBorrador();
  api.mostrarEstado("ventas-mensaje", "Renglón agregado al borrador.", "exito");
}

function mostrarResumenVentaConfirmada(venta) {
  var api = window.LALIBRE_API;
  var panel = document.getElementById("ventas-confirmada");
  if (!panel) return;
  panel.classList.remove("esta-oculto");
  api.vaciarElemento(panel);

  var h4 = document.createElement("h4");
  h4.textContent = "Venta registrada en el servidor — ID " + venta.id;
  panel.appendChild(h4);

  var pMeta = document.createElement("p");
  pMeta.textContent =
    "Fecha: " +
    api.formatearFechaHora(venta.fecha) +
    " · Cliente: " +
    venta.cliente.nombre +
    " (" +
    venta.cliente.email +
    ")";
  panel.appendChild(pMeta);

  var ul = document.createElement("ul");
  var renglones = Array.isArray(venta.renglones) ? venta.renglones : [];
  for (var i = 0; i < renglones.length; i++) {
    var r = renglones[i];
    var li = document.createElement("li");
    li.textContent =
      r.titulo +
      " (libro_id " +
      r.libro_id +
      "): " +
      r.cantidad +
      " × " +
      api.formatearMoneda(r.precio_unitario) +
      " = Subtotal " +
      api.formatearMoneda(r.subtotal);
    ul.appendChild(li);
  }
  panel.appendChild(ul);

  var pTotal = document.createElement("p");
  pTotal.className = "campo__etiqueta";
  pTotal.textContent = "Total calculado por la API: " + api.formatearMoneda(venta.total);
  panel.appendChild(pTotal);
}

function limpiarFormularioVenta() {
  renglonesVenta = [];
  var selCli = document.getElementById("venta-cliente");
  var inputCliManual = document.getElementById("venta-cliente-id-manual");
  var inputLibManual = document.getElementById("venta-libro-id-manual");
  var inputCant = document.getElementById("venta-cantidad");
  if (selCli) selCli.value = "";
  if (inputCliManual) inputCliManual.value = "";
  if (inputLibManual) inputLibManual.value = "";
  if (inputCant) inputCant.value = "1";
  window.LALIBRE_API.mostrarEstado("venta-cliente-info", "");
  renderRenglonesBorrador();
}

async function confirmarVentaEnApi() {
  var api = window.LALIBRE_API;
  var inputCliManual = document.getElementById("venta-cliente-id-manual");
  var selCli = document.getElementById("venta-cliente");
  var chkPermitirPruebas = document.getElementById("venta-permitir-duplicado");
  var modoPruebaServidor = chkPermitirPruebas && chkPermitirPruebas.checked;

  var clienteRaw = inputCliManual && inputCliManual.value.trim() !== ""
    ? inputCliManual.value.trim()
    : (selCli ? selCli.value : "");
  var clienteId = parseInt(clienteRaw, 10);

  if (isNaN(clienteId) || clienteId <= 0) {
    api.mostrarEstado("ventas-mensaje", "Seleccioná un cliente o indicá un ID de cliente antes de confirmar.", "error");
    return;
  }

  if (renglonesVenta.length === 0) {
    api.mostrarEstado("ventas-mensaje", "Agregá al menos un renglón antes de confirmar la venta.", "error");
    return;
  }

  var renglonesPayload = [];
  var idsVistos = {};
  for (var i = 0; i < renglonesVenta.length; i++) {
    var r = renglonesVenta[i];
    var cant = parsearEnteroPositivo(r.cantidad);
    if (cant === null) {
      api.mostrarEstado(
        "ventas-mensaje",
        'La cantidad del libro "' + r.titulo + '" debe ser un entero positivo mayor que 0.',
        "error"
      );
      return;
    }
    if (idsVistos[r.libro_id] && !modoPruebaServidor) {
      api.mostrarEstado(
        "ventas-mensaje",
        "No se permite repetir el mismo libro en dos renglones.",
        "error"
      );
      return;
    }
    idsVistos[r.libro_id] = true;
    renglonesPayload.push({
      libro_id: Number(r.libro_id),
      cantidad: cant
    });
  }

  // El cuerpo lleva únicamente cliente_id y renglones[{libro_id, cantidad}]
  var payload = {
    cliente_id: clienteId,
    renglones: renglonesPayload
  };

  var btnConfirmar = document.getElementById("ventas-confirmar");
  var textoOriginal = btnConfirmar ? btnConfirmar.textContent : "Confirmar venta";
  if (btnConfirmar) {
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = "Procesando envío...";
  }
  api.mostrarEstado("ventas-mensaje", "Enviando POST /api/ventas/...");

  try {
    var res = await api.crearVenta(payload);
    if (!res.ok) {
      // Se conserva el borrador en memoria cuando se rechaza la operación (409 o 422)
      api.mostrarEstado(
        "ventas-mensaje",
        res.mensaje + " (HTTP " + res.status + "). El borrador de la venta se conservó sin cambios.",
        "error"
      );
      return;
    }

    var ventaConfirmada = res.data;
    mostrarResumenVentaConfirmada(ventaConfirmada);
    limpiarFormularioVenta();
    api.mostrarEstado(
      "ventas-mensaje",
      "Venta #" +
        ventaConfirmada.id +
        " registrada con éxito (201 Created). Total calculado por la API: " +
        api.formatearMoneda(ventaConfirmada.total) +
        ".",
      "exito"
    );

    await cargarHistorialVentas();
    await mostrarDetalleVentaEnHistorial(ventaConfirmada.id);
  } finally {
    if (btnConfirmar) {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = textoOriginal;
    }
  }
}

function leerLimitHistorial() {
  var input = document.getElementById("historial-limit");
  if (!input) return 20;
  var n = parseInt(input.value, 10);
  if (isNaN(n) || n < 1) n = 1;
  if (n > 100) n = 100;
  input.value = String(n);
  return n;
}

function actualizarInfoPaginacionHistorial() {
  var info = document.getElementById("historial-pagina-info");
  if (info) {
    info.textContent =
      "Desplazamiento (offset): " + estadoHistorial.offset + " · Límite (limit): " + estadoHistorial.limit;
  }
  var btnAnt = document.getElementById("historial-anterior");
  var btnSig = document.getElementById("historial-siguiente");
  if (btnAnt) btnAnt.disabled = estadoHistorial.offset <= 0;
  if (btnSig) btnSig.disabled = estadoHistorial.ventasActuales.length < estadoHistorial.limit;
}

function renderTablaHistorial(lista) {
  var api = window.LALIBRE_API;
  var tbody = document.querySelector("#historial-tabla tbody");
  if (!tbody) return;
  api.vaciarElemento(tbody);

  var items = Array.isArray(lista) ? lista : [];
  if (items.length === 0) {
    var trV = document.createElement("tr");
    var tdV = document.createElement("td");
    tdV.colSpan = 5;
    tdV.textContent =
      estadoHistorial.offset > 0
        ? "No hay más ventas en este desplazamiento (offset " + estadoHistorial.offset + ")."
        : "Todavía no hay ventas registradas.";
    trV.appendChild(tdV);
    tbody.appendChild(trV);
    return;
  }

  for (var i = 0; i < items.length; i++) {
    (function (venta) {
      var tr = document.createElement("tr");

      var tdId = document.createElement("td");
      tdId.textContent = "#" + venta.id;
      tr.appendChild(tdId);

      var tdFecha = document.createElement("td");
      tdFecha.textContent = api.formatearFechaHora(venta.fecha);
      tr.appendChild(tdFecha);

      var tdCliente = document.createElement("td");
      tdCliente.textContent = venta.cliente
        ? venta.cliente.nombre + " (" + venta.cliente.email + ")"
        : "";
      tr.appendChild(tdCliente);

      var tdTotal = document.createElement("td");
      tdTotal.textContent = api.formatearMoneda(venta.total);
      tr.appendChild(tdTotal);

      var tdDetalle = document.createElement("td");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "boton";
      btn.textContent = "Ver detalle";
      btn.setAttribute("aria-label", "Ver detalle de la venta " + venta.id);
      btn.addEventListener("click", function () {
        mostrarDetalleVentaEnHistorial(venta.id);
      });
      tdDetalle.appendChild(btn);
      tr.appendChild(tdDetalle);

      tbody.appendChild(tr);
    })(items[i]);
  }
}

async function cargarHistorialVentas() {
  var api = window.LALIBRE_API;
  estadoHistorial.limit = leerLimitHistorial();
  api.mostrarEstado("historial-mensaje", "Consultando historial en GET /api/ventas/...");

  var res = await api.listarVentas({
    limit: estadoHistorial.limit,
    offset: estadoHistorial.offset
  });

  if (!res.ok) {
    estadoHistorial.ventasActuales = [];
    actualizarInfoPaginacionHistorial();
    api.mostrarEstado("historial-mensaje", res.mensaje, "error");
    return;
  }

  var lista = Array.isArray(res.data) ? res.data : [];
  estadoHistorial.ventasActuales = lista;
  renderTablaHistorial(lista);
  actualizarInfoPaginacionHistorial();
  api.mostrarEstado("historial-mensaje", "");
}

async function mostrarDetalleVentaEnHistorial(ventaId) {
  var api = window.LALIBRE_API;
  var contenedor = document.getElementById("historial-detalle");
  if (!contenedor) return;

  api.mostrarEstado("historial-detalle-mensaje", "Abriendo GET /api/ventas/" + ventaId + "...");
  var res = await api.obtenerVenta(ventaId);

  if (!res.ok) {
    api.mostrarEstado("historial-detalle-mensaje", res.mensaje, "error");
    return;
  }

  api.mostrarEstado("historial-detalle-mensaje", "");
  api.vaciarElemento(contenedor);

  var venta = res.data;
  var h4 = document.createElement("h4");
  h4.textContent = "Detalle de la venta #" + venta.id;
  h4.tabIndex = -1;
  contenedor.appendChild(h4);

  var pFecha = document.createElement("p");
  pFecha.textContent = "Fecha: " + api.formatearFechaHora(venta.fecha);
  contenedor.appendChild(pFecha);

  var pCliente = document.createElement("p");
  pCliente.textContent =
    "Cliente: " +
    (venta.cliente ? venta.cliente.nombre + " (" + venta.cliente.email + ") [ID " + venta.cliente.id + "]" : "");
  contenedor.appendChild(pCliente);

  var envolvente = document.createElement("div");
  envolvente.className = "tabla-contenedor";
  var tabla = document.createElement("table");
  tabla.className = "tabla";
  var caption = document.createElement("caption");
  caption.textContent = "Renglones e importes históricos de la venta #" + venta.id;
  tabla.appendChild(caption);

  var thead = document.createElement("thead");
  var trHead = document.createElement("tr");
  ["Libro ID", "Título", "Cantidad", "Precio unitario histórico", "Subtotal"].forEach(function (col) {
    var th = document.createElement("th");
    th.scope = "col";
    th.textContent = col;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  tabla.appendChild(thead);

  var tbody = document.createElement("tbody");
  var renglones = Array.isArray(venta.renglones) ? venta.renglones : [];
  for (var i = 0; i < renglones.length; i++) {
    var r = renglones[i];
    var tr = document.createElement("tr");

    var tdId = document.createElement("td");
    tdId.textContent = String(r.libro_id);
    tr.appendChild(tdId);

    var tdTit = document.createElement("td");
    tdTit.textContent = r.titulo;
    tr.appendChild(tdTit);

    var tdCant = document.createElement("td");
    tdCant.textContent = String(r.cantidad);
    tr.appendChild(tdCant);

    var tdPre = document.createElement("td");
    tdPre.textContent = api.formatearMoneda(r.precio_unitario);
    tr.appendChild(tdPre);

    var tdSub = document.createElement("td");
    tdSub.textContent = api.formatearMoneda(r.subtotal);
    tr.appendChild(tdSub);

    tbody.appendChild(tr);
  }
  tabla.appendChild(tbody);
  envolvente.appendChild(tabla);
  contenedor.appendChild(envolvente);

  var pTotal = document.createElement("p");
  pTotal.className = "campo__etiqueta";
  pTotal.textContent = "Total histórico de la venta: " + api.formatearMoneda(venta.total);
  contenedor.appendChild(pTotal);
}

window.recargarSelectoresVentas = renderSelectoresVentas;
window.recargarHistorialVentas = cargarHistorialVentas;

(function iniciarVentas() {
  var btnVerifCli = document.getElementById("venta-cliente-verificar");
  var btnAgregar = document.getElementById("venta-agregar");
  var btnConfirmar = document.getElementById("ventas-confirmar");
  var btnCancelar = document.getElementById("ventas-cancelar");
  var btnRecargarHist = document.getElementById("historial-recargar");
  var btnHistAnt = document.getElementById("historial-anterior");
  var btnHistSig = document.getElementById("historial-siguiente");
  var inputHistLimit = document.getElementById("historial-limit");

  if (btnVerifCli) btnVerifCli.addEventListener("click", verificarClienteVentaPorId);
  if (btnAgregar) btnAgregar.addEventListener("click", agregarRenglonBorrador);
  if (btnConfirmar) btnConfirmar.addEventListener("click", confirmarVentaEnApi);
  if (btnCancelar) {
    btnCancelar.addEventListener("click", function () {
      limpiarFormularioVenta();
      window.LALIBRE_API.mostrarEstado("ventas-mensaje", "Borrador de venta cancelado y limpiado.");
    });
  }

  if (btnRecargarHist) btnRecargarHist.addEventListener("click", cargarHistorialVentas);
  if (btnHistAnt) {
    btnHistAnt.addEventListener("click", function () {
      estadoHistorial.limit = leerLimitHistorial();
      estadoHistorial.offset = Math.max(0, estadoHistorial.offset - estadoHistorial.limit);
      cargarHistorialVentas();
    });
  }
  if (btnHistSig) {
    btnHistSig.addEventListener("click", function () {
      estadoHistorial.limit = leerLimitHistorial();
      estadoHistorial.offset += estadoHistorial.limit;
      cargarHistorialVentas();
    });
  }
  if (inputHistLimit) {
    inputHistLimit.addEventListener("change", function () {
      estadoHistorial.offset = 0;
      cargarHistorialVentas();
    });
  }

  renderSelectoresVentas();
  renderRenglonesBorrador();
  cargarHistorialVentas();
})();
