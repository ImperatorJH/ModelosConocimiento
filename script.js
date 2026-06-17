const STORAGE_KEY = 'vetcitas:citas';
const WEBHOOK_URL = '/api/webhook/nueva-cita';
const CITAS_URL = '/api/webhook/citas';
const CLIENTE_URL = '/api/webhook/cliente';
const MASCOTAS_URL = '/api/webhook/mascotas';
const CLIENTES_URL = '/api/webhook/clientes';
const CANCELAR_CITA_URL = '/api/webhook/eliminar-cita';
const HORARIOS_URL = '/api/webhook/horarios';
const VETERINARIOS_URL = '/api/webhook/veterinarios';
const VETERINARIOS_GESTION_URL = '/api/webhook/veterinarios-gestion';
const VETERINARIO_URL = '/api/webhook/veterinario';
const VETERINARIO_ESTADO_URL = '/api/webhook/veterinario-estado';

const citasIniciales = [];

let citas = cargarCitas();
let nextId = citas.reduce((max, cita) => Math.max(max, cita.id), 0) + 1;
let clientes = [];
let filtroCitasTexto = '';
let filtroCitasEstado = '';
let horariosDisponibles = [];
let veterinarios = [];
let veterinariosGestion = [];

function cargarCitas() {
  try {
    const guardadas = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return Array.isArray(guardadas) ? guardadas : citasIniciales;
  } catch {
    return citasIniciales;
  }
}

function normalizarCitaRemota(cita) {
  return {
    id: Number(cita.id || cita.id_cita || 0),
    identificacion: cita.identificacion || '',
    id_veterinario: Number(cita.id_veterinario || 0),
    dueno: cita.dueno || '',
    telefono: cita.telefono || '',
    email: cita.email || '',
    mascota: cita.mascota || '',
    especie: cita.especie || '',
    tipo: cita.tipo || cita.tipo_caso || '',
    prioridad: cita.prioridad || prioridadPorTipo(cita.tipo || cita.tipo_caso || ''),
    fecha: String(cita.fecha || cita.fecha_cita || '').slice(0, 10),
    hora: String(cita.hora || cita.hora_cita || '').slice(0, 5),
    estado: cita.estado || 'Pendiente',
    obs: cita.obs || cita.observaciones || '',
  };
}

async function cargarCitasRemotas(mostrarError = false) {
  try {
    const response = await fetch(CITAS_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudieron consultar las citas');

    const data = await response.json();
    const lista = Array.isArray(data) ? data : data.citas;
    if (!Array.isArray(lista)) throw new Error('Respuesta de citas invalida');

    citas = lista.map(normalizarCitaRemota).filter(cita => cita.id || cita.dueno || cita.mascota);
    nextId = citas.reduce((max, cita) => Math.max(max, cita.id), 0) + 1;
    guardarCitas();
    updateStats();
    aplicarFiltrosCitas();
  } catch (error) {
    console.warn('Usando citas locales porque no se pudo consultar n8n/MySQL.', error);
    if (mostrarError) showToast('No pude cargar citas desde n8n. Mostrando datos locales.', true);
    aplicarFiltrosCitas();
    updateStats();
  }
}

function guardarCitas() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(citas));
}

