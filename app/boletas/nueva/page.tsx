'use client'
// app/boletas/nueva/page.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Cliente } from '@/types'
import Link from 'next/link'

interface ItemForm {
  descripcion: string
  cantidad: number
  precio_unitario: number
}

export default function NuevaBoleta() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteId, setClienteId] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [cuotas, setCuotas] = useState(1)
  const [descuento, setDescuento] = useState(0)
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<ItemForm[]>([
    { descripcion: '', cantidad: 1, precio_unitario: 0 }
  ])

  useEffect(() => {
    supabase.from('clientes').select('*').order('nombre').then(({ data }) => {
      if (data) setClientes(data)
    })
  }, [])

  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const total = subtotal - descuento

  const addItem = () => setItems([...items, { descripcion: '', cantidad: 1, precio_unitario: 0 }])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx: number, field: keyof ItemForm, value: string | number) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Obtener número de boleta
    const { data: numData } = await supabase.rpc('siguiente_numero_boleta', { p_user_id: user.id })

    // Crear boleta
    const { data: boleta, error } = await supabase.from('boletas').insert({
      user_id: user.id,
      cliente_id: clienteId || null,
      numero: numData,
      fecha,
      cuotas: Number(cuotas),
      subtotal,
      descuento: Number(descuento),
      total,
      notas: notas || null,
      estado: 'pendiente',
    }).select().single()

    if (error || !boleta) {
      alert('Error al crear la boleta')
      setLoading(false)
      return
    }

    // Insertar items
    if (items.length > 0) {
      await supabase.from('items_boleta').insert(
        items
          .filter(i => i.descripcion.trim())
          .map(i => ({
            boleta_id: boleta.id,
            descripcion: i.descripcion,
            cantidad: Number(i.cantidad),
            precio_unitario: Number(i.precio_unitario),
          }))
      )
    }

    router.push(`/boletas/${boleta.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">← Volver</Link>
          <h1 className="text-lg font-semibold text-gray-900">Nueva boleta</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Cliente + Fecha */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Datos generales</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Cliente</label>
              <select
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sin cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}{c.empresa ? ` - ${c.empresa}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Cuotas</label>
              <input
                type="number"
                min="1"
                value={cuotas}
                onChange={e => setCuotas(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Descuento ($)</label>
              <input
                type="number"
                min="0"
                value={descuento}
                onChange={e => setDescuento(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Detalle del trabajo</h2>
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6">
                {idx === 0 && <label className="text-xs text-gray-500 block mb-1">Descripción</label>}
                <input
                  type="text"
                  placeholder="Descripción del trabajo..."
                  value={item.descripcion}
                  onChange={e => updateItem(idx, 'descripcion', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                {idx === 0 && <label className="text-xs text-gray-500 block mb-1">Cant.</label>}
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={item.cantidad}
                  onChange={e => updateItem(idx, 'cantidad', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-3">
                {idx === 0 && <label className="text-xs text-gray-500 block mb-1">Precio unit. ($)</label>}
                <input
                  type="number"
                  min="0"
                  value={item.precio_unitario}
                  onChange={e => updateItem(idx, 'precio_unitario', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                {idx === 0 && <div className="text-xs text-transparent block mb-1">x</div>}
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)}
                    className="text-gray-400 hover:text-red-500 text-xl leading-none">×</button>
                )}
              </div>
            </div>
          ))}

          <button type="button" onClick={addItem}
            className="text-sm text-blue-600 hover:underline">
            + Agregar línea
          </button>

          {/* Totales */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            {descuento > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Descuento</span><span>-${Number(descuento).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-lg">
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
            {cuotas > 1 && (
              <div className="flex justify-between text-sm text-blue-600">
                <span>{cuotas} cuotas de</span><span>${(total / cuotas).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notas */}
        <div className="card p-6">
          <label className="text-sm font-medium text-gray-700 block mb-2">Notas adicionales</label>
          <textarea
            rows={3}
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Condiciones de pago, detalles extra..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Guardando...' : 'Crear boleta'}
          </button>
          <Link href="/" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
