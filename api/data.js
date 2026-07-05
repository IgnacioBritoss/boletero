// All data operations, gated behind the session cookie.
// POST /api/data  { action, ...payload }
const { sql, getUser, numify } = require('./_lib')

module.exports = async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ error: 'no auth' })

  const body = req.body || {}
  const action = body.action || (req.query && req.query.action)

  try {
    switch (action) {
      case 'list': {
        const rows = await sql`
          select id, numero, to_char(fecha,'YYYY-MM-DD') as fecha, cuotas,
                 subtotal, descuento, total,
                 cliente_nombre, cliente_email, cliente_tel,
                 moneda, notas, estado, created_at
          from boletas order by created_at desc`
        return res.status(200).json(rows.map(numify))
      }

      case 'get': {
        const [b] = await sql`
          select id, numero, to_char(fecha,'YYYY-MM-DD') as fecha, cuotas,
                 subtotal, descuento, total,
                 cliente_nombre, cliente_email, cliente_tel,
                 moneda, notas, estado, created_at
          from boletas where id = ${body.id}`
        if (!b) return res.status(404).json({ error: 'not found' })
        numify(b)
        const its = await sql`
          select id, boleta_id, descripcion, cantidad, precio_unitario
          from items_boleta where boleta_id = ${body.id} order by id`
        b.items = its.map(numify)
        const [perfil] = await sql`select * from perfil where id = 1`
        return res.status(200).json({ boleta: b, perfil: perfil || null })
      }

      case 'create': {
        const bo = body.boleta || {}
        const items = body.items || []
        const [{ count }] = await sql`select count(*)::int as count from boletas`
        const anio = new Date().getFullYear()
        const numero = `INV-${anio}-${String((count || 0) + 1).padStart(3, '0')}`

        const [b] = await sql`
          insert into boletas
            (numero, fecha, cuotas, subtotal, descuento, total,
             cliente_nombre, cliente_email, cliente_tel, moneda, notas, estado)
          values
            (${numero}, ${bo.fecha}, ${bo.cuotas || 1}, ${bo.subtotal || 0}, ${bo.descuento || 0}, ${bo.total || 0},
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
        await sql`update boletas set estado = 'cobrada' where id = ${body.id}`
        return res.status(200).json({ ok: true })
      }

      case 'delete': {
        await sql`delete from boletas where id = ${body.id}` // items cascade
        return res.status(200).json({ ok: true })
      }

      case 'perfil-get': {
        const [perfil] = await sql`select * from perfil where id = 1`
        return res.status(200).json(perfil || null)
      }

      case 'perfil-save': {
        const p = body.perfil || {}
        await sql`
          insert into perfil (id, nombre, email, telefono, empresa, direccion, datos_bancarios)
          values (1, ${p.nombre || null}, ${p.email || null}, ${p.telefono || null},
                  ${p.empresa || null}, ${p.direccion || null}, ${p.datos_bancarios || null})
          on conflict (id) do update set
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