function showPage(name, trigger) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  const page = document.getElementById(`page-${name}`);
  if (page) page.classList.add('active');

  const activeBtn = trigger || document.querySelector(`.nav-btn[data-page="${name}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  if (name === 'citas') aplicarFiltrosCitas();
  if (name === 'clientes') cargarClientesRemotos();
  if (name === 'veterinarios') cargarVeterinariosGestion();
  if (name === 'dashboard') updateStats();
}

function updateStats() {
  const hoy = fechaLocalISO();
  document.getElementById('stat-total').textContent = citas.length;
  document.getElementById('stat-conf').textContent = citas.filter(c => c.estado === 'Confirmada' && c.fecha === hoy).length;
  document.getElementById('stat-pend').textContent = citas.filter(c => c.estado === 'Pendiente').length;
}

function fechaLocalISO() {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, '0');
  const day = String(ahora.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function prioridadPorTipo(tipo) {
  if (tipo === 'Emergencia') return 'Alta';
  if (tipo === 'Consulta general') return 'Media';
  return 'Baja';
}

function prioridadBadge(prioridad) {
  if (prioridad === 'Alta') return 'badge-alta';
  if (prioridad === 'Media') return 'badge-media';
  return 'badge-baja';
}

function estadoBadge(estado) {
  if (estado === 'Confirmada') return 'badge-conf';
  if (estado === 'Cancelada') return 'badge-cancel';
  if (estado === 'Finalizada') return 'badge-baja';
  if (estado === 'En atencion') return 'badge-media';
  return 'badge-pend';
}

function formatearHora(hora) {
  if (!hora) return '';
  const [hour, minute] = hora.split(':').map(Number);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  return `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${suffix}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderCitas(lista) {
  const tbody = document.getElementById('citas-body');

  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No hay citas registradas.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(cita => `
    <tr>
      <td class="muted-cell">#${cita.id}</td>
      <td><strong>${escapeHtml(cita.dueno)}</strong></td>
      <td>${escapeHtml(cita.mascota)} <span class="muted-cell">(${escapeHtml(cita.especie)})</span></td>
      <td>${escapeHtml(cita.tipo)}</td>
      <td><span class="badge ${prioridadBadge(cita.prioridad)}">${cita.prioridad}</span></td>
      <td>${cita.fecha}<br><span class="muted-cell">${formatearHora(cita.hora)}</span></td>
      <td><span class="badge ${estadoBadge(cita.estado)}">${cita.estado}</span></td>
      <td class="actions-cell">
        <button class="btn-action" onclick="toggleEstado(${cita.id})" ${cita.estado === 'Cancelada' ? 'disabled' : ''}>
          ${cita.estado === 'Pendiente' ? 'Confirmar' : 'Pendiente'}
        </button>
        <button class="btn-action danger" onclick="cancelarCita(${cita.id})" ${cita.estado === 'Cancelada' ? 'disabled' : ''}>Cancelar</button>
      </td>
    </tr>
  `).join('');
}

function filtrarCitas(query) {
  filtroCitasTexto = query;
  aplicarFiltrosCitas();
}

function filtrarCitasEstado(estado) {
  filtroCitasEstado = estado;
  aplicarFiltrosCitas();
}

function aplicarFiltrosCitas() {
  const q = filtroCitasTexto.trim().toLowerCase();
  const filtradas = citas.filter(cita =>
    (!filtroCitasEstado || cita.estado === filtroCitasEstado) &&
    (
      cita.dueno.toLowerCase().includes(q) ||
      cita.mascota.toLowerCase().includes(q) ||
      cita.tipo.toLowerCase().includes(q) ||
      cita.estado.toLowerCase().includes(q) ||
      cita.fecha.includes(q)
    )
  );
  renderCitas(filtradas);
}

function toggleEstado(id) {
  const cita = citas.find(item => item.id === id);
  if (!cita) return;

  cita.estado = cita.estado === 'Confirmada' ? 'Pendiente' : 'Confirmada';
  guardarCitas();
  aplicarFiltrosCitas();
  updateStats();
  showToast(`Cita ${cita.estado === 'Confirmada' ? 'confirmada' : 'marcada como pendiente'}.`);
}

async function cancelarCita(id) {
  const cita = citas.find(item => item.id === id);
  if (!cita) return;
  if (cita.estado === 'Cancelada') return;

  const confirmar = window.confirm(`Cancelar la cita #${id} de ${cita.mascota}?`);
  if (!confirmar) return;

  const estadoAnterior = cita.estado;
  cita.estado = 'Cancelada';
  guardarCitas();
  aplicarFiltrosCitas();
  updateStats();
  evalDMN();

  try {
    const response = await fetch(CANCELAR_CITA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_cita: id, estado: 'Cancelada' }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'No se pudo cancelar en MySQL');
    }
    await cargarCitasRemotas();
    showToast('Cita cancelada en MySQL.');
  } catch (error) {
    cita.estado = estadoAnterior;
    guardarCitas();
    aplicarFiltrosCitas();
    updateStats();
    showToast(error.message || 'No se pudo cancelar la cita en n8n/MySQL.', true);
  }
}

