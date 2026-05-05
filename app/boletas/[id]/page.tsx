// app/boletas/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { formatMoney, formatFecha } from '@/lib/utils'
import EstadoBadge from '@/components/EstadoBadge'
import MarcarCobradaButton from '@/components/MarcarCobradaButton'
import EnviarEmailButton from '@/components/EnviarEmailButton'

export default async function BoletaDetalle({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: boleta } = await supabase
    .from('boletas')
    .select('*, clientes(*), items_boleta(*)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!boleta) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600">← Volver</Link>
            <h1 className="text-lg font-semibold text-gray-900">{boleta.numero}</h1>
            <EstadoBadge estado={boleta.estado} />
          </div>
          <div className="flex items-center gap-2">
            {boleta.estado === 'pendiente' && <MarcarCobradaButton boletaId={boleta.id} />}
            {boleta.clientes?.email && (
              <EnviarEmailButton boletaId={boleta.id} clienteEmail={boleta.clientes.email} />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Datos del cliente */}
        <div className="card p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Cliente</h3>
              {boleta.clientes ? (
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">{boleta.clientes.nombre}</p>
                  {boleta.clientes.empresa && <p className="text-sm text-gray-600">{boleta.clientes.empresa}</p>}
                  {boleta.clientes.email && <p className="text-sm text-gray-500">{boleta.clientes.email}</p>}
                  {boleta.clientes.telefono && <p className="text-sm text-gray-500">{boleta.clientes.telefono}</p>}
                </div>
              ) : (
                <p className="text-gray-400 italic text-sm">Sin cliente asignado</p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Detalles</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha</span>
                  <span className="text-gray-800">{formatFecha(boleta.fecha)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cuotas</span>
                  <span className="text-gray-800">{boleta.cuotas}</span>
                </div>
                {boleta.cuotas > 1 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Por cuota</span>
                    <span className="text-gray-800">{formatMoney(boleta.total / boleta.cuotas)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Descripción</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Cant.</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Precio unit.</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {boleta.items_boleta?.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-6 py-3 text-sm text-gray-800">{item.descripcion}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.cantidad}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatMoney(item.precio_unitario)}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-800 text-right">{formatMoney(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-6 py-4 border-t border-gray-100 space-y-2 bg-gray-50">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{formatMoney(boleta.subtotal)}</span>
            </div>
            {boleta.descuento > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Descuento</span><span>-{formatMoney(boleta.descuento)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-lg">
              <span>Total</span><span>{formatMoney(boleta.total)}</span>
            </div>
          </div>
        </div>

        {/* Notas */}
        {boleta.notas && (
          <div className="card p-6">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Notas</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{boleta.notas}</p>
          </div>
        )}
      </main>
    </div>
  )
}
