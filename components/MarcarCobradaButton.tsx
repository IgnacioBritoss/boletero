'use client'
// components/MarcarCobradaButton.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarcarCobradaButton({ boletaId }: { boletaId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    if (!confirm('¿Marcar esta boleta como cobrada?')) return
    setLoading(true)
    await fetch(`/api/boletas/${boletaId}/cobrar`, { method: 'POST' })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
    >
      {loading ? '...' : '✓ Cobrada'}
    </button>
  )
}
