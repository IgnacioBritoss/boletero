const SUPABASE_URL = 'https://wtoismnhemzkxonlkibe.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0b2lzbW5oZW16a3hvbmxraWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTE1ODEsImV4cCI6MjA5MzU4NzU4MX0.6MKRi9-M0j6Ysi5EKWSi3O7Vv_nc8Ng9yufwFyGexLs'
const ALLOWED_EMAILS = ['britosjuanmanuel@gmail.com','britosignacio106@gmail.com']

const { createClient } = supabase
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── AUTH ───────────────────────────────────────────
sb.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    if (!ALLOWED_EMAILS.includes(session.user.email)) {
      await sb.auth.signOut()
      document.getElementById('login-error').classList.remove('hidden')
      return
    }
    showApp()
    loadDashboard()
  } else {
    showLogin()
  }
})

document.getElementById('btn-google').onclick = () => {
  sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })
}

document.getElementById('btn-signout').onclick = () => sb.auth.signOut()
document.getElementById('btn-nueva').onclick = showNuevaBoleta

// ─── VISTAS ─────────────────────────────────────────
function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden')
  document.getElementById('app-screen').classList.add('hidden')
}
function showApp() {
  document.getElementById('login-screen').classList.add('hidden')
  document.getElementById('app-screen').classList.remove('hidden')
}
function showDashboard() {
  document.getElementById('view-dashboard').classList.remove('hidden')
  document.getElementById('view-nueva').classList.add('hidden')
  document.getElementById('view-detalle').classList.add('hidden')
  loadDashboard()
}
function showNuevaBoleta() {
  document.getElementById('view-dashboard').classList.add('hidden')
  document.getElementById('view-nueva').classList.remove('hidden')
  document.getElementById('view-detalle').classList.add('hidden')
  initNuevaForm()
}
function showDetalle(id) {
  document.getElementById('view-dashboard').classList.add('hidden')
  document.getElementById('view-nueva').classList.add('hidden')
  document.getElementById('view-detalle').classList.remove('hidden')
  loadDetalle(id)
}

