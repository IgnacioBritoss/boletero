// app/api/send-email/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { formatMoney, formatFecha } from '@/lib/utils'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { boletaId } = await request.json()

  const { data: boleta } = await supabase
    .from('boletas')
    .select('*, clientes(*), items_boleta(*)')
    .eq('id', boletaId)
    .eq('user_id', user.id)
    .single()

  if (!boleta) return NextResponse.json({ error: 'Boleta no encontrada' }, { status: 404 })
  if (!boleta.clientes?.email) return NextResponse.json({ error: 'Cliente sin email' }, { status: 400 })

  const itemsHtml = boleta.items_boleta?.map((item: any) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px">${item.descripcion}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:center;font-size:14px">${item.cantidad}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:14px">${formatMoney(item.precio_unitario)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:14px;font-weight:600">${formatMoney(item.subtotal)}</td>
    </tr>
  `).join('')

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
      <div style="background:#2563eb;color:white;padding:24px;border-radius:12px 12px 0 0">
        <h1 style="margin:0;font-size:22px">El Boletero</h1>
        <p style="margin:4px 0 0;opacity:.8;font-size:14px">Boleta ${boleta.numero}</p>
      </div>
      <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p style="margin:0 0 16px">Hola ${boleta.clientes.nombre},</p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:14px">
          Te envío el detalle de la boleta correspondiente al trabajo realizado.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb">
              <th style="text-align:left;padding:8px 0;font-size:12px;color:#6b7280;text-transform:uppercase">Descripción</th>
              <th style="text-align:center;padding:8px 0;font-size:12px;color:#6b7280;text-transform:uppercase">Cant.</th>
              <th style="text-align:right;padding:8px 0;font-size:12px;color:#6b7280;text-transform:uppercase">Precio</th>
              <th style="text-align:right;padding:8px 0;font-size:12px;color:#6b7280;text-transform:uppercase">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div style="margin-top:16px;text-align:right">
          ${boleta.descuento > 0 ? `<p style="color:#6b7280;font-size:14px;margin:4px 0">Descuento: -${formatMoney(boleta.descuento)}</p>` : ''}
          <p style="font-size:20px;font-weight:700;margin:8px 0">Total: ${formatMoney(boleta.total)}</p>
          ${boleta.cuotas > 1 ? `<p style="color:#2563eb;font-size:14px;margin:0">${boleta.cuotas} cuotas de ${formatMoney(boleta.total / boleta.cuotas)}</p>` : ''}
        </div>

        ${boleta.notas ? `
        <div style="margin-top:24px;padding:16px;background:white;border-radius:8px;border:1px solid #e5e7eb">
          <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600">Notas</p>
          <p style="margin:8px 0 0;font-size:14px;color:#374151">${boleta.notas}</p>
        </div>
        ` : ''}

        <p style="margin:24px 0 0;font-size:13px;color:#9ca3af">Fecha: ${formatFecha(boleta.fecha)}</p>
      </div>
    </body>
    </html>
  `

  const { error } = await resend.emails.send({
    from: 'El Boletero <boletas@tudominio.com>',
    to: boleta.clientes.email,
    subject: `Boleta ${boleta.numero} · ${formatMoney(boleta.total)}`,
    html: emailHtml,
  })

  if (error) return NextResponse.json({ error: 'Error al enviar email' }, { status: 500 })

  // Marcar como enviada
  await supabase.from('boletas').update({ enviada_por_email: true }).eq('id', boletaId)

  return NextResponse.json({ ok: true })
}
