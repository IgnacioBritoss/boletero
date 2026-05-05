// lib/utils.ts

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'AUD',  // Dólares australianos para tu hermano
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatFecha(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
