'use client'
// components/EstadoBadge.tsx
import { EstadoBoleta } from '@/types'

export default function EstadoBadge({ estado }: { estado: EstadoBoleta }) {
  return (
    <span className={
      estado === 'pendiente' ? 'badge-pendiente' :
      estado === 'cobrada' ? 'badge-cobrada' : 'badge-cancelada'
    }>
      {estado === 'pendiente' ? '⏳ Pendiente' :
       estado === 'cobrada' ? '✓ Cobrada' : '✕ Cancelada'}
    </span>
  )
}
