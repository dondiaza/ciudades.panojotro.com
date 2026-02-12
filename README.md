# Ciudades Trello Dashboard

Aplicación web full-stack para consultar un tablero Trello llamado "Ciudades", con:

- Resumen por ciudad: total diseños, caducados, próximos a caducar, sin caducidad.
- Acordeones anidados: ciudad -> diseño -> atributos completos.
- Login simple por cookie/sesión con middleware de protección.
- Caché server-side con `revalidate` y botón de refresco manual.

## Stack

- Next.js App Router
- TypeScript estricto
- Tailwind CSS
- Trello REST API

## Requisitos

- Node.js 20+ (probado con Node 24)
- npm

## Variables de entorno

1. Copia `.env.example` a `.env.local`.
2. Completa los valores reales.

```bash
cp .env.example .env.local
```

`.env.local` mínimo:

```env
TRELLO_KEY=...
TRELLO_TOKEN=...
TRELLO_BOARD_ID=...

AUTH_USER=ciudades
AUTH_PASS=ciudades
AUTH_SECRET=una_clave_muy_larga_y_aleatoria_de_al_menos_32_caracteres

CITY_MODE=auto
CITY_FIELD_NAME=Ciudad
UPCOMING_DAYS=7
TRELLO_REVALIDATE_SECONDS=60
```

Notas:

- `CITY_MODE`:
- `auto`: intenta detectar si la ciudad se modela por lista/custom field/etiqueta.
- `list`: fuerza `LISTA = ciudad`.
- `customField`: fuerza uso de un Custom Field (nombre en `CITY_FIELD_NAME`).
- `label`: fuerza uso de etiquetas como ciudad.
- Credenciales por defecto recomendadas:
- Usuario: `ciudades`
- Clave: `ciudades`

## Ejecución local

```bash
npm install
npm run dev
```

En PowerShell con políticas restrictivas puede ser necesario usar:

```powershell
npm.cmd install
npm.cmd run dev
```

Abrir en `http://localhost:3000`.

## Seguridad implementada

- Tokens Trello consumidos solo en servidor (`lib/trello.ts`).
- Login por cookie `httpOnly`, `sameSite=lax`, `secure` en producción.
- Middleware protege todas las rutas salvo `/login` y assets públicos.
- Validación estricta de ENV al arrancar (`lib/env.ts` con `zod`).

## Estructura principal

- `app/` rutas (UI + API handlers)
- `components/` componentes UI
- `lib/auth.ts` autenticación/sesión
- `lib/trello.ts` cliente Trello + normalización + caché
- `types/` modelos tipados
- `middleware.ts` protección global de rutas

## Build de producción

```bash
npm run lint
npm run build
npm run start
```

## Deploy en Vercel

### Opción CLI

```bash
vercel
vercel --prod
```

Luego configurar ENV en Vercel Project Settings:

- `TRELLO_KEY`
- `TRELLO_TOKEN`
- `TRELLO_BOARD_ID`
- `AUTH_USER`
- `AUTH_PASS`
- `AUTH_SECRET`
- `CITY_MODE` (opcional)
- `CITY_FIELD_NAME` (opcional)
- `UPCOMING_DAYS` (opcional)
- `TRELLO_REVALIDATE_SECONDS` (opcional)

### Opción Git + Vercel (recomendada)

1. Sube repo a GitHub.
2. Importa repo en Vercel.
3. Configura variables de entorno.
4. Deploy automático en cada push a rama principal.

## Configuración GitHub

Si tienes GitHub CLI:

```bash
gh repo create <nombre-repo> --private --source=. --remote=origin --push
```

Sin GitHub CLI:

1. Crea repo vacío en GitHub web.
2. Ejecuta:

```bash
git remote add origin https://github.com/<usuario>/<repo>.git
git branch -M main
git push -u origin main
```