function horarioOcupado(fecha, hora) {
  const idVeterinario = fieldValue('f-veterinario');
  return citas.some(cita =>
    cita.fecha === fecha &&
    cita.hora === hora &&
    cita.estado !== 'Cancelada' &&
    (!idVeterinario || !cita.id_veterinario || String(cita.id_veterinario) === idVeterinario)
  );
}

function fieldValue(id) {
  const field = document.getElementById(id);
  if (!field) {
    console.error(`No se encontro el campo #${id}. Revise que index.html y script.js esten actualizados.`);
    return '';
  }
  return typeof field.value === 'string' ? field.value.trim() : '';
}

function especieOptions(selected = '') {
  return ['Perro', 'Gato', 'Ave', 'Conejo', 'Reptil', 'Otro']
    .map(especie => `<option value="${especie}" ${especie === selected ? 'selected' : ''}>${especie}</option>`)
    .join('');
}

function agregarMascotaCliente(data = {}) {
  const list = document.getElementById('c-mascotas-list');
  const row = document.createElement('div');
  row.className = 'pet-row';
  row.innerHTML = `
    <div class="form-group">
      <label>Nombre *</label>
      <input type="text" class="pet-nombre" placeholder="Ej: Toby" value="${escapeHtml(data.nombre || '')}">
    </div>
    <div class="form-group">
      <label>Especie *</label>
      <select class="pet-especie">
        <option value="">Seleccionar...</option>
        ${especieOptions(data.especie || '')}
      </select>
    </div>
    <div class="form-group">
      <label>Raza</label>
      <input type="text" class="pet-raza" placeholder="Opcional" value="${escapeHtml(data.raza || '')}">
    </div>
    <div class="form-group">
      <label>Observaciones</label>
      <input type="text" class="pet-observaciones" placeholder="Notas" value="${escapeHtml(data.observaciones || '')}">
    </div>
    <button class="btn-action danger pet-remove" type="button" onclick="eliminarMascotaCliente(this)">Eliminar</button>
  `;
  list.appendChild(row);
}

function eliminarMascotaCliente(button) {
  const rows = document.querySelectorAll('#c-mascotas-list .pet-row');
  if (rows.length <= 1) {
    showToast('Debe quedar al menos una mascota.', true);
    return;
  }
  button.closest('.pet-row').remove();
}

function obtenerMascotasFormulario() {
  return [...document.querySelectorAll('#c-mascotas-list .pet-row')]
    .map(row => ({
      nombre: row.querySelector('.pet-nombre').value.trim(),
      especie: row.querySelector('.pet-especie').value,
      raza: row.querySelector('.pet-raza').value.trim(),
      observaciones: row.querySelector('.pet-observaciones').value.trim(),
    }))
    .filter(mascota => mascota.nombre || mascota.especie || mascota.raza || mascota.observaciones);
}

function evalDMN() {
  const tipo = fieldValue('f-tipo');
  const identificacion = fieldValue('f-identificacion');
  const idVeterinario = fieldValue('f-veterinario');
  const fecha = fieldValue('f-fecha');
  const hora = fieldValue('f-hora');
  const box = document.getElementById('dmn-result');

  const mascota = fieldValue('f-mascota');

  if (!tipo || !identificacion || !mascota || !idVeterinario || !fecha || !hora) {
    box.classList.remove('show');
    return;
  }

  const disponible = !horarioOcupado(fecha, hora);
  const prioridad = prioridadPorTipo(tipo);
  const clienteLocal = citas.some(cita => cita.identificacion === identificacion);
  let accion = '';

  if (disponible && clienteLocal) {
    accion = 'Accion DMN: cliente reconocido, confirmar cita.';
  } else if (disponible && !clienteLocal) {
    accion = 'Accion DMN: validar identificacion en MySQL antes de confirmar.';
  } else if (!disponible && clienteLocal) {
    accion = 'Accion DMN: horario ocupado, mostrar horarios alternativos.';
  } else {
    accion = 'Accion DMN: registrar cliente y elegir otro horario.';
  }

  box.innerHTML = `<strong>Prioridad asignada:</strong> ${prioridad}<br><strong>Identificacion:</strong> ${clienteLocal ? 'Encontrada en esta agenda' : 'Se validara en MySQL'}<br><strong>Horario:</strong> ${formatearHora(hora)}<br><strong>Disponibilidad:</strong> ${disponible ? 'Disponible' : 'Ocupado'}<br>${accion}`;
  box.classList.add('show');
}

