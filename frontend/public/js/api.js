// Ejercicio 1 — Cliente HTTP centralizado con fetch y prefijo público /api.
// Conserva la barra final de las rutas que la traen (por ejemplo, /api/libros/).

(function inicializarClienteHttp() {
  var params = typeof window !== "undefined" && window.location && window.location.search
    ? new URLSearchParams(window.location.search)
    : null;
  var urlParam = params ? params.get("apiUrl") : null;

  var API_BASE_URL = "/api";
  if (urlParam) {
    API_BASE_URL = urlParam.replace(/\/+$/, "");
  } else if (typeof window !== "undefined" && window.LALIBRE_API_URL) {
    API_BASE_URL = String(window.LALIBRE_API_URL).replace(/\/+$/, "");
  }

  function construirUrl(ruta, queryParams) {
    var rutaLimpia = ruta.charAt(0) === "/" ? ruta : "/" + ruta;
    var url = API_BASE_URL + rutaLimpia;
    if (!queryParams) {
      return url;
    }
    var search = new URLSearchParams();
    var claves = Object.keys(queryParams);
    for (var i = 0; i < claves.length; i++) {
      var k = claves[i];
      var v = queryParams[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        search.append(k, String(v).trim());
      }
    }
    var qs = search.toString();
    return qs ? url + "?" + qs : url;
  }

  function extraerMensajeError(status, data) {
    if (data && typeof data === "object") {
      if (typeof data.detail === "string" && data.detail.trim() !== "") {
        return data.detail;
      }
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        var partes = data.detail.map(function (err) {
          var msg = err && err.msg ? String(err.msg).replace(/^Value error,\s*/i, "") : "Valor inválido";
          var campo = Array.isArray(err && err.loc) ? err.loc[err.loc.length - 1] : "";
          return campo && campo !== "__root__" && campo !== "body" ? campo + ": " + msg : msg;
        });
        return partes.join(" | ");
      }
    }
    if (status === 409) return "Conflicto con el estado actual en la base de datos (409).";
    if (status === 422) return "Los datos enviados no cumplen el contrato de validación (422).";
    if (status === 404) return "El recurso solicitado no existe (404).";
    return "Error del servidor (HTTP " + status + ").";
  }

  async function peticion(ruta, opciones) {
    var opts = opciones || {};
    var metodo = opts.method || "GET";
    var url = construirUrl(ruta, opts.query);
    var headers = { Accept: "application/json" };
    var fetchOpts = { method: metodo, headers: headers };

    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      fetchOpts.body = JSON.stringify(opts.body);
    }

    try {
      var respuesta = await fetch(url, fetchOpts);
      var datos = null;
      var contentType = respuesta.headers.get("content-type") || "";
      if (contentType.indexOf("application/json") !== -1) {
        datos = await respuesta.json();
      }
      if (!respuesta.ok) {
        return {
          ok: false,
          status: respuesta.status,
          errorConexion: false,
          data: datos,
          mensaje: extraerMensajeError(respuesta.status, datos)
        };
      }
      return {
        ok: true,
        status: respuesta.status,
        errorConexion: false,
        data: datos,
        mensaje: ""
      };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        errorConexion: true,
        data: null,
        mensaje: "No se pudo conectar con la API (" + url + "). Verificá que el backend esté en línea."
      };
    }
  }

  // Utilidades DOM compartidas (sin innerHTML)
  function vaciarElemento(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function mostrarEstado(idElemento, texto, tipo) {
    var el = document.getElementById(idElemento);
    if (!el) return;
    var limpio = texto === undefined || texto === null ? "" : String(texto);
    if (limpio === "") {
      el.textContent = "";
      el.className = "mensaje";
      return;
    }
    var prefijo = "";
    if (tipo === "error" && !/^Error:/i.test(limpio)) {
      prefijo = "Error: ";
    }
    el.textContent = prefijo + limpio;
    el.className = "mensaje" + (tipo ? " mensaje--" + tipo : "");
  }

  function formatearMoneda(valor) {
    var n = Number(valor);
    if (isNaN(n)) return "$" + String(valor);
    return "$" + n.toFixed(2);
  }

  function formatearFechaHora(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("es-AR");
  }

  window.LALIBRE_API = {
    API_BASE_URL: API_BASE_URL,
    peticion: peticion,
    vaciarElemento: vaciarElemento,
    mostrarEstado: mostrarEstado,
    formatearMoneda: formatearMoneda,
    formatearFechaHora: formatearFechaHora,

    // Contratos de Catálogo y Libros
    listarLibros: function (filtros) {
      var f = filtros || {};
      return peticion("/libros/", {
        method: "GET",
        query: {
          limit: f.limit !== undefined ? f.limit : 20,
          offset: f.offset !== undefined ? f.offset : 0,
          titulo: f.titulo,
          genero_id: f.genero_id
        }
      });
    },
    obtenerLibro: function (id) {
      return peticion("/libros/" + encodeURIComponent(id), { method: "GET" });
    },
    crearLibro: function (payload) {
      return peticion("/libros/", { method: "POST", body: payload });
    },
    actualizarLibro: function (id, payload) {
      return peticion("/libros/" + encodeURIComponent(id), { method: "PATCH", body: payload });
    },

    // Contratos de Editoriales, Géneros y Autores
    listarEditoriales: function () {
      return peticion("/editoriales/", { method: "GET", query: { limit: 100, offset: 0 } });
    },
    listarGeneros: function () {
      return peticion("/generos/", { method: "GET", query: { limit: 100, offset: 0 } });
    },
    listarAutores: function () {
      return peticion("/autores/", { method: "GET", query: { limit: 100, offset: 0 } });
    },
    obtenerAutor: function (id) {
      return peticion("/autores/" + encodeURIComponent(id), { method: "GET" });
    },

    // Contratos de Clientes
    listarClientes: function () {
      return peticion("/clientes/", { method: "GET", query: { limit: 100, offset: 0 } });
    },
    obtenerCliente: function (id) {
      return peticion("/clientes/" + encodeURIComponent(id), { method: "GET" });
    },
    crearCliente: function (payload) {
      return peticion("/clientes/", { method: "POST", body: payload });
    },

    // Contratos de Ventas
    listarVentas: function (paginacion) {
      var p = paginacion || {};
      return peticion("/ventas/", {
        method: "GET",
        query: {
          limit: p.limit !== undefined ? p.limit : 20,
          offset: p.offset !== undefined ? p.offset : 0
        }
      });
    },
    obtenerVenta: function (id) {
      return peticion("/ventas/" + encodeURIComponent(id), { method: "GET" });
    },
    crearVenta: function (payload) {
      return peticion("/ventas/", { method: "POST", body: payload });
    }
  };
})();
