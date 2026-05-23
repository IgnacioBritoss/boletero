const SUPABASE_URL = 'https://wtoismnhemzkxonlkibe.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0b2lzbW5oZW16a3hvbmxraWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTE1ODEsImV4cCI6MjA5MzU4NzU4MX0.6MKRi9-M0j6Ysi5EKWSi3O7Vv_nc8Ng9yufwFyGexLs'

const { createClient } = supabase
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let currentUser = null
let allBoletas = []
let items = []

function initTheme() { setTheme(localStorage.getItem('theme') || 'light') }
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('theme', t)
  document.getElementById('icon-moon').classList.toggle('hidden', t === 'dark')
  document.getElementById('icon-sun').classList.toggle('hidden', t === 'light')
}
function toggleTheme() {
  setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')
}
initTheme()

sb.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
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

document.getElementById('btn-google').onclick = () =>
  sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })

function signOut() { sb.auth.signOut() }

function titleCase(str) {
  if (!str) return ''
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

function fmt(n, moneda = 'AUD') {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency', currency: moneda, minimumFractionDigits: 2
  }).format(n || 0)
}

function fmtFecha(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function badgeText(e) {
  return e === 'pendiente' ? 'Pending' : e === 'cobrada' ? 'Paid' : 'Cancelled'
}

function toast(msg, error = false) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.className = error ? 'show error' : 'show'
  setTimeout(() => t.className = '', 3000)
}

function hideAll() {
  ['view-dashboard','view-nueva','view-detalle','view-perfil']
    .forEach(id => document.getElementById(id).classList.add('hidden'))
}
function showDashboard() { hideAll(); document.getElementById('view-dashboard').classList.remove('hidden'); loadDashboard() }
function showNueva()     { hideAll(); document.getElementById('view-nueva').classList.remove('hidden'); initNuevaForm() }
function showDetalle(id) { hideAll(); document.getElementById('view-detalle').classList.remove('hidden'); loadDetalle(id) }
function showPerfil()    { hideAll(); document.getElementById('view-perfil').classList.remove('hidden'); loadPerfil() }

async function loadDashboard() {
  const { data } = await sb.from('boletas').select('*').order('created_at', { ascending: false })
  allBoletas = data || []
  renderBoletas(allBoletas)
}

let filtroActual = ''
const filtroOpciones = ['', 'pendiente', 'cobrada']
const filtroLabels = { '': 'All', 'pendiente': 'Pending', 'cobrada': 'Paid' }
const filtroClasses = { '': '', 'pendiente': 'active-pending', 'cobrada': 'active-paid' }

function cycleFilter() {
  const idx = filtroOpciones.indexOf(filtroActual)
  filtroActual = filtroOpciones[(idx + 1) % filtroOpciones.length]
  const btn = document.getElementById('filtro-btn')
  btn.className = 'filter-toggle ' + filtroClasses[filtroActual]
  document.getElementById('filtro-label').textContent = filtroLabels[filtroActual]
  renderBoletas(filtroActual ? allBoletas.filter(b => b.estado === filtroActual) : allBoletas)
}

function renderBoletas(boletas) {
  let cobrado = 0, pendiente = 0, pendCount = 0
  allBoletas.forEach(b => {
    if (b.estado === 'cobrada')   cobrado   += b.total
    if (b.estado === 'pendiente') { pendiente += b.total; pendCount++ }
  })
  document.getElementById('stat-cobrado').textContent    = fmt(cobrado, 'AUD')
  document.getElementById('stat-pendiente').textContent  = fmt(pendiente, 'AUD')
  document.getElementById('stat-count-pend').textContent = pendCount
  document.getElementById('stat-total').textContent      = allBoletas.length

  const tbody = document.getElementById('boletas-tbody')
  const empty = document.getElementById('boletas-empty')
  const table = document.getElementById('boletas-table')

  if (boletas.length === 0) { empty.classList.remove('hidden'); table.classList.add('hidden'); return }
  empty.classList.add('hidden'); table.classList.remove('hidden')

  tbody.innerHTML = boletas.map(b => `
    <tr onclick="showDetalle('${b.id}')">
      <td><span class="mono" style="color:var(--blue);font-weight:600">${b.numero}</span></td>
      <td>${b.cliente_nombre ? titleCase(b.cliente_nombre) : '<span style="color:var(--text3);font-style:italic">No client</span>'}</td>
      <td style="color:var(--text2)">${fmtFecha(b.fecha)}</td>
      <td style="font-weight:600">${fmt(b.total, b.moneda || 'AUD')}</td>
      <td><span class="badge badge-${b.estado}">${badgeText(b.estado)}</span></td>
      <td onclick="event.stopPropagation()">
        ${b.estado === 'pendiente'
          ? `<button class="btn-paid-row" onclick="cobrar('${b.id}')">Mark as paid</button>`
          : ''}
      </td>
    </tr>
  `).join('')
}

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
  document.getElementById('clientes-list').innerHTML = nombres.map(n => `<option value="${n}">`).join('')

  document.getElementById('f-cliente-nombre').oninput = function() {
    const match = allBoletas.find(b => b.cliente_nombre === this.value)
    if (match) {
      if (match.cliente_email) document.getElementById('f-cliente-email').value = match.cliente_email
      if (match.cliente_tel)   document.getElementById('f-cliente-tel').value   = match.cliente_tel
    }
  }
  document.getElementById('f-cuotas').oninput   = recalc
  document.getElementById('f-descuento').oninput = recalc
  document.getElementById('f-moneda').onchange   = recalc
}