// ─── DASHBOARD ──────────────────────────────────────
async function loadDashboard() {
  const { data: { user } } = await sb.auth.getUser()
  const { data: boletas } = await sb
    .from('boletas')
    .select('*, clientes(nombre)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!boletas) return

  let cobrado = 0, pendiente = 0, pendienteCount = 0
  boletas.forEach(b => {
    if (b.estado === 'cobrada') cobrado += b.total
    if (b.estado === 'pendiente') { pendiente += b.total; pendienteCount++ }
  })

  document.getElementById('stat-cobrado').textContent = fmt(cobrado)
  document.getElementById('stat-pendiente').textContent = fmt(pendiente)
  document.getElementById('stat-count-pendiente').textContent = pendienteCount
  document.getElementById('stat-total').textContent = boletas.length

  const tbody = document.getElementById('boletas-tbody')
  const empty = document.getElementById('boletas-empty')
  const table = document.getElementById('boletas-table')

  if (boletas.length === 0) {
    empty.classList.remove('hidden')
    table.classList.add('hidden')
    return
  }
  empty.classList.add('hidden')
  table.classList.remove('hidden')

  tbody.innerHTML = boletas.map(b => `
    <tr>
      <td><a href="#" class="link-boleta" data-id="${b.id}" style="color:#2563eb;font-family:monospace;font-weight:600">${b.numero}</a></td>
      <td>${b.clientes?.nombre || '<span style="color:#9ca3af;font-style:italic">Sin cliente</span>'}</td>
      <td style="color:#6b7280">${fmtFecha(b.fecha)}</td>
      <td style="font-weight:600">${fmt(b.total)}</td>
      <td><span class="badge badge-${b.estado}">${badgeText(b.estado)}</span></td>
      <td style="text-align:right">
        ${b.estado === 'pendiente' ? `<button class="btn-cobrar" onclick="cobrar('${b.id}')">✓ Cobrada</button>` : ''}
      </td>
    </tr>
  `).join('')

  document.querySelectorAll('.link-boleta').forEach(a => {
    a.onclick = e => { e.preventDefault(); showDetalle(a.dataset.id) }
  })
}

// ─── NUEVA BOLETA ────────────────────────────────────
let items = []

async function initNuevaForm() {
  document.getElementById('f-fecha').value = new Date().toISOString().split('T')[0]
  document.getElementById('f-cuotas').value = 1
  document.getElementById('f-descuento').value = 0
  document.getElementById('f-notas').value = ''
  items = [{ descripcion: '', cantidad: 1, precio_unitario: 0 }]
  renderItems()

  const { data: { user } } = await sb.auth.getUser()
  const { data: clientes } = await sb.from('clientes').select('id,nombre').eq('user_id', user.id).order('nombre')
  const sel = document.getElementById('f-cliente')
  sel.innerHTML = '<option value="">Sin cliente</option>'
  clientes?.forEach(c => sel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.nombre}</option>`))

  document.getElementById('f-cuotas').oninput = recalc
  document.getElementById('f-descuento').oninput = recalc
}

function renderItems() {
  const container = document.getElementById('items-container')
  container.innerHTML = `
    <div class="item-header">
      <span>Descripción</span><span>Cant.</span><span>Precio unit. ($)</span><span></span>
    </div>
  ` + items.map((item, i) => `
    <div class="item-row">
      <input type="text" placeholder="Descripción..." value="${item.descripcion}"
        oninput="items[${i}].descripcion=this.value">
      <input type="number" value="${item.cantidad}" min="0" step="0.5"
        oninput="items[${i}].cantidad=+this.value;recalc()">
      <input type="number" value="${item.precio_unitario}" min="0"
        oninput="items[${i}].precio_unitario=+this.value;recalc()">
      ${items.length > 1 ? `<button class="btn-remove" onclick="removeItem(${i})">×</button>` : '<span></span>'}
    </div>
  `).join('')
  recalc()
}

function addItem() {
  items.push({ descripcion: '', cantidad: 1, precio_unitario: 0 })
  renderItems()
}
function removeItem(i) {
  items.splice(i, 1)
  renderItems()
}

function recalc() {
  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const descuento = +document.getElementById('f-descuento').value || 0
  const total = subtotal - descuento
  const cuotas = +document.getElementById('f-cuotas').value || 1

  document.getElementById('t-subtotal').textContent = fmt(subtotal)
  document.getElementById('t-descuento').textContent = `-${fmt(descuento)}`
  document.getElementById('t-total').textContent = fmt(total)

  const cuotasRow = document.getElementById('cuotas-row')
  if (cuotas > 1) {
    cuotasRow.classList.remove('hidden')
    document.getElementById('cuotas-label').textContent = `${cuotas} cuotas de`
    document.getElementById('t-cuota').textContent = fmt(total / cuotas)
  } else {
    cuotasRow.classList.add('hidden')
  }
}

async function crearBoleta() {
  const { data: { user } } = await sb.auth.getUser()

  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const descuento = +document.getElementById('f-descuento').value || 0
  const total = subtotal - descuento
  const cuotas = +document.getElementById('f-cuotas').value || 1
  const clienteId = document.getElementById('f-cliente').value
  const fecha = document.getElementById('f-fecha').value
  const notas = document.getElementById('f-notas').value

  // Número automático
  const anio = new Date().getFullYear()
  const { count } = await sb.from('boletas').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  const numero = `BOL-${anio}-${String((count || 0) + 1).padStart(3, '0')}`

  const { data: boleta, error } = await sb.from('boletas').insert({
    user_id: user.id,
    cliente_id: clienteId || null,
    numero, fecha, cuotas, subtotal, descuento, total,
    notas: notas || null,
    estado: 'pendiente'
  }).select().single()

  if (error || !boleta) { alert('Error al crear la boleta'); return }

  const itemsValidos = items.filter(i => i.descripcion.trim())
  if (itemsValidos.length > 0) {
    await sb.from('items_boleta').insert(
      itemsValidos.map(i => ({
        boleta_id: boleta.id,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario
      }))
    )
  }

  showDetalle(boleta.id)
}

// ─── DETALLE ────────────────────────────────────────
async function loadDetalle(id) {
  const { data: b } = await sb
    .from('boletas')
    .select('*, clientes(*), items_boleta(*)')
    .eq('id', id)
    .single()

  if (!b) return

  document.getElementById('d-numero').textContent = b.numero
  document.getElementById('d-badge').innerHTML = `<span class="badge badge-${b.estado}">${badgeText(b.estado)}</span>`

  // Acciones
  const actions = document.getElementById('detalle-actions')
  actions.innerHTML = ''
  if (b.estado === 'pendiente') {
    const btn = document.createElement('button')
    btn.className = 'btn-cobrar'
    btn.textContent = '✓ Marcar como cobrada'
    btn.onclick = () => cobrar(id)
    actions.appendChild(btn)
  }
  if (b.clientes?.email) {
    const btn = document.createElement('button')
    btn.className = 'btn-email'
    btn.innerHTML = '✉ Enviar por email'
    btn.onclick = () => enviarEmail(id, b.clientes.email)
    actions.appendChild(btn)
  }

  // Cliente
  const clienteInfo = document.getElementById('d-cliente-info')
  if (b.clientes) {
    clienteInfo.innerHTML = `
      <p style="font-weight:600">${b.clientes.nombre}</p>
      ${b.clientes.empresa ? `<p style="font-size:13px;color:#6b7280">${b.clientes.empresa}</p>` : ''}
      ${b.clientes.email ? `<p style="font-size:13px;color:#6b7280">${b.clientes.email}</p>` : ''}
      ${b.clientes.telefono ? `<p style="font-size:13px;color:#6b7280">${b.clientes.telefono}</p>` : ''}
    `
  } else {
    clienteInfo.innerHTML = '<p style="color:#9ca3af;font-style:italic;font-size:14px">Sin cliente asignado</p>'
  }

  // Detalles
  document.getElementById('d-detalles-info').innerHTML = `
    <div class="info-row"><span class="info-label">Fecha</span><span>${fmtFecha(b.fecha)}</span></div>
    <div class="info-row"><span class="info-label">Cuotas</span><span>${b.cuotas}</span></div>
    ${b.cuotas > 1 ? `<div class="info-row"><span class="info-label">Por cuota</span><span>${fmt(b.total / b.cuotas)}</span></div>` : ''}
  `

  // Items
  document.getElementById('d-items').innerHTML = b.items_boleta?.map(i => `
    <tr>
      <td>${i.descripcion}</td>
      <td class="text-right">${i.cantidad}</td>
      <td class="text-right">${fmt(i.precio_unitario)}</td>
      <td class="text-right" style="font-weight:600">${fmt(i.subtotal)}</td>
    </tr>
  `).join('') || ''

  // Totales
  document.getElementById('d-totales').innerHTML = `
    <div class="total-row"><span>Subtotal</span><span>${fmt(b.subtotal)}</span></div>
    ${b.descuento > 0 ? `<div class="total-row"><span>Descuento</span><span>-${fmt(b.descuento)}</span></div>` : ''}
    <div class="total-row total-final"><span>Total</span><span>${fmt(b.total)}</span></div>
  `

  // Notas
  const notasCard = document.getElementById('d-notas-card')
  if (b.notas) {
    notasCard.style.display = ''
    document.getElementById('d-notas').textContent = b.notas
  } else {
    notasCard.style.display = 'none'
  }
}

// ─── ACCIONES ────────────────────────────────────────
async function cobrar(id) {
  if (!confirm('¿Marcar esta boleta como cobrada?')) return
  await sb.from('boletas').update({ estado: 'cobrada' }).eq('id', id)
  loadDashboard()
  const detalle = document.getElementById('view-detalle')
  if (!detalle.classList.contains('hidden')) loadDetalle(id)
}

async function enviarEmail(boletaId, email) {
  if (!confirm(`¿Enviar la boleta por email a ${email}?`)) return
  const res = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boletaId })
  })
  if (res.ok) alert('Email enviado correctamente')
  else alert('Error al enviar el email')
}

// ─── UTILS ───────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'AUD' }).format(n || 0)
}
function fmtFecha(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}
function badgeText(estado) {
  return estado === 'pendiente' ? '⏳ Pendiente' : estado === 'cobrada' ? '✓ Cobrada' : '✕ Cancelada'
} 