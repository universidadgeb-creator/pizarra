# Pizarra 1% — GEB

App de React (Vite) con **Supabase** (Postgres) como base de datos
compartida, lista para publicarse en GitHub Pages.

Trae el histórico de 438 ideas ya cargado en `src/seedData.json`: la
primera vez que alguien abra el sitio con la tabla vacía, la app lo
sube automáticamente a Supabase.

## 1. Crear el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project** (la cuenta y el plan gratuito son suficientes).
2. Elige nombre, contraseña de base de datos (guárdala) y región.
3. Cuando el proyecto termine de crearse, ve a **SQL Editor → New query**, pega todo el contenido de `schema.sql` (en la raíz de este proyecto) y da **Run**. Esto crea la tabla `ideas1pct`, sus políticas de acceso y activa Realtime.
4. Ve a **Project Settings → API** y copia:
   - **Project URL**
   - **anon public key**

## 2. Configurar el proyecto

1. Abre `src/supabase.js` y pega ahí tu `Project URL` y tu `anon key`.
2. Instala Node.js 18+ si no lo tienes ([nodejs.org](https://nodejs.org)).
3. En una terminal, dentro de esta carpeta:
   ```bash
   npm install
   npm run dev
   ```
   Se abrirá en `http://localhost:5173` — pruébalo ahí antes de publicar. La primera vez que cargue, va a subir las 438 ideas históricas a tu tabla (tarda unos segundos).

⚠️ Con las políticas de `schema.sql`, cualquier persona que tenga la
URL del sitio puede leer y editar los datos — no hay usuarios ni
login. Está pensado para un equipo interno que comparte el link con
confianza, igual que antes. Si más adelante quieres pedir inicio de
sesión (por ejemplo con cuenta de Google), se puede agregar.

## 3. Subir el código a GitHub

```bash
git init
git add .
git commit -m "Pizarra 1% GEB"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

## 4. Ajustar el nombre del repo en Vite

Abre `vite.config.js` y cambia:

```js
base: "/pizarra1pct/",
```

por `"/TU-REPO/"` (con las diagonales), usando el nombre exacto del
repositorio que creaste. Si el repo se llama igual que tu usuario con
`.github.io` (ej. `tu-usuario.github.io`), usa `base: "/"` en su lugar.
Vuelve a hacer commit y push de ese cambio.

## 5. Activar GitHub Pages

En tu repo de GitHub: **Settings → Pages → Build and deployment → Source**,
elige **GitHub Actions** (ya viene el workflow en
`.github/workflows/deploy.yml`, que compila y publica solo en cada
push a `main`).

Después de tu próximo push, ve a la pestaña **Actions** del repo para
ver el progreso. Cuando termine, tu sitio queda en:

```
https://TU-USUARIO.github.io/TU-REPO/
```

### Alternativa sin GitHub Actions

Si prefieres publicar manualmente desde tu computadora en vez de que
se despliegue solo:

```bash
npm run deploy
```

(usa el paquete `gh-pages`, ya incluido). Esto compila y sube la
carpeta `dist` a la rama `gh-pages`; en ese caso, en Settings → Pages
elige la rama `gh-pages` en vez de "GitHub Actions".

## Estructura

- `src/App.jsx` — toda la app (formulario, pizarra general, panel colaborador).
- `src/supabase.js` — conexión a tu proyecto de Supabase.
- `src/seedData.json` — histórico de 438 ideas migradas del Excel (se sube solo una vez, a la tabla vacía).
- `schema.sql` — crea la tabla, sus políticas de acceso y activa Realtime.
