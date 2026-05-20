// ─── DATOS INICIALES ───────────────────────────────────────────────
let citas = [
  { id:1, dueno:'Laura Martínez', mascota:'Rex', especie:'Perro', tipo:'Emergencia', prioridad:'Alta', fecha:'2026-05-19', hora:'08:00 am', estado:'Confirmada', obs:'Vómitos frecuentes' },
  { id:2, dueno:'Carlos Gómez', mascota:'Michi', especie:'Gato', tipo:'Vacunación', prioridad:'Baja', fecha:'2026-05-19', hora:'09:00 am', estado:'Pendiente', obs:'' },
  { id:3, dueno:'Ana Pérez', mascota:'Coco', especie:'Ave', tipo:'Consulta general', prioridad:'Media', fecha:'2026-05-20', hora:'11:00 am', estado:'Confirmada', obs:'Revisión anual' },
  { id:4, dueno:'Jhon Contreras', mascota:'Bolt', especie:'Perro', tipo:'Consulta general', prioridad:'Media', fecha:'2026-05-21', hora:'02:00 pm', estado:'Pendiente', obs:'' },
  { id:5, dueno:'Julián Barrera', mascota:'Nina', especie:'Conejo', tipo:'Vacunación', prioridad:'Baja', fecha:'2026-05-22', hora:'04:00 pm', estado:'Confirmada', obs:'' },
];
let nextId = 6;

// ─── NAVEGACIÓN ────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  event.currentTarget.classList.add('active');
  if (name === 'citas') renderCitas(citas);
  if (name === 'dashboard') updateStats();
}

// ─── STATS ────────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('stat-total').textContent = citas.length;
  document.getElementById('stat-conf').textContent = citas.filter(c=>c.estado==='Confirmada').length;
  document.getElementById('stat-pend').textContent = citas.filter(c=>c.estado==='Pendiente').length;
}

// ─── TABLA CITAS ───────────────────────────────────────────────────
function prioridadBadge(p) {
  if (p==='Alta') return 'badge-alta';
  if (p==='Media') return 'badge-media';
  return 'badge-baja';
}

function estadoBadge(e) {
  return e==='Confirmada' ? 'badge-conf' : 'badge-pend';
}

