# El Boletero

Sistema de facturación para trabajadores independientes.

## Stack
- **Frontend**: Next.js 14 (App Router)
- **Base de datos**: Supabase (Postgres)
- **Auth**: Google OAuth via Supabase
- **Email**: Supabase SMTP / Resend
- **Deploy**: Vercel

## Setup

### 1. Variables de entorno
Crear `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_key
ALLOWED_EMAIL=email_de_tu_hermano@gmail.com
```

### 2. Supabase
1. Crear proyecto en supabase.com
2. Habilitar Google OAuth en Authentication > Providers
3. Correr el SQL de `/supabase/schema.sql`
4. Agregar email de tu hermano en `ALLOWED_EMAIL`

### 3. Google OAuth
1. Ir a console.cloud.google.com
2. Crear credenciales OAuth 2.0
3. Agregar redirect: `https://[tu-proyecto].supabase.co/auth/v1/callback`

### 4. Deploy en Vercel
```bash
vercel --prod
```
Agregar las env vars en el dashboard de Vercel.
