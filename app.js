const SUPABASE_URL = 'https://wtoismnhemzkxonlkibe.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0b2lzbW5oZW16a3hvbmxraWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTE1ODEsImV4cCI6MjA5MzU4NzU4MX0.6MKRi9-M0j6Ysi5EKWSi3O7Vv_nc8Ng9yufwFyGexLs'
const ALLOWED_EMAILS = ['britosjuanmanuel@gmail.com','britosignacio106@gmail.com']

const { createClient } = supabase
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let currentUser = null
let allBoletas = []
let items = []

// ── THEME ──────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light'
  setTheme(saved)
}
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('theme', t)
  document.getElementById('icon-moon').classList.toggle('hidden', t === 'dark')
  document.getElementById('icon-sun').classList.toggle('hidden', t === 'light')
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme')
  setTheme(cur === 'dark' ? 'light' : 'dark')
}
initTheme()

// ── AUTH ──────────────────────────────────────────────
sb.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    if (!ALLOWED_EMAILS.includes(session.user.email)) {
      await sb.auth.signOut()
      document.getElementById('login-error').classList.remove('hidden')
      return
    }
    currentUser = session.user
    document.getElementById('login-screen').classList.add('hidden')
    document.getElementById('app-screen').classList.remove('hidden')
    showDashboard()
  } else {
    currentUser = null
    document.getElementById('login-screen').classList.remove('hidden')
    document.getElementById('app-screen').classList.add('hidden')
  }
})

document.getElementById('btn-google').onclick = () => {
  sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })
}

function signOut() { sb.auth.signOut() }

// ── VIEWS ──────────────────────────────────────────────
function hideAll() {
  ['view-dashboard','view-nueva','view-detalle','view-perfil'].forEach(id =>
    document.getElementById(id).classList.add('hidden')
  )
}

function showDashboard() {
  hideAll()
  document.getElementById('view-dashboard').classList.remove('hidden')
  loadDashboard()
}
function showNueva() {
  hideAll()
  document.getElementById('view-nueva').classList.remove('hidden')
  initNuevaForm()
}
function showDetalle(id) {
  hideAll()
  document.getElementById('view-detalle').classList.remove('hidden')
  loadDetalle(id)
}
function showPerfil() {
  hideAll()
  document.getElementById('view-perfil').classList.remove('hidden')
  loadPerfil()
}

// ── DASHBOARD ──────────────────────────────────────────
async function loadDashboard() {
  const { data } = await sb
    .from('boletas')
    .select('*')
    .order('created_at', { ascending: false })

  allBoletas = data || []
  renderBoletas(allBoletas)
}

function filterBoletas() {
  const f = document.getElementById('filtro-estado').value
  const filtered = f ? allBoletas.filter(b => b.estado === f) : allBoletas
  renderBoletas(filtered)
}

