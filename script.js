const STORAGE_KEY = 'vetcitas:citas';
const WEBHOOK_URL = '/api/webhook/nueva-cita';
const CITAS_URL = '/api/webhook/citas';
const CLIENTE_URL = '/api/webhook/cliente';

const citasIniciales = [
  { id: 1, identificacion: '1001', dueno: 'Laura Martinez', telefono: '300 111 2233', email: 'laura@example.com', mascota: 'Rex', especie: 'Perro', tipo: 'Emergencia', prioridad: 'Alta', fecha: '2026-06-03', hora: '08:00', estado: 'Confirmada', obs: 'Vomitos frecuentes' },
  { id: 2, identificacion: '1002', dueno: 'Carlos Gomez', telefono: '300 222 3344', email: 'carlos@example.com', mascota: 'Michi', especie: 'Gato', tipo: 'Vacunacion', prioridad: 'Baja', fecha: '2026-06-03', hora: '09:00', estado: 'Pendiente', obs: '' },
  { id: 3, identificacion: '1003', dueno: 'Ana Perez', telefono: '300 333 4455', email: 'ana@example.com', mascota: 'Coco', especie: 'Ave', tipo: 'Consulta general', prioridad: 'Media', fecha: '2026-06-04', hora: '11:00', estado: 'Confirmada', obs: 'Revision anual' },
  { id: 4, identificacion: '1004', dueno: 'Jhon Contreras', telefono: '300 444 5566', email: 'jhon@example.com', mascota: 'Bolt', especie: 'Perro', tipo: 'Consulta general', prioridad: 'Media', fecha: '2026-06-05', hora: '14:00', estado: 'Pendiente', obs: '' },
  { id: 5, identificacion: '1005', dueno: 'Julian Barrera', telefono: '300 555 6677', email: 'julian@example.com', mascota: 'Nina', especie: 'Conejo', tipo: 'Vacunacion', prioridad: 'Baja', fecha: '2026-06-06', hora: '16:00', estado: 'Confirmada', obs: '' },
];

let citas = cargarCitas();
let nextId = citas.reduce((max, cita) => Math.max(max, cita.id), 0) + 1;

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
    renderCitas(citas);
  } catch (error) {
    console.warn('Usando citas locales porque no se pudo consultar n8n/MySQL.', error);
    if (mostrarError) showToast('No pude cargar citas desde n8n. Mostrando datos locales.', true);
    renderCitas(citas);
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

  if (name === 'citas') renderCitas(citas);
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
  return estado === 'Confirmada' ? 'badge-conf' : 'badge-pend';
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
        <button class="btn-action" onclick="toggleEstado(${cita.id})">
          ${cita.estado === 'Pendiente' ? 'Confirmar' : 'Pendiente'}
        </button>
        <button class="btn-action danger" onclick="eliminarCita(${cita.id})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function filtrarCitas(query) {
  const q = query.trim().toLowerCase();
  const filtradas = citas.filter(cita =>
    cita.dueno.toLowerCase().includes(q) ||
    cita.mascota.toLowerCase().includes(q) ||
    cita.tipo.toLowerCase().includes(q) ||
    cita.fecha.includes(q)
  );
  renderCitas(filtradas);
}

function toggleEstado(id) {
  const cita = citas.find(item => item.id === id);
  if (!cita) return;

  cita.estado = cita.estado === 'Confirmada' ? 'Pendiente' : 'Confirmada';
  guardarCitas();
  renderCitas(citas);
  updateStats();
  showToast(`Cita ${cita.estado === 'Confirmada' ? 'confirmada' : 'marcada como pendiente'}.`);
}

function eliminarCita(id) {
  citas = citas.filter(item => item.id !== id);
  guardarCitas();
  renderCitas(citas);
  updateStats();
  evalDMN();
  showToast('Cita eliminada.');
}

function horarioOcupado(fecha, hora) {
  return citas.some(cita => cita.fecha === fecha && cita.hora === hora && cita.estado !== 'Cancelada');
}