async function crearCliente() {
  const identificacion = fieldValue('c-identificacion');
  const nombres = fieldValue('c-nombres');
  const apellidos = fieldValue('c-apellidos');
  const telefono = fieldValue('c-tel');
  const email = fieldValue('c-email');
  const direccion = fieldValue('c-direccion');
  const mascotas = obtenerMascotasFormulario();

  if (!identificacion || !nombres || !apellidos || !telefono || !email) {
    showToast('Complete identificacion, nombres, apellidos, telefono y email.', true);
    return;
  }

  if (!email.includes('@')) {
    showToast('Ingrese un email valido para notificaciones.', true);
    return;
  }

  if (!mascotas.length || mascotas.some(mascota => !mascota.nombre || !mascota.especie)) {
    showToast('Agregue al menos una mascota con nombre y especie.', true);
    return;
  }

  try {
    const response = await fetch(CLIENTE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identificacion,
        nombres,
        apellidos,
        telefono,
        email,
        direccion,
        mascotas,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'No se pudo crear el cliente');
    }

    resetClienteFormulario();
    if (fieldValue('f-identificacion') === identificacion) {
      await cargarMascotasCliente(false);
    }
    await cargarClientesRemotos();
    showToast(`Cliente ${nombres} ${apellidos} registrado.`);
  } catch (error) {
    showToast(error.message || 'No se pudo registrar el cliente en n8n.', true);
  }
}

function normalizarClienteRemoto(cliente) {
  return {
    id: Number(cliente.id || cliente.id_cliente || 0),
    identificacion: cliente.identificacion || '',
    nombres: cliente.nombres || '',
    apellidos: cliente.apellidos || '',
    telefono: cliente.telefono || '',
    email: cliente.email || '',
    direccion: cliente.direccion || '',
    mascotas: Array.isArray(cliente.mascotas) ? cliente.mascotas : [],
  };
}

