const STORAGE_KEY = 'vetcitas:citas';
const WEBHOOK_URL = '/api/webhook/nueva-cita';

const citasIniciales = [
  { id: 1, dueno: 'Laura Martinez', telefono: '300 111 2233', email: 'laura@example.com', mascota: 'Rex', especie: 'Perro', tipo: 'Emergencia', prioridad: 'Alta', fecha: '2026-06-03', hora: '08:00', estado: 'Confirmada', registrado: 'si', obs: 'Vomitos frecuentes' },
  { id: 2, dueno: 'Carlos Gomez', telefono: '300 222 3344', email: 'carlos@example.com', mascota: 'Michi', especie: 'Gato', tipo: 'Vacunacion', prioridad: 'Baja', fecha: '2026-06-03', hora: '09:00', estado: 'Pendiente', registrado: 'si', obs: '' },
  { id: 3, dueno: 'Ana Perez', telefono: '300 333 4455', email: 'ana@example.com', mascota: 'Coco', especie: 'Ave', tipo: 'Consulta general', prioridad: 'Media', fecha: '2026-06-04', hora: '11:00', estado: 'Confirmada', registrado: 'no', obs: 'Revision anual' },
  { id: 4, dueno: 'Jhon Contreras', telefono: '300 444 5566', email: '', mascota: 'Bolt', especie: 'Perro', tipo: 'Consulta general', prioridad: 'Media', fecha: '2026-06-05', hora: '14:00', estado: 'Pendiente', registrado: 'si', obs: '' },
  { id: 5, dueno: 'Julian Barrera', telefono: '300 555 6677', email: '', mascota: 'Nina', especie: 'Conejo', tipo: 'Vacunacion', prioridad: 'Baja', fecha: '2026-06-06', hora: '16:00', estado: 'Confirmada', registrado: 'no', obs: '' },
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

function evalDMN() {
  const tipo = document.getElementById('f-tipo').value;
  const registrado = document.getElementById('f-registrado').value;
  const fecha = document.getElementById('f-fecha').value;
  const hora = document.getElementById('f-hora').value;
  const box = document.getElementById('dmn-result');

  if (!tipo || !registrado || !fecha || !hora) {
    box.classList.remove('show');
    return;
  }

  const disponible = !horarioOcupado(fecha, hora);
  const prioridad = prioridadPorTipo(tipo);
  let accion = '';

  if (disponible && registrado === 'si') {
    accion = 'Accion DMN: confirmar cita directamente.';
  } else if (disponible && registrado === 'no') {
    accion = 'Accion DMN: registrar nuevo cliente y confirmar cita.';
  } else if (!disponible && registrado === 'si') {
    accion = 'Accion DMN: horario ocupado, mostrar horarios alternativos.';
  } else {
    accion = 'Accion DMN: registrar cliente y elegir otro horario.';
  }

  box.innerHTML = `<strong>Prioridad asignada:</strong> ${prioridad}<br><strong>Disponibilidad:</strong> ${disponible ? 'Disponible' : 'Ocupado'}<br>${accion}`;
  box.classList.add('show');
}

async function agendarCita() {
  const dueno = document.getElementById('f-dueno').value.trim();
  const telefono = document.getElementById('f-tel').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const mascota = document.getElementById('f-mascota').value.trim();
  const especie = document.getElementById('f-especie').value;
  const tipo = document.getElementById('f-tipo').value;
  const registrado = document.getElementById('f-registrado').value;
  const fecha = document.getElementById('f-fecha').value;
  const hora = document.getElementById('f-hora').value;
  const obs = document.getElementById('f-obs').value.trim();

  if (!dueno || !telefono || !mascota || !especie || !tipo || !registrado || !fecha || !hora) {
    showToast('Complete los campos obligatorios.', true);
    return;
  }

  if (horarioOcupado(fecha, hora)) {
    showToast('Ese horario ya esta ocupado para la fecha seleccionada.', true);
    return;
  }

  const cita = {
    id: nextId++,
    dueno,
    telefono,
    email,
    mascota,
    especie,
    tipo,
    prioridad: prioridadPorTipo(tipo),
    fecha,
    hora,
    estado: 'Confirmada',
    registrado,
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
        hora_formateada: formatearHora(cita.hora),
        creado_en: new Date().toISOString(),
      }),
    });

    if (!response.ok) throw new Error('Webhook sin respuesta OK');
    showToast(`Cita agendada para ${mascota}. Notificacion enviada.`);
  } catch {
    showToast(`Cita agendada para ${mascota}. n8n queda pendiente.`);
  }
}

function resetFormulario() {
  ['f-dueno', 'f-tel', 'f-email', 'f-mascota', 'f-obs', 'f-fecha'].forEach(id => {
    document.getElementById(id).value = '';
  });
  ['f-especie', 'f-tipo', 'f-registrado', 'f-hora'].forEach(id => {
    document.getElementById(id).selectedIndex = 0;
  });
  document.getElementById('dmn-result').classList.remove('show');
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
  fecha.min = fechaLocalISO();
  fecha.addEventListener('change', evalDMN);
  updateStats();
});
