# Ciudades Trello Dashboard

Aplicacion full-stack para consultar un tablero Trello de ciudades y disenos.

## Funcionalidades

- Login por cookie/sesion con rutas protegidas.
- Dashboard por ciudad con acordeones anidados:
  - ciudad -> disenos -> atributos completos.
- Contadores:
  - total, caducados, proximos, sin caducidad, indefinidos.
  - contador por etiqueta de Trello (global y por ciudad).
- Buscador general y buscador especifico por disenador.
- Miniatura de portada por tarjeta en cada fila de diseno.
- Vista adicional de galeria (`/galeria`) con selector de ciudad y cuadricula 3x3 de portadas.
- Cache server-side con `revalidate` y boton de refresco manual.

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

`.env.local` minimo:

```env
TRELLO_KEY=...
# alternativa aceptada:
# TRELLO_API_KEY=...
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
  - `auto`: detecta lista/custom field/etiqueta.
  - `list`: fuerza `LISTA = ciudad`.
  - `customField`: fuerza uso de custom field (`CITY_FIELD_NAME`).
  - `label`: fuerza uso de etiquetas.

## Ejecucion local

```bash
npm install
npm run dev
```

En PowerShell con politicas restrictivas:

```powershell
npm.cmd install
npm.cmd run dev
```

App: `http://localhost:3000`

## Seguridad implementada

- Tokens Trello solo en servidor (`lib/trello.ts`).
- Cookie de sesion `httpOnly`, `sameSite=lax`, `secure` en produccion.
- Proxy de proteccion global en `proxy.ts` (excepto `/login` y assets publicos).
- Validacion estricta de ENV al arrancar (`lib/env.ts` con `zod`).

## Estructura principal

- `app/` rutas y handlers
- `components/` componentes UI
- `lib/auth.ts` autenticacion/sesion
- `lib/trello.ts` cliente Trello + normalizacion + cache
- `types/` modelos tipados
- `proxy.ts` proteccion de rutas

## Build de produccion

```bash
npm run lint
npm run build
npm run start
```

## Deploy en Vercel

### Opcion CLI

```bash
vercel
vercel --prod
```

Configurar variables en Vercel:

- `TRELLO_KEY` (o `TRELLO_API_KEY`)
- `TRELLO_TOKEN`
- `TRELLO_BOARD_ID`
- `AUTH_USER`
- `AUTH_PASS`
- `AUTH_SECRET`
- `CITY_MODE` (opcional)
- `CITY_FIELD_NAME` (opcional)
- `UPCOMING_DAYS` (opcional)
- `TRELLO_REVALIDATE_SECONDS` (opcional)

### Opcion Git + Vercel

1. Sube repo a GitHub.
2. Importa repo en Vercel.
3. Configura variables de entorno.
4. Deploy automatico en cada push a rama principal.

## Configuracion GitHub

Con GitHub CLI:

```bash
gh repo create <nombre-repo> --private --source=. --remote=origin --push
```

Sin GitHub CLI:

```bash
git remote add origin https://github.com/<usuario>/<repo>.git
git branch -M main
git push -u origin main
```