async function cargarClientesRemotos(mostrarError = false) {
  const contenedor = document.getElementById('clientes-list');
  if (!contenedor) return;

  contenedor.innerHTML = '<div class="empty-row">Cargando clientes...</div>';

  try {
    const response = await fetch(CLIENTES_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudieron consultar los clientes');

    const data = await response.json();
    const lista = Array.isArray(data) ? data : data.clientes;
    if (!Array.isArray(lista)) throw new Error('Respuesta de clientes invalida');

    clientes = lista.map(normalizarClienteRemoto);
    renderClientes(clientes);
  } catch (error) {
    console.warn('No se pudieron cargar clientes desde n8n/MySQL.', error);
    contenedor.innerHTML = '<div class="empty-row">No se pudieron cargar clientes desde n8n/MySQL.</div>';
    if (mostrarError) showToast('No pude cargar clientes desde n8n/MySQL.', true);
  }
}

function renderClientes(lista) {
  const contenedor = document.getElementById('clientes-list');

  if (!lista.length) {
    contenedor.innerHTML = '<div class="empty-row">No hay clientes registrados.</div>';
    return;
  }

  contenedor.innerHTML = lista.map(cliente => {
    const nombreCompleto = `${cliente.nombres} ${cliente.apellidos}`.trim();
    const identificacionArg = JSON.stringify(cliente.identificacion).replace(/"/g, '&quot;');
    const mascotasHtml = cliente.mascotas.length
      ? cliente.mascotas.map(mascota => `
          <span class="pet-chip">
            <strong>${escapeHtml(mascota.nombre)}</strong>
            ${escapeHtml(mascota.especie)}
          </span>
        `).join('')
      : '<span class="muted-cell">Sin mascotas registradas</span>';

    return `
      <article class="client-card">
        <div class="client-main">
          <div>
            <h3>${escapeHtml(nombreCompleto || 'Cliente sin nombre')}</h3>
            <p>ID ${escapeHtml(cliente.identificacion)} - ${escapeHtml(cliente.telefono)} - ${escapeHtml(cliente.email)}</p>
          </div>
          <button class="btn-action" type="button" onclick="usarClienteEnCita(${identificacionArg})">Agendar</button>
        </div>
        <div class="client-pets">${mascotasHtml}</div>
      </article>
    `;
  }).join('');
}

function filtrarClientes(query) {
  const q = query.trim().toLowerCase();
  const filtrados = clientes.filter(cliente =>
    cliente.identificacion.toLowerCase().includes(q) ||
    cliente.nombres.toLowerCase().includes(q) ||
    cliente.apellidos.toLowerCase().includes(q) ||
    cliente.telefono.toLowerCase().includes(q) ||
    cliente.email.toLowerCase().includes(q) ||
    cliente.mascotas.some(mascota =>
      String(mascota.nombre || '').toLowerCase().includes(q) ||
      String(mascota.especie || '').toLowerCase().includes(q)
    )
  );
  renderClientes(filtrados);
}

async function usarClienteEnCita(identificacion) {
  showPage('nueva');
  document.getElementById('f-identificacion').value = identificacion;
  await cargarMascotasCliente(false);
  showToast('Cliente cargado para agendar cita.');
}

async function cargarMascotasCliente(mostrarError = false) {
  const identificacion = fieldValue('f-identificacion');
  const select = document.getElementById('f-mascota');
  const especie = document.getElementById('f-especie');

  select.innerHTML = '<option value="">Cargando mascotas...</option>';
  select.disabled = true;
  especie.value = '';

  if (!identificacion) {
    select.innerHTML = '<option value="">Ingrese la identificacion primero...</option>';
    if (mostrarError) showToast('Ingrese la identificacion del dueno.', true);
    return;
  }

  try {
    const response = await fetch(`${MASCOTAS_URL}?identificacion=${encodeURIComponent(identificacion)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudieron consultar las mascotas');

    const data = await response.json();
    const mascotas = Array.isArray(data) ? data : data.mascotas;
    if (!Array.isArray(mascotas) || !mascotas.length) {
      select.innerHTML = '<option value="">No hay mascotas registradas...</option>';
      if (mostrarError) showToast('Ese cliente no tiene mascotas registradas.', true);
      return;
    }

    select.innerHTML = '<option value="">Seleccionar mascota...</option>' + mascotas.map(mascota => (
      `<option value="${escapeHtml(mascota.nombre)}" data-especie="${escapeHtml(mascota.especie)}">${escapeHtml(mascota.nombre)} (${escapeHtml(mascota.especie)})</option>`
    )).join('');
    select.disabled = false;
  } catch (error) {
    console.warn('No se pudieron cargar mascotas.', error);
    select.innerHTML = '<option value="">Error cargando mascotas...</option>';
    if (mostrarError) showToast('No pude cargar mascotas desde n8n/MySQL.', true);
  }
}

async function cargarVeterinarios() {
  const select = document.getElementById('f-veterinario');
  if (!select) return;

  select.innerHTML = '<option value="">Cargando veterinarios...</option>';
  select.disabled = true;

  try {
    const response = await fetch(VETERINARIOS_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudieron consultar los veterinarios');

    const data = await response.json();
    const lista = Array.isArray(data) ? data : data.veterinarios;
    if (!Array.isArray(lista) || !lista.length) throw new Error('No hay veterinarios activos');

    veterinarios = lista.map(veterinario => ({
      id: Number(veterinario.id || veterinario.id_veterinario || 0),
      nombre: veterinario.nombre || `${veterinario.nombres || ''} ${veterinario.apellidos || ''}`.trim(),
      especialidad: veterinario.especialidad || '',
    })).filter(veterinario => veterinario.id);

    select.innerHTML = '<option value="">Seleccionar veterinario...</option>' + veterinarios.map(veterinario => (
      `<option value="${veterinario.id}">${escapeHtml(veterinario.nombre)}${veterinario.especialidad ? ` - ${escapeHtml(veterinario.especialidad)}` : ''}</option>`
    )).join('');
    select.disabled = false;
  } catch (error) {
    console.warn('No se pudieron cargar veterinarios.', error);
    select.innerHTML = '<option value="">Error cargando veterinarios...</option>';
    showToast('No pude cargar veterinarios desde n8n/MySQL.', true);
  }
}

function normalizarVeterinario(veterinario) {
  return {
    id: Number(veterinario.id || veterinario.id_veterinario || 0),
    nombres: veterinario.nombres || '',
    apellidos: veterinario.apellidos || '',
    nombre: veterinario.nombre || `${veterinario.nombres || ''} ${veterinario.apellidos || ''}`.trim(),
    especialidad: veterinario.especialidad || '',
    telefono: veterinario.telefono || '',
    activo: veterinario.activo === undefined ? 1 : Number(veterinario.activo),
  };
}

async function cargarVeterinariosGestion(mostrarError = false) {
  const contenedor = document.getElementById('veterinarios-list');
  if (!contenedor) return;

  contenedor.innerHTML = '<div class="empty-row">Cargando veterinarios...</div>';

  try {
    const response = await fetch(VETERINARIOS_GESTION_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudieron consultar los veterinarios');

    const data = await response.json();
    const lista = Array.isArray(data) ? data : data.veterinarios;
    if (!Array.isArray(lista)) throw new Error('Respuesta de veterinarios invalida');

    veterinariosGestion = lista.map(normalizarVeterinario);
    renderVeterinariosGestion(veterinariosGestion);
  } catch (error) {
    console.warn('No se pudieron cargar veterinarios para gestion.', error);
    contenedor.innerHTML = '<div class="empty-row">No se pudieron cargar veterinarios desde n8n/MySQL.</div>';
    if (mostrarError) showToast('No pude cargar veterinarios desde n8n/MySQL.', true);
  }
}

function renderVeterinariosGestion(lista) {
  const contenedor = document.getElementById('veterinarios-list');

  if (!lista.length) {
    contenedor.innerHTML = '<div class="empty-row">No hay veterinarios registrados.</div>';
    return;
  }

  contenedor.innerHTML = lista.map(veterinario => {
    const nombreCompleto = veterinario.nombre || `${veterinario.nombres} ${veterinario.apellidos}`.trim();
    const estado = veterinario.activo ? 'Activo' : 'Inactivo';
    return `
      <article class="client-card">
        <div class="client-main">
          <div>
            <h3>${escapeHtml(nombreCompleto || 'Veterinario sin nombre')}</h3>
            <p>${escapeHtml(veterinario.especialidad || 'Sin especialidad')} - ${escapeHtml(veterinario.telefono || 'Sin telefono')}</p>
          </div>
          <span class="badge ${veterinario.activo ? 'badge-baja' : 'badge-cancel'}">${estado}</span>
        </div>
        <div class="client-pets">
          <button class="btn-action" type="button" onclick="editarVeterinario(${veterinario.id})">Editar</button>
          <button class="btn-action ${veterinario.activo ? 'danger' : ''}" type="button" onclick="cambiarEstadoVeterinario(${veterinario.id}, ${veterinario.activo ? 0 : 1})">
            ${veterinario.activo ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </article>
    `;
  }).join('');
}

function filtrarVeterinariosGestion(query) {
  const q = query.trim().toLowerCase();
  const filtrados = veterinariosGestion.filter(veterinario =>
    veterinario.nombres.toLowerCase().includes(q) ||
    veterinario.apellidos.toLowerCase().includes(q) ||
    veterinario.nombre.toLowerCase().includes(q) ||
    veterinario.especialidad.toLowerCase().includes(q) ||
    veterinario.telefono.toLowerCase().includes(q)
  );
  renderVeterinariosGestion(filtrados);
}

function editarVeterinario(id) {
  const veterinario = veterinariosGestion.find(item => item.id === id);
  if (!veterinario) return;

  document.getElementById('v-id').value = veterinario.id;
  document.getElementById('v-nombres').value = veterinario.nombres;
  document.getElementById('v-apellidos').value = veterinario.apellidos;
  document.getElementById('v-especialidad').value = veterinario.especialidad;
  document.getElementById('v-telefono').value = veterinario.telefono;
  showToast('Veterinario cargado para editar.');
}

function resetVeterinarioFormulario() {
  ['v-id', 'v-nombres', 'v-apellidos', 'v-especialidad', 'v-telefono'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

async function guardarVeterinario() {
  const id = fieldValue('v-id');
  const nombres = fieldValue('v-nombres');
  const apellidos = fieldValue('v-apellidos');
  const especialidad = fieldValue('v-especialidad');
  const telefono = fieldValue('v-telefono');

  if (!nombres || !apellidos) {
    showToast('Complete nombres y apellidos del veterinario.', true);
    return;
  }

  try {
    const response = await fetch(VETERINARIO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_veterinario: id || null, nombres, apellidos, especialidad, telefono }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'No se pudo guardar el veterinario');
    }

    resetVeterinarioFormulario();
    await cargarVeterinariosGestion();
    await cargarVeterinarios();
    showToast('Veterinario guardado correctamente.');
  } catch (error) {
    showToast(error.message || 'No se pudo guardar el veterinario en n8n/MySQL.', true);
  }
}

async function cambiarEstadoVeterinario(id, activo) {
  try {
    const response = await fetch(VETERINARIO_ESTADO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_veterinario: id, activo }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'No se pudo actualizar el estado');
    }

    await cargarVeterinariosGestion();
    await cargarVeterinarios();
    showToast(`Veterinario ${activo ? 'activado' : 'desactivado'}.`);
  } catch (error) {
    showToast(error.message || 'No se pudo actualizar el veterinario.', true);
  }
}

async function cargarHorariosDisponibles(mostrarError = false) {
  const fecha = fieldValue('f-fecha');
  const idVeterinario = fieldValue('f-veterinario');
  const contenedor = document.getElementById('horarios-list');
  const horaInput = document.getElementById('f-hora');
  if (!contenedor || !horaInput) return;

  horaInput.value = '';
  horariosDisponibles = [];
  evalDMN();

  if (!fecha || !idVeterinario) {
    contenedor.innerHTML = '<div class="empty-row">Seleccione fecha y veterinario para cargar horarios.</div>';
    return;
  }

  contenedor.innerHTML = '<div class="empty-row">Cargando horarios...</div>';

  try {
    const url = `${HORARIOS_URL}?fecha=${encodeURIComponent(fecha)}&id_veterinario=${encodeURIComponent(idVeterinario)}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudieron consultar los horarios');

    const data = await response.json();
    const lista = Array.isArray(data) ? data : data.horarios;
    if (!Array.isArray(lista)) throw new Error('Respuesta de horarios invalida');

    horariosDisponibles = lista.map(horario => ({
      hora: String(horario.hora || horario.hora_inicio || '').slice(0, 5),
      disponible: horario.disponible === true || horario.disponible === 1 || horario.disponible === '1',
      estado: horario.estado || '',
    })).filter(horario => horario.hora);

    renderHorarios();
  } catch (error) {
    console.warn('No se pudieron cargar horarios.', error);
    contenedor.innerHTML = '<div class="empty-row">No se pudieron cargar horarios desde n8n/MySQL.</div>';
    if (mostrarError) showToast('No pude cargar horarios desde n8n/MySQL.', true);
  }
}

function renderHorarios() {
  const contenedor = document.getElementById('horarios-list');
  const horaSeleccionada = fieldValue('f-hora');

  if (!horariosDisponibles.length) {
    contenedor.innerHTML = '<div class="empty-row">No hay horarios configurados para este veterinario.</div>';
    return;
  }

  contenedor.innerHTML = horariosDisponibles.map(horario => {
    const selected = horario.hora === horaSeleccionada ? ' selected' : '';
    const disabled = horario.disponible ? '' : ' disabled';
    const estado = horario.disponible ? 'Disponible' : 'Ocupado';
    return `
      <button class="slot-btn${selected}" type="button" onclick="seleccionarHorario('${horario.hora}')"${disabled}>
        <span>${formatearHora(horario.hora)}</span>
        <small>${estado}</small>
      </button>
    `;
  }).join('');
}

function seleccionarHorario(hora) {
  const horario = horariosDisponibles.find(item => item.hora === hora);
  if (!horario || !horario.disponible) return;

  document.getElementById('f-hora').value = hora;
  renderHorarios();
  evalDMN();
}

function seleccionarMascotaCita() {
  const select = document.getElementById('f-mascota');
  const option = select.options[select.selectedIndex];
  document.getElementById('f-especie').value = option?.dataset?.especie || '';
}

async function agendarCita() {
  const identificacion = fieldValue('f-identificacion');
  const mascota = fieldValue('f-mascota');
  const especie = fieldValue('f-especie');
  const tipo = fieldValue('f-tipo');
  const idVeterinario = fieldValue('f-veterinario');
  const fecha = fieldValue('f-fecha');
  const hora = fieldValue('f-hora');
  const obs = fieldValue('f-obs');

  if (!identificacion || !mascota || !especie || !tipo || !idVeterinario || !fecha || !hora) {
    showToast('Complete los campos obligatorios.', true);
    return;
  }

  if (horarioOcupado(fecha, hora)) {
    showToast('Ese horario ya esta ocupado para la fecha seleccionada.', true);
    return;
  }

  const cita = {
    id: nextId++,
    identificacion,
    dueno: `ID ${identificacion}`,
    telefono: '',
    email: '',
    id_veterinario: Number(idVeterinario),
    mascota,
    especie,
    tipo,
    prioridad: prioridadPorTipo(tipo),
    fecha,
    hora,
    estado: 'Confirmada',
    obs,
  };

  citas.push(cita);
  guardarCitas();
  resetFormulario();
  updateStats();
  aplicarFiltrosCitas();

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...cita,
        tipo_caso: cita.tipo,
        id_veterinario: cita.id_veterinario,
        observaciones: cita.obs,
        verificacion_cliente: 'identificacion',
        hora_formateada: formatearHora(cita.hora),
        creado_en: new Date().toISOString(),
      }),
    });

    if (!response.ok) throw new Error('Webhook sin respuesta OK');
    await cargarCitasRemotas();
    await cargarHorariosDisponibles(false);
    showToast(`Cita agendada para ${mascota}. Notificacion enviada.`);
  } catch {
    showToast(`Cita agendada para ${mascota}. n8n queda pendiente.`);
  }
}

