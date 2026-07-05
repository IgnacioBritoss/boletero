// All data operations, gated behind the session cookie.
// MULTI-USER: every row is scoped to the logged-in user's email.
const { sql, getUser, numify } = require('./_lib')

module.exports = async (req, res) => {
  const user = getUser(req)
  if (!user) return res.status(401).json({ error: 'no auth' })
  const email = user.email

  const body = req.body || {}
  const action = body.action || (req.query && req.query.action)

  try {
    switch (action) {
      case 'list': {
        const rows = await sql`
          select id, numero, to_char(fecha,'YYYY-MM-DD') as fecha, cuotas,
                 subtotal, descuento, total, cliente_nombre, cliente_email, cliente_tel,
                 moneda, notas, estado, created_at
          from boletas where user_email = ${email} order by created_at desc`
        return res.status(200).json(rows.map(numify))
      }
      case 'get': {
        const [b] = await sql`
          select id, numero, to_char(fecha,'YYYY-MM-DD') as fecha, cuotas,
                 subtotal, descuento, total, cliente_nombre, cliente_email, cliente_tel,
                 moneda, notas, estado, created_at
          from boletas where id = ${body.id} and user_email = ${email}`
        if (!b) return res.status(404).json({ error: 'not found' })
        numify(b)
        const its = await sql`
          select id, boleta_id, descripcion, cantidad, precio_unitario
          from items_boleta where boleta_id = ${body.id} order by id`
        b.items = its.map(numify)
        const [perfil] = await sql`select * from perfil where user_email = ${email}`
        return res.status(200).json({ boleta: b, perfil: perfil || null })
      }
      case 'create': {
        const bo = body.boleta || {}
        const items = body.items || []
        const [{ count }] = await sql`select count(*)::int as count from boletas where user_email = ${email}`
        const anio = new Date().getFullYear()
        const numero = `INV-${anio}-${String((count || 0) + 1).padStart(3, '0')}`
        const [b] = await sql`
          insert into boletas
            (user_email, numero, fecha, cuotas, subtotal, descuento, total,
             cliente_nombre, cliente_email, cliente_tel, moneda, notas, estado)
          values
            (${email}, ${numero}, ${bo.fecha}, ${bo.cuotas || 1}, ${bo.subtotal || 0}, ${bo.descuento || 0}, ${bo.total || 0},
             ${bo.cliente_nombre || null}, ${bo.cliente_email || null}, ${bo.cliente_tel || null},
             ${bo.moneda || 'AUD'}, ${bo.notas || null}, 'pendiente')
          returning id`
        for (const it of items) {
          if (!it.descripcion || !String(it.descripcion).trim()) continue
          await sql`insert into items_boleta (boleta_id, descripcion, cantidad, precio_unitario)
                    values (${b.id}, ${it.descripcion}, ${it.cantidad || 0}, ${it.precio_unitario || 0})`
        }
        return res.status(200).json({ id: b.id, numero })
      }
      case 'pay': {
        await sql`update boletas set estado = 'cobrada' where id = ${body.id} and user_email = ${email}`
        return res.status(200).json({ ok: true })
      }
      case 'delete': {
        await sql`delete from boletas where id = ${body.id} and user_email = ${email}`
        return res.status(200).json({ ok: true })
      }
      case 'perfil-get': {
        const [perfil] = await sql`select * from perfil where user_email = ${email}`
        return res.status(200).json(perfil || null)
      }
      case 'perfil-save': {
        const p = body.perfil || {}
        await sql`
          insert into perfil (user_email, nombre, email, telefono, empresa, direccion, datos_bancarios)
          values (${email}, ${p.nombre || null}, ${p.email || null}, ${p.telefono || null},
                  ${p.empresa || null}, ${p.direccion || null}, ${p.datos_bancarios || null})
          on conflict (user_email) do update set
            nombre = excluded.nombre, email = excluded.email, telefono = excluded.telefono,
            empresa = excluded.empresa, direccion = excluded.direccion,
            datos_bancarios = excluded.datos_bancarios`
        return res.status(200).json({ ok: true })
      }
      default:
        return res.status(400).json({ error: 'bad action' })
    }
  } catch (e) {
    console.error('data error:', e)
    return res.status(500).json({ error: 'server error' })
  }
}