function renderItems() {
  document.getElementById('items-container').innerHTML = items.map((item, i) => `
    <div class="item-row">
<input type="text" placeholder="Description..." value="${item.descripcion.replace(/"/g, '&quot;')}"        oninput="items[${i}].descripcion=this.value">
      <input type="number" value="${item.cantidad}" min="0" step="0.5"
        oninput="items[${i}].cantidad=+this.value;recalc()">
      <input type="number" value="${item.precio_unitario}" min="0" step="0.01"
        oninput="items[${i}].precio_unitario=+this.value;recalc()">
      ${items.length > 1
        ? `<button class="btn-remove" onclick="removeItem(${i})">&#x2715;</button>`
        : '<span></span>'}
    </div>
  `).join('')
  recalc()
}

function addItem()     { items.push({ descripcion: '', cantidad: 1, precio_unitario: 0 }); renderItems() }
function removeItem(i) { items.splice(i, 1); renderItems() }

function recalc() {
  const moneda   = document.getElementById('f-moneda')?.value || 'AUD'
  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const desc     = +document.getElementById('f-descuento').value || 0
  const total    = subtotal - desc
  const cuotas   = +document.getElementById('f-cuotas').value || 1

  document.getElementById('t-subtotal').textContent = fmt(subtotal, moneda)
  document.getElementById('t-total').textContent    = fmt(total, moneda)

  const descRow = document.getElementById('descuento-row')
  if (desc > 0) { descRow.style.display = 'flex'; document.getElementById('t-descuento').textContent = `-${fmt(desc, moneda)}` }
  else descRow.style.display = 'none'

  const cuotasInfo = document.getElementById('cuotas-info')
  if (cuotas > 1) { cuotasInfo.classList.remove('hidden'); cuotasInfo.textContent = `${cuotas} instalments of ${fmt(total / cuotas, moneda)}` }
  else cuotasInfo.classList.add('hidden')
}

async function crearBoleta() {
  const nombre   = document.getElementById('f-cliente-nombre').value.trim()
  const email    = document.getElementById('f-cliente-email').value.trim()
  const tel      = document.getElementById('f-cliente-tel').value.trim()
  const fecha    = document.getElementById('f-fecha').value
  const cuotas   = +document.getElementById('f-cuotas').value || 1
  const desc     = +document.getElementById('f-descuento').value || 0
  const notas    = document.getElementById('f-notas').value
  const moneda   = document.getElementById('f-moneda').value
  const envEmail = document.getElementById('f-enviar-email').checked

  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const total    = subtotal - desc

  const anio = new Date().getFullYear()
  const { count } = await sb.from('boletas').select('*', { count: 'exact', head: true })
  const numero = `INV-${anio}-${String((count || 0) + 1).padStart(3, '0')}`

  const { data: boleta, error } = await sb.from('boletas').insert({
    user_id: currentUser.id, numero, fecha, cuotas, subtotal,
    descuento: desc, total,
    cliente_nombre: nombre || null,
    cliente_email:  email  || null,
    cliente_tel:    tel    || null,
    moneda, notas: notas || null, estado: 'pendiente'
  }).select().single()

  if (error || !boleta) { toast('Error creating invoice', true); return }

  const validos = items.filter(i => i.descripcion.trim())
  if (validos.length) {
    const { error: itemsError } = await sb.from('items_boleta').insert(validos.map(i => ({
      boleta_id: boleta.id,
      descripcion: i.descripcion,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario
    })))
    if (itemsError) { toast('Error saving items', true); console.error(itemsError); return }
  }

  if (envEmail && email) await enviarEmailBoleta(boleta.id, email)

  toast('Invoice created')
  showDetalle(boleta.id)
}

async function loadDetalle(id) {
  const { data: b } = await sb.from('boletas').select('*, items_boleta(*)').eq('id', id).single()
  const { data: perfil } = await sb.from('perfil').select('*').eq('id', 1).maybeSingle()
  if (!b) return

  document.getElementById('d-badge').innerHTML = `<span class="badge badge-${b.estado}" style="padding:8px 18px;font-size:14px;font-weight:600">${b.numero} · ${badgeText(b.estado)}</span>`
  const actions = document.getElementById('detalle-actions')
  actions.innerHTML = ''
  if (b.estado === 'pendiente') {
    actions.innerHTML += `<button class="btn btn-success" onclick="cobrar('${b.id}')">Mark as paid</button>`
  }
  if (b.cliente_email) {
    actions.innerHTML += `<button class="btn btn-secondary" onclick="enviarEmailBoleta('${b.id}','${b.cliente_email}')">Send email</button>`
  }
  if (b.cliente_tel) {
    const tel = b.cliente_tel.replace(/\D/g, '')
    const texto = encodeURIComponent(
`Hi ${titleCase(b.cliente_nombre) || ''}!

Please find attached invoice ${b.numero} for the work completed.

Amount due: ${fmt(b.total, b.moneda || 'AUD')}${b.cuotas > 1 ? `\n${b.cuotas} instalments of ${fmt(b.total / b.cuotas, b.moneda || 'AUD')}` : ''}

${perfil?.datos_bancarios ? `Bank details:\n${perfil.datos_bancarios}\n` : ''}Please do not hesitate to reach out if you have any questions.
Thank you!`)
    actions.innerHTML += `
      <button class="btn" style="background:#25d366;color:white" onclick="
        compartirPDF('${b.id}');
        setTimeout(() => window.open('https://wa.me/${tel}?text=${texto}', '_blank'), 1500)
      ">WhatsApp</button>
    `
  }
  actions.innerHTML += `<button class="btn btn-delete" style="margin-left:auto" onclick="confirmarBorrar('${b.id}','${b.numero}')">Delete</button>`

  document.getElementById('d-cliente').innerHTML = b.cliente_nombre ? `
    <div class="info-row"><span class="info-label">Name</span><span class="info-value">${titleCase(b.cliente_nombre)}</span></div>
    ${b.cliente_email ? `<div class="info-row"><span class="info-label">Email</span><span class="info-value">${b.cliente_email}</span></div>` : ''}
    ${b.cliente_tel ? `<div class="info-row"><span class="info-label">Phone</span><span class="info-value">${b.cliente_tel}</span></div>` : ''}
  ` : `<p style="color:var(--text3);font-size:14px">No client</p>`

  document.getElementById('d-detalles').innerHTML = `
    <div class="info-row"><span class="info-label">Date</span><span class="info-value">${fmtFecha(b.fecha)}</span></div>
    <div class="info-row"><span class="info-label">Currency</span><span class="info-value">${b.moneda || 'AUD'}</span></div>
    <div class="info-row"><span class="info-label">Instalments</span><span class="info-value">${b.cuotas}</span></div>
    ${b.cuotas > 1 ? `<div class="info-row"><span class="info-label">Per instalment</span><span class="info-value">${fmt(b.total / b.cuotas, b.moneda)}</span></div>` : ''}
  `

  document.getElementById('d-items').innerHTML = b.items_boleta?.map(i => `
    <tr>
      <td>${i.descripcion}</td>
      <td class="text-right">${i.cantidad}</td>
      <td class="text-right">${fmt(i.precio_unitario, b.moneda)}</td>
      <td class="text-right" style="font-weight:600">${fmt(i.cantidad * i.precio_unitario, b.moneda)}</td>
    </tr>
  `).join('') || ''

  document.getElementById('d-totales').innerHTML = `
    <div class="total-row"><span>Subtotal</span><span>${fmt(b.subtotal, b.moneda)}</span></div>
    ${b.descuento > 0 ? `<div class="total-row"><span>Discount</span><span>-${fmt(b.descuento, b.moneda)}</span></div>` : ''}
    <div class="total-row total-final"><span>Total</span><span>${fmt(b.total, b.moneda)}</span></div>
  `

  const notasSec = document.getElementById('d-notas-sec')
  notasSec.style.display = b.notas ? '' : 'none'
  if (b.notas) document.getElementById('d-notas').textContent = b.notas
}

async function compartirPDF(id) {
  const { data: b } = await sb.from('boletas').select('*, items_boleta(*)').eq('id', id).single()
  const { data: perfil } = await sb.from('perfil').select('*').eq('id', 1).maybeSingle()
  if (!b) return

  const { jsPDF } = window.jspdf
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const azul     = [29, 78, 216]
  const gris     = [100, 116, 139]
  const negro    = [15, 23, 42]
  const lineGris = [226, 232, 240]
  const W = 210, pad = 20

  doc.setFillColor(...azul)
  doc.rect(0, 0, W, 42, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('El Boletero', pad, 18)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Invoice ${b.numero}`, pad, 28)
  doc.text(fmtFecha(b.fecha), pad, 35)

  let y = 54
  const col2 = W / 2 + 5

  if (perfil?.nombre) {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...gris)
    doc.text('FROM', pad, y); y += 5
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...negro)
    doc.text(perfil.nombre, pad, y); y += 5
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...gris)
    if (perfil.empresa)   { doc.text(perfil.empresa,   pad, y); y += 4 }
    if (perfil.email)     { doc.text(perfil.email,     pad, y); y += 4 }
    if (perfil.telefono)  { doc.text(perfil.telefono,  pad, y); y += 4 }
    if (perfil.direccion) { doc.text(perfil.direccion, pad, y); y += 4 }
  }

  if (b.cliente_nombre) {
    let yc = 54
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...gris)
    doc.text('TO', col2, yc); yc += 5
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...negro)
    doc.text(titleCase(b.cliente_nombre), col2, yc); yc += 5
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...gris)
    if (b.cliente_email) { doc.text(b.cliente_email, col2, yc); yc += 4 }
    if (b.cliente_tel)   { doc.text(b.cliente_tel,   col2, yc); yc += 4 }
    y = Math.max(y, yc)
  }

  y += 8
  doc.setDrawColor(...lineGris); doc.setLineWidth(0.3)
  doc.line(pad, y, W - pad, y); y += 8

  doc.setFillColor(248, 250, 252)
  doc.rect(pad, y, W - pad * 2, 8, 'F')
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...gris)
  doc.text('DESCRIPTION', pad + 2, y + 5.5)
  doc.text('QTY.', 130, y + 5.5, { align: 'right' })
  doc.text('PRICE', 158, y + 5.5, { align: 'right' })
  doc.text('SUBTOTAL', W - pad - 2, y + 5.5, { align: 'right' })
  y += 8

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  b.items_boleta?.forEach((item, idx) => {
    if (idx % 2 === 0) { doc.setFillColor(252, 252, 253); doc.rect(pad, y, W - pad * 2, 7, 'F') }
    doc.setTextColor(...negro); doc.text(item.descripcion, pad + 2, y + 5)
    doc.setTextColor(...gris)
    doc.text(String(item.cantidad), 130, y + 5, { align: 'right' })
    doc.text(fmt(item.precio_unitario, b.moneda), 158, y + 5, { align: 'right' })
    doc.setTextColor(...negro); doc.setFont('helvetica', 'bold')
    doc.text(fmt(item.cantidad * item.precio_unitario, b.moneda), W - pad - 2, y + 5, { align: 'right' })
    doc.setFont('helvetica', 'normal'); y += 7
  })

  y += 4
  doc.setDrawColor(...lineGris); doc.line(pad, y, W - pad, y); y += 6

  const addTotal = (label, value, bold = false) => {
    doc.setFontSize(bold ? 11 : 9)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(bold ? negro[0] : gris[0], bold ? negro[1] : gris[1], bold ? negro[2] : gris[2])
    doc.text(label, 140, y)
    doc.text(value, W - pad - 2, y, { align: 'right' })
    y += bold ? 7 : 5
  }
  addTotal('Subtotal', fmt(b.subtotal, b.moneda))
  if (b.descuento > 0) addTotal('Discount', `-${fmt(b.descuento, b.moneda)}`)
  doc.setDrawColor(...lineGris); doc.line(140, y, W - pad, y); y += 4
  addTotal('TOTAL', fmt(b.total, b.moneda), true)

  if (b.cuotas > 1) {
    y += 2
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...azul)
    doc.text(`${b.cuotas} instalments of ${fmt(b.total / b.cuotas, b.moneda)}`, W - pad - 2, y, { align: 'right' })
    y += 6
  }

  if (perfil?.datos_bancarios) {
    y += 6
    doc.setDrawColor(...lineGris); doc.line(pad, y, W - pad, y); y += 6
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...gris)
    doc.text('BANK DETAILS', pad, y); y += 4
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...negro)
    doc.text(perfil.datos_bancarios, pad, y)
  }

  if (b.notas) {
    y += 10
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...gris)
    doc.text('NOTES', pad, y); y += 4
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...negro)
    const lines = doc.splitTextToSize(b.notas, W - pad * 2)
    doc.text(lines, pad, y)
  }

  const pdfBlob = doc.output('blob')
  const fileName = `${b.numero}.pdf`

  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Invoice ${b.numero}` })
        return
      }
    } catch (e) { /* fallback */ }
  }

  const url = URL.createObjectURL(pdfBlob)
  const a = document.createElement('a')
  a.href = url; a.download = fileName; a.click()
  URL.revokeObjectURL(url)
  toast('PDF downloaded')
}

async function enviarEmailBoleta(boletaId, clienteEmail) {
  try {
    const { data: b } = await sb.from('boletas').select('*, items_boleta(*)').eq('id', boletaId).single()
    const { data: perfil } = await sb.from('perfil').select('*').eq('id', 1).maybeSingle()
    if (!b) { toast('Invoice not found', true); return }

    const itemsHtml = b.items_boleta?.map(i => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px">${i.descripcion}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:14px">${i.cantidad}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px">${fmt(i.precio_unitario, b.moneda)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px;font-weight:600">${fmt(i.cantidad * i.precio_unitario, b.moneda)}</td>
      </tr>
    `).join('') || ''

    const detalle = `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:4px">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em">Description</th>
          <th style="padding:8px 12px;text-align:center;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em">Qty</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em">Price</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>`

    emailjs.init('WH4xuL0wMnwo0jllv')

    await emailjs.send('service_vdabye8', 'template_wcafgjn', {
      to_email: clienteEmail,
      cliente_nombre: titleCase(b.cliente_nombre) || 'Client',
      numero: b.numero,
      detalle: detalle,
      total: fmt(b.total, b.moneda),
      datos_bancarios: perfil?.datos_bancarios || '',
      notas: b.notas || '',
    })

    toast('Email sent')
  } catch (err) {
    console.error(err)
    toast('Error sending email', true)
  }
}

