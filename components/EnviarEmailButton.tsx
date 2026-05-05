'use client'
// components/EnviarEmailButton.tsx
import { useState } from 'react'

export default function EnviarEmailButton({ boletaId, clienteEmail }: { boletaId: string, clienteEmail: string }) {
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const handleClick = async () => {
    if (!confirm(`¿Enviar la boleta por email a ${clienteEmail}?`)) return
    setLoading(true)
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boletaId }),
    })
    setLoading(false)
    if (res.ok) setEnviado(true)
    else alert('Error al enviar el email')
  }

  if (enviado) return <span className="text-xs text-green-600 font-medium">✓ Email enviado</span>

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
      {loading ? 'Enviando...' : 'Enviar por email'}
    </button>
  )
}
