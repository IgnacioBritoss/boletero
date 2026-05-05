// types/index.ts

export type EstadoBoleta = 'pendiente' | 'cobrada' | 'cancelada'

export interface Cliente {
  id: string
  user_id: string
  nombre: string
  email: string | null
  telefono: string | null
  empresa: string | null
  direccion: string | null
  notas: string | null
  created_at: string
}

export interface ItemBoleta {
  id: string
  boleta_id: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface Boleta {
  id: string
  user_id: string
  cliente_id: string | null
  numero: string
  estado: EstadoBoleta
  fecha: string
  fecha_vencimiento: string | null
  subtotal: number
  descuento: number
  total: number
  cuotas: number
  notas: string | null
  enviada_por_email: boolean
  created_at: string
  updated_at: string
  // Joins
  clientes?: Cliente
  items_boleta?: ItemBoleta[]
}

export interface BoletaConItems extends Boleta {
  clientes: Cliente
  items_boleta: ItemBoleta[]
}

export interface StatsBalance {
  total_cobrado: number
  total_pendiente: number
  total_cancelado: number
  cantidad_boletas: number
  boletas_pendientes: number
  boletas_cobradas: number
}