function fieldValue(id) {
  const field = document.getElementById(id);
  if (!field) {
    console.error(`No se encontro el campo #${id}. Revise que index.html y script.js esten actualizados.`);
    return '';
  }
  return typeof field.value === 'string' ? field.value.trim() : '';
}

function evalDMN() {
  const tipo = fieldValue('f-tipo');
  const identificacion = fieldValue('f-identificacion');
  const fecha = fieldValue('f-fecha');
  const hora = fieldValue('f-hora');
  const box = document.getElementById('dmn-result');

  if (!tipo || !identificacion || !fecha || !hora) {
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

  box.innerHTML = `<strong>Prioridad asignada:</strong> ${prioridad}<br><strong>Identificacion:</strong> ${clienteLocal ? 'Encontrada en esta agenda' : 'Se validara en MySQL'}<br><strong>Disponibilidad:</strong> ${disponible ? 'Disponible' : 'Ocupado'}<br>${accion}`;
  box.classList.add('show');
}

async function crearCliente() {
  const identificacion = fieldValue('c-identificacion');
  const nombres = fieldValue('c-nombres');
  const apellidos = fieldValue('c-apellidos');
  const telefono = fieldValue('c-tel');
  const email = fieldValue('c-email');
  const direccion = fieldValue('c-direccion');
  const mascota = fieldValue('c-mascota');
  const especie = fieldValue('c-especie');
  const raza = fieldValue('c-raza');
  const observaciones = fieldValue('c-obs');

  if (!identificacion || !nombres || !apellidos || !telefono || !email || !mascota || !especie) {
    showToast('Complete identificacion, nombres, apellidos, telefono, email, mascota y especie.', true);
    return;
  }

  if (!email.includes('@')) {
    showToast('Ingrese un email valido para notificaciones.', true);
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
        mascota,
        especie,
        raza,
        observaciones,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'No se pudo crear el cliente');
    }

    resetClienteFormulario();
    showToast(`Cliente ${nombres} ${apellidos} registrado.`);
  } catch (error) {
    showToast(error.message || 'No se pudo registrar el cliente en n8n.', true);
  }
}

async function agendarCita() {
  const identificacion = fieldValue('f-identificacion');
  const mascota = fieldValue('f-mascota');
  const especie = fieldValue('f-especie');
  const tipo = fieldValue('f-tipo');
  const fecha = fieldValue('f-fecha');
  const hora = fieldValue('f-hora');
  const obs = fieldValue('f-obs');

  if (!identificacion || !mascota || !especie || !tipo || !fecha || !hora) {
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
  renderCitas(citas);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...cita,
        tipo_caso: cita.tipo,
        observaciones: cita.obs,
        verificacion_cliente: 'identificacion',
        hora_formateada: formatearHora(cita.hora),
        creado_en: new Date().toISOString(),
      }),
    });

    if (!response.ok) throw new Error('Webhook sin respuesta OK');
    await cargarCitasRemotas();
    showToast(`Cita agendada para ${mascota}. Notificacion enviada.`);
  } catch {
    showToast(`Cita agendada para ${mascota}. n8n queda pendiente.`);
  }
}

function resetFormulario() {
  ['f-identificacion', 'f-mascota', 'f-obs', 'f-fecha'].forEach(id => {
    document.getElementById(id).value = '';
  });
  ['f-especie', 'f-tipo', 'f-hora'].forEach(id => {
    document.getElementById(id).selectedIndex = 0;
  });
  document.getElementById('dmn-result').classList.remove('show');
}

function resetClienteFormulario() {
  ['c-identificacion', 'c-nombres', 'c-apellidos', 'c-tel', 'c-email', 'c-direccion', 'c-mascota', 'c-raza', 'c-obs'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('c-especie').selectedIndex = 0;
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
  document.getElementById('f-identificacion').addEventListener('input', evalDMN);
  fecha.min = fechaLocalISO();
  fecha.addEventListener('change', evalDMN);
  updateStats();
  cargarCitasRemotas();
});
