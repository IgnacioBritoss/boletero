// app/page.tsx - Dashboard principal
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatMoney, formatFecha } from '@/lib/utils'
import { Boleta } from '@/types'
import SignOutButton from '@/components/SignOutButton'
import EstadoBadge from '@/components/EstadoBadge'
import MarcarCobradaButton from '@/components/MarcarCobradaButton'

export default async function Dashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Traer boletas con cliente
  const { data: boletas } = await supabase
    .from('boletas')
    .select('*, clientes(nombre, email)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Calcular stats de balance
  const stats = (boletas || []).reduce(
    (acc, b: Boleta) => {
      if (b.estado === 'cobrada') acc.cobrado += b.total
      if (b.estado === 'pendiente') acc.pendiente += b.total
      if (b.estado === 'pendiente') acc.pendientesCount++
      acc.total++
      return acc
    },
    { cobrado: 0, pendiente: 0, total: 0, pendientesCount: 0 }
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-900">El Boletero</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/boletas/nueva" className="btn-primary flex items-center gap-2">
              <span>+</span> Nueva boleta
            </Link>
            <Link href="/clientes" className="btn-secondary text-sm">Clientes</Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats de balance */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total cobrado</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatMoney(stats.cobrado)}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pendiente</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{formatMoney(stats.pendiente)}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Boletas pendientes</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.pendientesCount}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total boletas</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
          </div>
        </div>

        {/* Tabla de boletas */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Boletas recientes</h2>
            <Link href="/boletas" className="text-sm text-blue-600 hover:underline">Ver todas</Link>
          </div>

          {!boletas || boletas.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 mb-4">Todavía no tenés boletas</p>
              <Link href="/boletas/nueva" className="btn-primary inline-flex">Crear la primera</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">Número</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">Cliente</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">Fecha</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">Total</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">Estado</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(boletas as Boleta[]).map((boleta) => (
                    <tr key={boleta.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/boletas/${boleta.id}`} className="font-mono text-sm font-medium text-blue-600 hover:underline">
                          {boleta.numero}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {boleta.clientes?.nombre || <span className="text-gray-400 italic">Sin cliente</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatFecha(boleta.fecha)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatMoney(boleta.total)}</td>
                      <td className="px-6 py-4">
                        <EstadoBadge estado={boleta.estado} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {boleta.estado === 'pendiente' && (
                            <MarcarCobradaButton boletaId={boleta.id} />
                          )}
                          <Link href={`/boletas/${boleta.id}`}
                            className="text-xs text-gray-500 hover:text-gray-700 underline">
                            Ver
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