function renderBoletas(boletas) {
  let cobrado = 0, pendiente = 0, pendCount = 0
  allBoletas.forEach(b => {
    if (b.estado === 'cobrada') cobrado += b.total
    if (b.estado === 'pendiente') { pendiente += b.total; pendCount++ }
  })
  document.getElementById('stat-cobrado').textContent = fmt(cobrado, 'AUD')
  document.getElementById('stat-pendiente').textContent = fmt(pendiente, 'AUD')
  document.getElementById('stat-count-pend').textContent = pendCount
  document.getElementById('stat-total').textContent = allBoletas.length

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
      <td><a href="#" class="mono" style="color:var(--blue);font-weight:600;text-decoration:none" onclick="showDetalle('${b.id}');return false">${b.numero}</a></td>
      <td>${b.cliente_nombre || '<span style="color:var(--text3);font-style:italic">Sin cliente</span>'}</td>
      <td style="color:var(--text2)">${fmtFecha(b.fecha)}</td>
      <td style="font-weight:600">${fmt(b.total, b.moneda || 'AUD')}</td>
      <td><span class="badge badge-${b.estado}">${badgeText(b.estado)}</span></td>
      <td style="text-align:right">
        ${b.estado === 'pendiente' ? `<button class="btn btn-success" style="font-size:12px;padding:5px 10px" onclick="cobrar('${b.id}')">Cobrada</button>` : ''}
      </td>
    </tr>
  `).join('')
}

// ── NUEVA BOLETA ────────────────────────────────────────
async function initNuevaForm() {
  document.getElementById('f-fecha').value = new Date().toISOString().split('T')[0]
  document.getElementById('f-cuotas').value = 1
  document.getElementById('f-descuento').value = 0
  document.getElementById('f-notas').value = ''
  document.getElementById('f-cliente-nombre').value = ''
  document.getElementById('f-cliente-email').value = ''
  document.getElementById('f-cliente-tel').value = ''
  document.getElementById('f-enviar-email').checked = false
  items = [{ descripcion: '', cantidad: 1, precio_unitario: 0 }]
  renderItems()

  const nombres = [...new Set(allBoletas.filter(b => b.cliente_nombre).map(b => b.cliente_nombre))]
  const dl = document.getElementById('clientes-list')
  dl.innerHTML = nombres.map(n => `<option value="${n}">`).join('')

  document.getElementById('f-cliente-nombre').oninput = function() {
    const match = allBoletas.find(b => b.cliente_nombre === this.value)
    if (match) {
      if (match.cliente_email) document.getElementById('f-cliente-email').value = match.cliente_email
      if (match.cliente_tel) document.getElementById('f-cliente-tel').value = match.cliente_tel
    }
  }

  document.getElementById('f-cuotas').oninput = recalc
  document.getElementById('f-descuento').oninput = recalc
  document.getElementById('f-moneda').onchange = recalc
}

function renderItems() {
  const c = document.getElementById('items-container')
  c.innerHTML = items.map((item, i) => `
    <div class="item-row">
      <input type="text" placeholder="Descripcion..." value="${item.descripcion}"
        oninput="items[${i}].descripcion=this.value">
      <input type="number" value="${item.cantidad}" min="0" step="0.5"
        oninput="items[${i}].cantidad=+this.value;recalc()">
      <input type="number" value="${item.precio_unitario}" min="0" step="0.01"
        oninput="items[${i}].precio_unitario=+this.value;recalc()">
      ${items.length > 1
        ? `<button class="btn-remove" onclick="removeItem(${i})">x</button>`
        : '<span></span>'}
    </div>
  `).join('')
  recalc()
}

function addItem() { items.push({ descripcion: '', cantidad: 1, precio_unitario: 0 }); renderItems() }
function removeItem(i) { items.splice(i, 1); renderItems() }

function recalc() {
  const moneda = document.getElementById('f-moneda')?.value || 'AUD'
  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const desc = +document.getElementById('f-descuento').value || 0
  const total = subtotal - desc
  const cuotas = +document.getElementById('f-cuotas').value || 1

  document.getElementById('t-subtotal').textContent = fmt(subtotal, moneda)
  document.getElementById('t-total').textContent = fmt(total, moneda)

  const descRow = document.getElementById('descuento-row')
  if (desc > 0) {
    descRow.style.display = 'flex'
    document.getElementById('t-descuento').textContent = `-${fmt(desc, moneda)}`
  } else {
    descRow.style.display = 'none'
  }

  const cuotasInfo = document.getElementById('cuotas-info')
  if (cuotas > 1) {
    cuotasInfo.classList.remove('hidden')
    cuotasInfo.textContent = `${cuotas} cuotas de ${fmt(total / cuotas, moneda)}`
  } else {
    cuotasInfo.classList.add('hidden')
  }
}

async function crearBoleta() {
  const nombre = document.getElementById('f-cliente-nombre').value.trim()
  const email = document.getElementById('f-cliente-email').value.trim()
  const tel = document.getElementById('f-cliente-tel').value.trim()
  const fecha = document.getElementById('f-fecha').value
  const cuotas = +document.getElementById('f-cuotas').value || 1
  const desc = +document.getElementById('f-descuento').value || 0
  const notas = document.getElementById('f-notas').value
  const moneda = document.getElementById('f-moneda').value
  const enviarEmail = document.getElementById('f-enviar-email').checked

  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const total = subtotal - desc

  const anio = new Date().getFullYear()
  const { count } = await sb.from('boletas').select('*', { count: 'exact', head: true })
  const numero = `BOL-${anio}-${String((count || 0) + 1).padStart(3, '0')}`

  const { data: boleta, error } = await sb.from('boletas').insert({
    user_id: currentUser.id,
    numero, fecha, cuotas, subtotal, descuento: desc, total,
    cliente_nombre: nombre || null,
    cliente_email: email || null,
    cliente_tel: tel || null,
    moneda,
    notas: notas || null,
    estado: 'pendiente'
  }).select().single()

  if (error || !boleta) { toast('Error al crear la boleta', true); return }

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

  if (enviarEmail && email) {
    await enviarEmailBoleta(boleta.id, email)
  }

  toast('Boleta creada')
  showDetalle(boleta.id)
}

// ── DETALLE ────────────────────────────────────────────
async function loadDetalle(id) {
  const { data: b } = await sb
    .from('boletas')
    .select('*, items_boleta(*)')
    .eq('id', id)
    .single()
  if (!b) return

  document.getElementById('d-numero').textContent = b.numero
  document.getElementById('d-badge').innerHTML = `<span class="badge badge-${b.estado}">${badgeText(b.estado)}</span>`

  const actions = document.getElementById('detalle-actions')
  actions.innerHTML = ''
  if (b.estado === 'pendiente') {
    actions.innerHTML += `<button class="btn btn-success" onclick="cobrar('${b.id}')">Marcar como cobrada</button>`
  }
  if (b.cliente_email) {
    actions.innerHTML += `<button class="btn btn-secondary" onclick="enviarEmailBoleta('${b.id}','${b.cliente_email}').then(()=>toast('Email enviado'))">Enviar por email</button>`
  }
  actions.innerHTML += `<button class="btn btn-ghost" style="color:var(--text3);margin-left:auto" onclick="confirmarBorrar('${b.id}','${b.numero}')">Borrar boleta</button>`

  const cli = document.getElementById('d-cliente')
  if (b.cliente_nombre) {
    cli.innerHTML = `
      <div class="info-row"><span class="info-label">Nombre</span><span class="info-value">${b.cliente_nombre}</span></div>
      ${b.cliente_email ? `<div class="info-row"><span class="info-label">Email</span><span class="info-value">${b.cliente_email}</span></div>` : ''}
      ${b.cliente_tel ? `<div class="info-row"><span class="info-label">Telefono</span><span class="info-value">${b.cliente_tel}</span></div>` : ''}
    `
  } else {
    cli.innerHTML = `<p style="color:var(--text3);font-size:14px">Sin cliente</p>`
  }

  document.getElementById('d-detalles').innerHTML = `
    <div class="info-row"><span class="info-label">Fecha</span><span class="info-value">${fmtFecha(b.fecha)}</span></div>
    <div class="info-row"><span class="info-label">Moneda</span><span class="info-value">${b.moneda || 'AUD'}</span></div>
    <div class="info-row"><span class="info-label">Cuotas</span><span class="info-value">${b.cuotas}</span></div>
    ${b.cuotas > 1 ? `<div class="info-row"><span class="info-label">Por cuota</span><span class="info-value">${fmt(b.total / b.cuotas, b.moneda)}</span></div>` : ''}
  `

  document.getElementById('d-items').innerHTML = b.items_boleta?.map(i => `
    <tr>
      <td>${i.descripcion}</td>
      <td class="text-right">${i.cantidad}</td>
      <td class="text-right">${fmt(i.precio_unitario, b.moneda)}</td>
      <td class="text-right" style="font-weight:600">${fmt(i.subtotal, b.moneda)}</td>
    </tr>
  `).join('') || ''

  document.getElementById('d-totales').innerHTML = `
    <div class="total-row"><span>Subtotal</span><span>${fmt(b.subtotal, b.moneda)}</span></div>
    ${b.descuento > 0 ? `<div class="total-row"><span>Descuento</span><span>-${fmt(b.descuento, b.moneda)}</span></div>` : ''}
    <div class="total-row total-final"><span>Total</span><span>${fmt(b.total, b.moneda)}</span></div>
  `

  const notasSec = document.getElementById('d-notas-sec')
  if (b.notas) {
    notasSec.style.display = ''
    document.getElementById('d-notas').textContent = b.notas
  } else {
    notasSec.style.display = 'none'
  }
}

// ── PERFIL ─────────────────────────────────────────────
async function loadPerfil() {
  const { data } = await sb.from('perfil').select('*').eq('id', 1).maybeSingle()
  if (data) {
    document.getElementById('p-nombre').value = data.nombre || ''
    document.getElementById('p-email').value = data.email || ''
    document.getElementById('p-tel').value = data.telefono || ''
    document.getElementById('p-empresa').value = data.empresa || ''
    document.getElementById('p-direccion').value = data.direccion || ''
    document.getElementById('p-banco').value = data.datos_bancarios || ''
  }
}

async function guardarPerfil() {
  const perfil = {
    id: 1,
    nombre: document.getElementById('p-nombre').value,
    email: document.getElementById('p-email').value,
    telefono: document.getElementById('p-tel').value,
    empresa: document.getElementById('p-empresa').value,
    direccion: document.getElementById('p-direccion').value,
    datos_bancarios: document.getElementById('p-banco').value,
  }
  const { error } = await sb.from('perfil').upsert(perfil)
  if (error) { toast('Error al guardar', true); return }
  toast('Perfil guardado')
}

// ── ACCIONES ───────────────────────────────────────────
async function cobrar(id) {
  if (!confirm('Marcar esta boleta como cobrada?')) return
  await sb.from('boletas').update({ estado: 'cobrada' }).eq('id', id)
  toast('Boleta marcada como cobrada')
  allBoletas = allBoletas.map(b => b.id === id ? { ...b, estado: 'cobrada' } : b)
  renderBoletas(allBoletas)
  const detalle = document.getElementById('view-detalle')
  if (!detalle.classList.contains('hidden')) loadDetalle(id)
}

async function enviarEmailBoleta(boletaId, clienteEmail) {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boletaId, clienteEmail })
    })
    if (!res.ok) throw new Error()
  } catch {
    toast('Error al enviar el email', true)
  }
}

// ── BORRAR ─────────────────────────────────────────────
function confirmarBorrar(id, numero) {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.id = 'modal-borrar'
  backdrop.innerHTML = `
    <div class="modal">
      <h3>Borrar boleta</h3>
      <p style="color:var(--text2);font-size:14px;margin-bottom:8px">
        Estas a punto de borrar la boleta <strong>${numero}</strong>.
      </p>
      <p style="color:var(--red);font-size:13px;background:var(--red-bg);padding:10px 14px;border-radius:8px">
        Esta accion no se puede deshacer.
      </p>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
        <button class="btn btn-danger" onclick="borrarBoleta('${id}')">Borrar definitivamente</button>
      </div>
    </div>
  `
  backdrop.onclick = e => { if (e.target === backdrop) cerrarModal() }
  document.body.appendChild(backdrop)
}

function cerrarModal() {
  const m = document.getElementById('modal-borrar')
  if (m) m.remove()
}

async function borrarBoleta(id) {
  await sb.from('items_boleta').delete().eq('boleta_id', id)
  await sb.from('boletas').delete().eq('id', id)
  cerrarModal()
  toast('Boleta borrada')
  allBoletas = allBoletas.filter(b => b.id !== id)
  renderBoletas(allBoletas)
  showDashboard()
}

// ── UTILS ──────────────────────────────────────────────
function fmt(n, moneda = 'AUD') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: moneda, minimumFractionDigits: 2
  }).format(n || 0)
}

function fmtFecha(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function badgeText(e) {
  return e === 'pendiente' ? 'Pendiente' : e === 'cobrada' ? 'Cobrada' : 'Cancelada'
}

function toast(msg, error = false) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.className = error ? 'show error' : 'show'
  setTimeout(() => t.className = '', 3000)
}