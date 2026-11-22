# AgendaCR: guía del proyecto para trabajar con IA en VS Code

> **Cómo usar este archivo:** colócalo en la raíz del repositorio con el nombre `AGENTS.md`. Muchos asistentes de IA para código lo leen como contexto del proyecto. Si tu herramienta usa otro nombre, haz una copia: `CLAUDE.md` (Claude Code) o `.github/copilot-instructions.md` (GitHub Copilot). Al iniciar una sesión nueva, dile a la IA: *"Lee AGENTS.md antes de empezar"*.

---

## 1. Qué es este proyecto

**AgendaCR** es una plataforma web de reservas para negocios de servicios en Costa Rica (barberías, clínicas, salones, canchas deportivas). Los clientes eligen servicio, profesional y horario disponible; el negocio administra su agenda, su equipo y sus métricas desde un panel.

**Objetivo del proyecto:** es un proyecto de portafolio de un desarrollador Full Stack Junior. Debe verse profesional, estar desplegado en vivo y demostrar decisiones técnicas sólidas (TypeScript estricto, concurrencia, pruebas, seguridad, CI).

**Prioridades, en orden:**
1. Que funcione correctamente (sin dobles reservas).
2. Que el código sea claro y fácil de explicar en una entrevista.
3. Que se vea pulido y funcione bien en celular.
4. Que esté probado y documentado.

---

## 2. Reglas para la IA (leer primero)

El desarrollador es junior y quiere **aprender**, no solo recibir código. Por eso:

- **Trabaja por pasos pequeños.** Una funcionalidad a la vez. No generes medio proyecto de golpe.
- **Explica brevemente el porqué** de cada decisión importante, en español y con lenguaje sencillo.
- **No agregues dependencias nuevas sin preguntar**, explicando para qué sirven y qué alternativas hay.
- **TypeScript estricto.** Prohibido `any`; si es inevitable, justifícalo en un comentario.
- **Valida toda entrada con Zod**, tanto en el cliente como en el servidor. Nunca confíes en datos del navegador.
- **Verifica autorización en cada Server Action y consulta:** quién es el usuario, qué rol tiene y si pertenece al negocio. Un cliente jamás debe ver ni modificar datos de otro.
- **Nunca pongas secretos en el código ni en el repositorio.** Usa variables de entorno y mantén `.env.example` actualizado.
- **No toques el modelo de datos ni las migraciones sin avisar.** Muestra primero el cambio propuesto.
- **Escribe pruebas** para la lógica crítica (disponibilidad y prevención de dobles reservas).
- **Verifica en la documentación oficial** cualquier API de Next.js, Drizzle o Better Auth si no estás seguro. Estas librerías cambian rápido; no asumas sintaxis de versiones antiguas.
- **Si algo es ambiguo, pregunta** antes de implementar.
- **Mensajes de commit** en formato convencional: `feat: ...`, `fix: ...`, `test: ...`, `docs: ...`, `refactor: ...`.

---

## 3. Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | **Next.js 16** (App Router) + **React 19.2** | Server Components por defecto; Server Actions para mutaciones. |
| Lenguaje | **TypeScript** (modo estricto) | |
| Estilos | **Tailwind CSS v4** + **shadcn/ui** | |
| Base de datos | **PostgreSQL** en **Neon** (o Supabase) | |
| ORM | **Drizzle ORM** + **drizzle-kit** | Migraciones en SQL. |
| Validación | **Zod** | Esquemas compartidos entre formularios y servidor. |
| Autenticación | **Better Auth** (o Auth.js) | Sesiones en cookies httpOnly. |
| Formularios | **React Hook Form** + Zod | |
| Calendario | **FullCalendar** | Panel administrativo. |
| Fechas | **date-fns** + **date-fns-tz** | |
| Correos | **Resend** + **React Email** | |
| Tareas programadas | **Vercel Cron** | Recordatorios. |
| IA (fase final) | **Vercel AI SDK** + API de un modelo de lenguaje | Asistente de reservas. |
| Pruebas | **Vitest** (unitarias) + **Playwright** (extremo a extremo) | |
| Calidad | ESLint, Prettier, Husky, lint-staged | |
| CI/CD | **GitHub Actions** + **Vercel** | |

**Notas de Next.js 16 que la IA debe respetar:**
- Requiere **Node.js 20.9 o superior**.
- **Turbopack** es el bundler por defecto.
- El archivo `middleware.ts` pasó a llamarse **`proxy.ts`**.
- Los `params` y `searchParams` en páginas son **asíncronos** (hay que usar `await`).
- Prefiere **Server Components**; usa `"use client"` solo cuando haga falta interactividad.

---

## 4. Entorno de desarrollo

**Herramientas instaladas:** VS Code, Node.js (≥ 20.9), Git y una cuenta de GitHub. La base de datos vive en la nube (Neon), así que no se requiere Docker para empezar.

**Extensiones recomendadas de VS Code:** ESLint, Prettier, Tailwind CSS IntelliSense, Vitest, Playwright Test for VS Code, PostgreSQL (o SQLTools), GitHub Pull Requests, Error Lens.

