# El Boletero · Migración a Neon — Tutorial

Guía completa para poner a andar la app con **Neon** (base de datos) y
**Google Sign-In** (login), reemplazando a Supabase.

> **¿Por qué no andaba el login?** Tu proyecto de Supabase
> (`wtoismnhemzkxonlkibe.supabase.co`) dejó de existir (se borró o se pausó por
> inactividad). Supabase te daba **login + base de datos** en uno solo. Neon es
> **solo base de datos**, así que ahora la app tiene un pequeño backend propio
> (la carpeta `/api`) que se conecta a Neon y valida el login de Google.

> ⚠️ **Los datos viejos de Supabase probablemente se perdieron.** Si el proyecto
> se borró, no se recuperan y vas a tener que cargar las boletas de nuevo. Si
> solo estaba pausado, podés entrar a Supabase y reactivarlo para exportarlos.

---

## Qué cambió en el código (ya está hecho, no tenés que tocar nada)

- ❌ Se sacó Supabase (auth + tablas desde el navegador).
- ✅ `/api/auth.js` — valida el login de Google y crea tu sesión (cookie firmada).
- ✅ `/api/data.js` — todas las operaciones (listar/crear/cobrar/borrar boletas y perfil) contra Neon.
- ✅ `/api/_lib.js` — helpers compartidos (conexión a Neon + sesión).
- ✅ `app.js` / `index.html` — ahora hablan con `/api` en vez de Supabase.
- ✅ `schema.sql` — las tablas para crear en Neon.
- ✅ Retoque de diseño: transiciones entre pantallas, botones con animación, inputs/selects custom, badges con color.

**Solo tenés que hacer los pasos de abajo** (crear la base, el login de Google y
poner 4 variables en Vercel).

---

## Paso 1 · Crear la base en Neon

1. Entrá a **https://neon.tech** y creá una cuenta (podés entrar con GitHub o Google). Es gratis.
2. **Create project** → ponele un nombre (`boletero`) → región la más cercana → **Create**.
3. En el menú lateral abrí **SQL Editor**.
4. Abrí el archivo `schema.sql` de este repo, copiá **todo** su contenido, pegalo en el editor y apretá **Run**. Eso crea las tablas `perfil`, `boletas` e `items_boleta`.
5. Ahora la connection string: menú lateral → **Connect** (o **Dashboard → Connection string**).
   - Elegí el modo **Pooled connection** (importante, dice algo como `-pooler` en el host).
   - Copiá la URL completa. Se ve así:
     ```
     postgresql://usuario:CLAVE@ep-xxxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
     ```
   - Guardala, la vas a pegar en Vercel como `DATABASE_URL`.

---

## Paso 2 · Crear el login de Google

1. Entrá a **https://console.cloud.google.com** con tu cuenta de Google.
2. Arriba, creá o elegí un proyecto (botón del selector de proyecto → **New Project** → nombre `boletero` → Create).
3. En el buscador de arriba escribí **"OAuth consent screen"** (Pantalla de consentimiento) y entrá.
   - Tipo de usuario: **External** → Create.
   - Completá lo mínimo: nombre de la app (`El Boletero`), tu email de soporte y tu email de contacto → Guardar y continuar hasta el final.
   - En **Audience / Test users**, agregá tu email (`britosignacio106@gmail.com`) como usuario de prueba. (Así funciona sin tener que "publicar" la app).
4. Ahora en el buscador escribí **"Credentials"** (Credenciales) → **+ Create credentials** → **OAuth client ID**.
   - Application type: **Web application**.
   - Name: `boletero-web`.
   - En **Authorized JavaScript origins**, agregá tu dominio de Vercel **sin barra al final**, por ejemplo:
     ```
     https://boletero-wine.vercel.app
     ```
     (Si probás en local, agregá también `http://localhost:3000`.)
   - **Authorized redirect URIs**: podés dejarlo vacío (usamos el botón de Google, no redirect).
   - **Create**.
5. Copiá el **Client ID** que te muestra (termina en `.apps.googleusercontent.com`). Lo vas a pegar en Vercel como `GOOGLE_CLIENT_ID`.

---

## Paso 3 · Poner las variables en Vercel

1. Entrá a **https://vercel.com**, abrí tu proyecto `boletero`.
2. **Settings → Environment Variables**.
3. Agregá estas **4 variables** (para Production, Preview y Development):

   | Nombre | Valor |
   |---|---|
   | `DATABASE_URL` | La connection string **pooled** de Neon (Paso 1.5) |
   | `GOOGLE_CLIENT_ID` | El Client ID de Google (Paso 2.5) |
   | `ALLOWED_EMAILS` | `britosignacio106@gmail.com` (solo estos mails pueden entrar; separá con comas si querés más) |
   | `SESSION_SECRET` | Una clave larga al azar (ver abajo) |

   Para generar el `SESSION_SECRET`, corré esto en una terminal y pegá el resultado:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   (o cualquier texto largo y aleatorio que inventes).

4. **Redeploy**: pestaña **Deployments** → último deploy → botón **⋯ → Redeploy**. Es clave hacerlo **después** de cargar las variables.

---

## Paso 4 · Probar

1. Abrí tu URL de Vercel.
2. Debería aparecer el botón **Sign in with Google**. Entrá con tu cuenta.
3. Si entra y ves el dashboard → ✅ listo, ya corre sobre Neon.
4. Creá una boleta de prueba para confirmar que guarda en la base.

---

## Si algo falla (troubleshooting)

- **Sale "Google sign-in isn't configured yet"** → falta `GOOGLE_CLIENT_ID` en Vercel o no hiciste Redeploy.
- **El botón de Google no aparece / error en consola** → revisá que el dominio de Vercel esté **exacto** en *Authorized JavaScript origins* (sin `/` final, con `https://`).
- **"This Google account is not authorized"** → tu email no está en `ALLOWED_EMAILS`. Agregalo y redeploy.
- **Entra pero no carga/guarda boletas (error 500)** → revisá `DATABASE_URL` (que sea la **pooled**) y que hayas corrido `schema.sql` en Neon. Los logs están en Vercel → Deployments → tu deploy → **Functions / Logs**.
- **"invalid token" al loguear** → el `GOOGLE_CLIENT_ID` de Vercel no coincide con el del origin autorizado. Que sea el mismo Client ID en ambos lados.

---

## Notas técnicas

- Es una app **de un solo usuario** (un perfil, tus boletas). El login de Google
  es solo la puerta; `ALLOWED_EMAILS` define quién puede pasar.
- La sesión es una cookie firmada (HMAC con `SESSION_SECRET`), `HttpOnly` y
  `Secure`, dura 30 días.
- El envío de email sigue por **EmailJS** (client-side, ya configurado). No
  necesita variables nuevas.
- Neon en el plan free se "duerme" si no la usás un rato; la primera consulta
  después de dormir tarda ~1 segundo en despertar. Es normal.