function resetFormulario() {
  ['f-identificacion', 'f-especie', 'f-obs', 'f-fecha', 'f-hora'].forEach(id => {
    document.getElementById(id).value = '';
  });
  ['f-tipo', 'f-veterinario'].forEach(id => {
    document.getElementById(id).selectedIndex = 0;
  });
  const mascota = document.getElementById('f-mascota');
  mascota.innerHTML = '<option value="">Ingrese una identificacion y cargue mascotas...</option>';
  mascota.disabled = true;
  horariosDisponibles = [];
  document.getElementById('horarios-list').innerHTML = '<div class="empty-row">Seleccione fecha y veterinario para cargar horarios.</div>';
  document.getElementById('dmn-result').classList.remove('show');
}

function resetClienteFormulario() {
  ['c-identificacion', 'c-nombres', 'c-apellidos', 'c-tel', 'c-email', 'c-direccion'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('c-mascotas-list').innerHTML = '';
  agregarMascotaCliente();
}

function showToast(msg, err = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.background = err ? '#dc2626' : 'var(--verde)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

document.addEventListener('DOMContentLoaded', () => {
  const fecha = document.getElementById('f-fecha');
  document.getElementById('f-identificacion').addEventListener('change', () => cargarMascotasCliente(false));
  document.getElementById('f-identificacion').addEventListener('input', evalDMN);
  fecha.min = fechaLocalISO();
  fecha.addEventListener('change', () => cargarHorariosDisponibles(true));
  agregarMascotaCliente();
  updateStats();
  cargarVeterinarios();
  cargarCitasRemotas();
  cargarClientesRemotos();
});