### Crear el proyecto

```bash
npx create-next-app@latest agendacr --typescript --tailwind --eslint --app --src-dir --turbopack
cd agendacr
npx shadcn@latest init
npm install drizzle-orm @neondatabase/serverless zod react-hook-form date-fns date-fns-tz
npm install -D drizzle-kit vitest @playwright/test prettier
```

> Antes de ejecutar estos comandos, la IA debe confirmar en la documentación oficial que siguen vigentes, porque los asistentes y opciones cambian.

### Variables de entorno (`.env.local`, nunca se sube a Git)

```
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
RESEND_API_KEY=
RESEND_FROM_EMAIL=
CRON_SECRET=
APP_TIMEZONE=America/Costa_Rica
# Fase final (IA)
AI_API_KEY=
```

Mantén un archivo **`.env.example`** con los mismos nombres y sin valores.

### Scripts esperados en `package.json`

```
dev          → next dev
build        → next build
lint         → eslint .
typecheck    → tsc --noEmit
test         → vitest run
test:e2e     → playwright test
db:generate  → drizzle-kit generate
db:migrate   → drizzle-kit migrate
db:studio    → drizzle-kit studio
```

---

## 5. Estructura de carpetas

```
agendacr/
├─ AGENTS.md
├─ .env.example
├─ drizzle/                    # migraciones SQL generadas
├─ src/
│  ├─ app/
│  │  ├─ (auth)/               # login, registro
│  │  ├─ (public)/[slug]/      # perfil público y reserva del negocio
│  │  ├─ (dashboard)/dashboard/# panel del negocio y del cliente
│  │  └─ api/                  # route handlers (webhooks, cron)
│  ├─ components/ui/           # componentes de shadcn/ui
│  ├─ features/
│  │  ├─ appointments/         # actions.ts, queries.ts, schemas.ts, components/
│  │  ├─ availability/         # lógica de espacios disponibles
│  │  ├─ services/
│  │  ├─ staff/
│  │  └─ businesses/
│  ├─ db/
│  │  ├─ schema.ts
│  │  └─ index.ts
│  ├─ lib/                     # auth.ts, dates.ts, email.ts, env.ts, utils.ts
│  └─ proxy.ts                 # protección de rutas (antes middleware)
└─ tests/
   ├─ unit/
   └─ e2e/
```

**Convención:** el código se organiza **por funcionalidad** (`features/`), no por tipo de archivo. Cada funcionalidad contiene sus acciones, consultas, esquemas Zod y componentes.

---

## 6. Roles y permisos

| Rol | Puede |
|---|---|
| **client** | Ver negocios públicos, reservar, ver y cancelar **solo sus** citas. |
| **staff** | Ver y gestionar **su propia** agenda dentro de su negocio. |
| **owner** | Administrar su negocio: servicios, empleados, horarios, citas y métricas. |

Toda consulta que toque datos de un negocio debe filtrar por `business_id` y comprobar que el usuario pertenece a él.

---

## 7. Modelo de datos (borrador inicial)

| Tabla | Campos principales |
|---|---|
| `users` | id, name, email, role, created_at |
| `businesses` | id, owner_id, name, slug (único), timezone, phone, whatsapp, created_at |
| `services` | id, business_id, name, duration_minutes, price_crc, active |
| `staff` | id, business_id, user_id, display_name, active |
| `staff_services` | staff_id, service_id |
| `working_hours` | id, staff_id, weekday (0-6), start_time, end_time |
| `time_off` | id, staff_id, starts_at, ends_at, reason |
| `appointments` | id, business_id, staff_id, service_id, client_id, starts_at, ends_at, status, notes, created_at |

**Estados de una cita:** `pending`, `confirmed`, `cancelled`, `completed`, `no_show`.

**Fase posterior:** tabla `payments` (registro de pagos por SINPE Móvil).

### Restricción anti-doble-reserva (pieza central)