async function loadPerfil() {
  const { data } = await sb.from('perfil').select('*').eq('id', 1).maybeSingle()
  if (!data) return
  document.getElementById('p-nombre').value    = data.nombre || ''
  document.getElementById('p-email').value     = data.email || ''
  document.getElementById('p-tel').value       = data.telefono || ''
  document.getElementById('p-empresa').value   = data.empresa || ''
  document.getElementById('p-direccion').value = data.direccion || ''
  document.getElementById('p-banco').value     = data.datos_bancarios || ''
}

async function guardarPerfil() {
  const { error } = await sb.from('perfil').upsert({
    id: 1,
    nombre:          document.getElementById('p-nombre').value,
    email:           document.getElementById('p-email').value,
    telefono:        document.getElementById('p-tel').value,
    empresa:         document.getElementById('p-empresa').value,
    direccion:       document.getElementById('p-direccion').value,
    datos_bancarios: document.getElementById('p-banco').value,
  })
  if (error) { toast('Error saving', true); return }
  toast('Profile saved')
}

async function cobrar(id) {
  if (!confirm('Mark this invoice as paid?')) return
  await sb.from('boletas').update({ estado: 'cobrada' }).eq('id', id)
  toast('Invoice marked as paid')
  allBoletas = allBoletas.map(b => b.id === id ? { ...b, estado: 'cobrada' } : b)
  renderBoletas(allBoletas)
  if (!document.getElementById('view-detalle').classList.contains('hidden')) loadDetalle(id)
}

function confirmarBorrar(id, numero) {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.id = 'modal-borrar'
  backdrop.innerHTML = `
    <div class="modal">
      <h3>Delete invoice</h3>
      <p class="modal-body">Delete <strong>${numero}</strong>? This cannot be undone.</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="cerrarModal()">Cancel</button>
        <button class="btn btn-delete" onclick="borrarBoleta('${id}')">Delete</button>
      </div>
    </div>
  `
  backdrop.onclick = e => { if (e.target === backdrop) cerrarModal() }
  document.body.appendChild(backdrop)
}

function cerrarModal() { document.getElementById('modal-borrar')?.remove() }

async function borrarBoleta(id) {
  await sb.from('items_boleta').delete().eq('boleta_id', id)
  await sb.from('boletas').delete().eq('id', id)
  cerrarModal()
  toast('Invoice deleted')
  allBoletas = allBoletas.filter(b => b.id !== id)
  showDashboard()
}