function renderCitas(lista) {
  const tbody = document.getElementById('citas-body');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:32px;">No hay citas registradas.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(c => `
    <tr>
      <td style="color:var(--gris);font-size:0.82rem;">#${c.id}</td>
      <td><strong>${c.dueno}</strong></td>
      <td>${c.mascota} <span style="color:var(--gris);font-size:0.8rem;">(${c.especie})</span></td>
      <td>${c.tipo}</td>
      <td><span class="badge ${prioridadBadge(c.prioridad)}">${c.prioridad}</span></td>
      <td>${c.fecha}<br><span style="color:var(--gris);font-size:0.8rem;">${c.hora}</span></td>
      <td><span class="badge ${estadoBadge(c.estado)}">${c.estado}</span></td>
      <td>
        <button class="btn-action" onclick="toggleEstado(${c.id})">
          ${c.estado==='Pendiente' ? '✅ Confirmar' : '↩ Pendiente'}
        </button>
        <button class="btn-action danger" onclick="eliminarCita(${c.id})">✕</button>
      </td>
    </tr>
  `).join('');
}

function filtrarCitas(q) {
  const f = citas.filter(c =>
    c.dueno.toLowerCase().includes(q.toLowerCase()) ||
    c.mascota.toLowerCase().includes(q.toLowerCase()) ||
    c.tipo.toLowerCase().includes(q.toLowerCase())
  );
  renderCitas(f);
}

function toggleEstado(id) {
  const c = citas.find(x=>x.id===id);
  if (c) { c.estado = c.estado==='Confirmada' ? 'Pendiente' : 'Confirmada'; renderCitas(citas); }
  updateStats();
  showToast(`Cita ${c.estado === 'Confirmada' ? 'confirmada' : 'marcada como pendiente'}.`);
}

function eliminarCita(id) {
  citas = citas.filter(x=>x.id!==id);
  renderCitas(citas);
  updateStats();
  showToast('Cita eliminada.');
}

// ─── DMN LOGIC ────────────────────────────────────────────────────
function evalDMN() {
  const tipo = document.getElementById('f-tipo').value;
  const reg = document.getElementById('f-registrado').value;
  const horaOpt = document.getElementById('f-hora');
  const horaDisp = horaOpt.value === 'disponible';
  const box = document.getElementById('dmn-result');

  if (!tipo || !reg || !horaOpt.value) { 
    box.classList.remove('show'); 
    return; 
  }

  let prioridad = tipo==='Emergencia' ? 'ALTA 🚨' : tipo==='Consulta general' ? 'MEDIA 🩺' : 'BAJA 💉';
  let accion = '';
  
  if (horaDisp && reg==='si') 
    accion = '✅ <strong>Acción DMN:</strong> Confirmar cita directamente.';
  else if (horaDisp && reg==='no') 
    accion = '📋 <strong>Acción DMN:</strong> Registrar nuevo cliente y confirmar cita.';
  else if (!horaDisp && reg==='si') 
    accion = '⏰ <strong>Acción DMN:</strong> Horario ocupado — mostrar horarios alternativos disponibles.';
  else 
    accion = '🔒 <strong>Acción DMN:</strong> Horario ocupado y cliente sin registro — solicitar registro primero.';

  box.innerHTML = `<strong>Prioridad asignada:</strong> ${prioridad}<br>${accion}`;
  box.classList.add('show');
}

// ─── AGENDAR ──────────────────────────────────────────────────────
function agendarCita() {
  const dueno = document.getElementById('f-dueno').value.trim();
  const tel = document.getElementById('f-tel').value.trim();
  const mascota = document.getElementById('f-mascota').value.trim();
  const especie = document.getElementById('f-especie').value;
  const tipo = document.getElementById('f-tipo').value;
  const fecha = document.getElementById('f-fecha').value;
  const horaEl = document.getElementById('f-hora');
  const hora = horaEl.options[horaEl.selectedIndex]?.text || '';
  const horaVal = horaEl.value;
  const obs = document.getElementById('f-obs').value.trim();

  if (!dueno || !mascota || !especie || !tipo || !fecha || !horaVal) {
    showToast('⚠️ Complete todos los campos obligatorios.', true); 
    return; 
  }
  
  if (horaVal === 'ocupada') {
    showToast('❌ Ese horario está ocupado. Elija otro.', true); 
    return; 
  }

  const prioridad = tipo==='Emergencia' ? 'Alta' : tipo==='Consulta general' ? 'Media' : 'Baja';
  
  citas.push({ 
    id: nextId++, 
    dueno, 
    mascota, 
    especie, 
    tipo, 
    prioridad, 
    fecha, 
    hora: hora.replace(/[✅❌]/g,'').trim(), 
    estado: 'Confirmada', 
    obs 
  });

  // reset form
  ['f-dueno','f-tel','f-mascota','f-obs','f-fecha'].forEach(id => document.getElementById(id).value='');
  ['f-especie','f-tipo','f-registrado','f-hora'].forEach(id => document.getElementById(id).selectedIndex=0);
  document.getElementById('dmn-result').classList.remove('show');

  updateStats();
  
  fetch('api/webhook/nueva-cita', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dueno, 
    telefono: tel, 
    mascota, 
    especie,
    tipo_caso: tipo, 
    fecha, 
    hora,
    registrado: document.getElementById('f-registrado').value,
    observaciones: obs
  })
})
.then(r => r.json())
.then(data => {
  if (data.success) showToast('✅ Cita confirmada y notificación enviada');
  else showToast('⚠️ ' + data.message, true);
})
.catch(() => showToast('⚠️ No se pudo conectar con el servidor', true));
  showToast(`✅ Cita agendada para ${mascota}. Notificación enviada.`);
}

// ─── TOAST ────────────────────────────────────────────────────────
function showToast(msg, err=false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = err ? '#dc2626' : 'var(--verde)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── INICIALIZACIÓN ───────────────────────────────────────────────
updateStats();