La garantía de que no hay dos citas solapadas para el mismo empleado la da **PostgreSQL**, no el código de la aplicación:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments
ADD CONSTRAINT no_overlapping_appointments
EXCLUDE USING gist (
  staff_id WITH =,
  tstzrange(starts_at, ends_at) WITH &&
) WHERE (status <> 'cancelled');
```

Se agrega con una **migración SQL personalizada** (`drizzle-kit generate --custom`), porque el esquema de Drizzle no la expresa directamente. La aplicación debe capturar el error de violación de la restricción y responder: *"Ese horario ya fue tomado, elige otro"*.

---

## 8. Reglas de negocio

- **Fechas:** todo se guarda en **UTC**; se muestra en la zona horaria del negocio (por defecto `America/Costa_Rica`, UTC-6 sin horario de verano). Nunca guardes horas locales "a mano".
- **Disponibilidad:** un espacio está libre si cae dentro del horario laboral del empleado, no choca con citas activas, no cae en un `time_off` y respeta la duración del servicio.
- **Granularidad de espacios:** cada 15 minutos (configurable).
- **Anticipación mínima:** no se puede reservar con menos de 1 hora de antelación (configurable).
- **Cancelación:** el cliente puede cancelar hasta 2 horas antes (configurable).
- **Un empleado solo ofrece los servicios** asociados en `staff_services`.
- **Moneda:** colones costarricenses (CRC); mostrar con formato local.

---

## 9. Hoja de ruta (marcar al avanzar)

### Fase 0: preparación
- [x] Crear repositorio y proyecto Next.js
- [x] Configurar ESLint, Prettier, Husky y TypeScript estricto
- [x] Conectar Neon y Drizzle (migraciones iniciales y de agenda aplicadas en Neon)
- [x] Workflow de GitHub Actions (lint, typecheck, test y build)
- [ ] Primer despliegue en Vercel

### Fase 1: MVP
- [x] Autenticación y roles (propietario, profesional y cliente)
- [x] CRUD de servicios
- [x] Configuración de horarios de atención
- [x] Reservar, ver y cancelar citas

### Fase 2: producto competitivo
- [x] Motor de disponibilidad + restricción anti-solapamiento (migración lista; falta verificar en Neon)
- [x] Pruebas unitarias del motor de disponibilidad
- [x] Prueba de concurrencia real contra PostgreSQL/Neon
- [x] Varios empleados con agenda propia
- [x] Calendario administrativo (FullCalendar)
- [x] Días libres y vacaciones
- [x] Correos de solicitud, confirmación, cancelación y recordatorios (requieren configurar Resend y `CRON_SECRET`)
- [x] Invitaciones del equipo por correo con Resend y enlace de respaldo

### Fase 3: diferenciación
- [x] Perfiles públicos por negocio (`/[slug]`) con SEO básico
- [x] Dashboard de métricas
- [x] Enlace de WhatsApp
- [x] Registro manual de pagos SINPE Móvil (reportes y revisión; no procesa transferencias)
- [x] PWA instalable (manifiesto, iconos y página sin conexión)
- [ ] Asistente de reservas con IA
- [x] README final con capturas, diagrama y "decisiones técnicas"

---

## 10. Asistente con IA (fase final)

- El asistente **solo puede**: consultar servicios, consultar disponibilidad y proponer horarios.
- **La reserva siempre la confirma la persona** con un botón explícito; pasa por las mismas validaciones y la misma restricción de base de datos que cualquier otra reserva.
- Implementar **límite de peticiones** por usuario y un tope de gasto.
- Nunca enviar al modelo datos personales innecesarios de otros usuarios.
- Manejar errores y tiempos de espera con gracia: si la IA falla, el flujo normal de reserva sigue funcionando.

---

## 11. Calidad y seguridad (checklist)

- [x] Contraseñas con hash seguro; sesiones en cookies httpOnly (Better Auth)
- [x] Validación con Zod en las entradas de la aplicación
- [x] Autorización comprobada en cada acción revisada
- [x] Límite de peticiones en autenticación, disponibilidad, reservas e invitaciones
- [x] Sin secretos en el repositorio
- [x] Pruebas de la lógica de disponibilidad
- [x] Prueba de concurrencia: dos reservas simultáneas del mismo horario, solo una gana
- [x] Prueba end-to-end del flujo completo de reserva (Playwright)
- [ ] Accesibilidad básica (teclado, contraste, etiquetas)
- [ ] Diseño responsive revisado en móvil

---

## 12. Prompts útiles para trabajar con la IA

**Para empezar una sesión**
> Lee AGENTS.md. Estamos en la Fase 0. Guíame paso a paso para crear el proyecto y configurar ESLint, Prettier y TypeScript estricto. Explica cada paso brevemente.

**Para una funcionalidad nueva**
> Quiero implementar el CRUD de servicios (Fase 1). Antes de escribir código, propón el plan: archivos que vas a crear, esquema Zod, Server Actions y cómo verificarás la autorización. Espera mi confirmación.

**Para el modelo de datos**
> Diseña el esquema de Drizzle para las tablas de la sección 7 y muéstramelo antes de generar la migración. Luego prepara la migración personalizada con la restricción de exclusión.

**Para la lógica crítica**
> Escribe la función que calcula los espacios disponibles de un empleado en una fecha, con pruebas de Vitest para: horario laboral, citas existentes, días libres, duración del servicio y zona horaria.

**Para entender código**
> Explícame este archivo línea por línea como si fuera una entrevista técnica: qué hace, por qué se hizo así y qué preguntas podrían hacerme sobre él.

**Para revisión**
> Revisa los cambios de esta rama. Busca fallos de autorización, validaciones faltantes, errores con zonas horarias y casos sin probar.

---

## 13. Definición de "terminado" para una funcionalidad

Una funcionalidad está terminada cuando:
1. Funciona en el navegador, incluyendo móvil.
2. Valida entradas y comprueba permisos.
3. Maneja estados de carga y error.
4. Tiene pruebas si toca lógica crítica.
5. Pasa lint, typecheck y tests en CI.
6. Está documentada si introdujo una decisión técnica importante.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
