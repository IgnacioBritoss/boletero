const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  }
})

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  const { boletaId, clienteEmail } = req.body

  // Traer la boleta de Supabase
  const { createClient } = require('@supabase/supabase-js')
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data: b } = await sb
    .from('boletas')
    .select('*, items_boleta(*)')
    .eq('id', boletaId)
    .single()

  if (!b) return res.status(404).json({ error: 'Boleta no encontrada' })

  const { data: perfil } = await sb.from('perfil').select('*').eq('id', 1).maybeSingle()

  const fmt = (n, moneda = 'AUD') =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda }).format(n || 0)

  const itemsHtml = b.items_boleta?.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a">${i.descripcion}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:center;font-size:14px;color:#475569">${i.cantidad}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:14px;color:#475569">${fmt(i.precio_unitario, b.moneda)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:14px;font-weight:600;color:#0f172a">${fmt(i.subtotal, b.moneda)}</td>
    </tr>
  `).join('') || ''

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="max-width:580px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

        <!-- Header -->
        <div style="background:#1d4ed8;padding:28px 32px">
          <h1 style="margin:0;color:white;font-size:20px;font-weight:700">El Boletero</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,.7);font-size:14px">Boleta ${b.numero}</p>
        </div>

        <!-- Body -->
        <div style="padding:28px 32px">
          <p style="margin:0 0 20px;font-size:15px;color:#0f172a">
            Hola <strong>${b.cliente_nombre || 'cliente'}</strong>, te mando el detalle de la boleta.
          </p>

          ${perfil?.nombre ? `
          <div style="background:#f8fafc;border-radius:10px;padding:14px 18px;margin-bottom:20px;font-size:13px;color:#475569">
            <strong style="color:#0f172a">${perfil.nombre}</strong>
            ${perfil.empresa ? `<br>${perfil.empresa}` : ''}
            ${perfil.email ? `<br>${perfil.email}` : ''}
            ${perfil.telefono ? `<br>${perfil.telefono}` : ''}
          </div>` : ''}

          <!-- Items -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
            <thead>
              <tr style="border-bottom:2px solid #e2e8f0">
                <th style="text-align:left;padding:8px 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Descripcion</th>
                <th style="text-align:center;padding:8px 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Cant.</th>
                <th style="text-align:right;padding:8px 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Precio</th>
                <th style="text-align:right;padding:8px 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <!-- Totales -->
          <div style="margin-top:16px;text-align:right">
            <p style="color:#475569;font-size:14px;margin:4px 0">Subtotal: ${fmt(b.subtotal, b.moneda)}</p>
            ${b.descuento > 0 ? `<p style="color:#475569;font-size:14px;margin:4px 0">Descuento: -${fmt(b.descuento, b.moneda)}</p>` : ''}
            <p style="font-size:20px;font-weight:700;color:#0f172a;margin:10px 0 0">Total: ${fmt(b.total, b.moneda)}</p>
            ${b.cuotas > 1 ? `<p style="color:#1d4ed8;font-size:13px;margin:4px 0">${b.cuotas} cuotas de ${fmt(b.total / b.cuotas, b.moneda)}</p>` : ''}
          </div>

          ${perfil?.datos_bancarios ? `
          <div style="margin-top:24px;padding:14px 18px;background:#eff6ff;border-radius:10px;border:1px solid #dbeafe">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:.06em">Datos bancarios</p>
            <p style="margin:0;font-size:14px;color:#0f172a">${perfil.datos_bancarios}</p>
          </div>` : ''}

          ${b.notas ? `
          <div style="margin-top:20px;padding:14px 18px;background:#f8fafc;border-radius:10px">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Notas</p>
            <p style="margin:0;font-size:14px;color:#475569">${b.notas}</p>
          </div>` : ''}
        </div>

        <!-- Footer -->
        <div style="padding:16px 32px;border-top:1px solid #f1f5f9;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8">El Boletero · ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: `"El Boletero" <${process.env.GMAIL_USER}>`,
      to: clienteEmail,
      subject: `Boleta ${b.numero} · ${fmt(b.total, b.moneda)}`,
      html,
    })

    // Notificacion al dueño
    await transporter.sendMail({
      from: `"El Boletero" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `Boleta ${b.numero} enviada a ${b.cliente_nombre || clienteEmail}`,
      text: `La boleta ${b.numero} por ${fmt(b.total, b.moneda)} fue enviada a ${clienteEmail}.`,
    })

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al enviar email' })
  }
}