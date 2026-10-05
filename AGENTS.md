# AGENTS.md

## Estructura

Dos proyectos npm **independientes**. No hay `package.json` en la raíz, ni
workspaces, ni runner raíz. Cada comando se corre desde dentro de `backend/` o
`frontend/`; ambos tienen su propio lockfile.

```
backend/    Express 5 + TypeScript (CommonJS) → API SnailPay simulada
frontend/   Vite + React 19 + TypeScript (ESM) → SPA con billetera y gráficas
README.md   Documenta a fondo el contrato de SnailPay (léelo antes de tocar el backend)
```

El backend **no importa nada del frontend ni al revés**. Los tipos de SnailPay
están duplicados a propósito en `backend/src/snailpay/snailpay.types.ts` y
`frontend/src/features/wallet/wallet.types.ts`. **No los unifiques** en un
paquete compartido: el cliente valida la forma de la respuesta en runtime
precisamente porque no depende del servidor en tiempo de compilación.

## Comandos

Todos verificados. No hay script en la raíz.

| | `backend/` | `frontend/` |
| --- | --- | --- |
| Instalar | `npm install` | `npm install` |
| Dev | `npm run dev` (tsx watch, :3001) | `npm run dev` (Vite, :5173) |
| Build / typecheck | `npm run build` (tsc) | `npm run build` (`tsc -b && vite build`) |
| Tests | `npm test` — 4 archivos, 84 tests | `npm test` — 8 archivos, 138 tests |
| Lint | *(no existe)* | `npm run lint` (ESLint) |
| Formato | *(prettier instalado, sin script)* | `npm run format` / `npm run format:check` |

Corridas focalizadas (ambos usan Vitest):

```bash
npx vitest run src/snailpay/snailpay.api.test.ts   # backend
npx vitest run src/features/wallet                 # frontend, por carpeta
```

**Orden de verificación en frontend:** `npm run lint` → `npm run build` → `npm test`.
El backend no tiene lint; `npm run build` es su único typecheck
(`npx tsc --noEmit` funciona igual y no escribe `dist/`).

No hay CI, husky, lint-staged ni editorconfig. Nada corre solo: ejecuta los
comandos tú mismo antes de dar por buena una modificación.

## Puertos y proxy

- Backend: `PORT` o 3001 (`backend/src/server.ts:4`).
- CORS está **fijado a `http://localhost:5173`** (`backend/src/app.ts:12`). El
  dev del frontend tiene que ir en el puerto default de Vite.
- `vite.config.ts:6` proxea `/api/*` → `localhost:3001` **quitando** el prefijo
  `/api`. Por eso el cliente llama `POST /api/snailpay/payments` y la ruta real
  del backend es `POST /snailpay/payments`. Si tocas un lado, ajusta el otro
  teniendo presente el rewrite; no hagas coincidir las cadenas literalmente.

## SnailPay: lo que no debes romper

Contrato documentado en `README.md`. Puntos de fricción reales:

- **Solo dos endpoints**: `POST /snailpay/payments` y `GET /health`.
- **Tarjeta de éxito**: `1234123412341234` + `12/26` + `543`. Cualquier otra
  combinación válida → 402 `card_declined`.
- **`SNAILPAY_DOWN=true` → 503**, y se evalúa **antes** de validar. Datos
  inválidos + sistema caído dan 503, no 400. La variable se lee en cada petición.
- **El contrato de 11 campos de la respuesta está impuesto por tests.**
  `snailpay.fixtures.ts` exporta `expectContract` y `expectContractWithErrors`,
  que comparan `Object.keys()` contra la lista exacta. Agregar o quitar un campo
  en `PaymentResponse` rompe esas pruebas a propósito.
- `validatePayment` devuelve una **unión discriminada** (`valid: true` →
  `PaymentRequest`, `valid: false` → `errors`). Nunca pases `req.body` a
  `processPayment`: ese narrowing es el motivo de existir de la capa.
- `errorHandler` debe quedar **después** de las rutas en `app.ts` (Express 5).
- `app.ts` exporta `app`; `server.ts` hace `listen`. Los tests importan `app`
  con supertest y nunca abren un puerto. No los unas.
- El frontend revalida los 11 campos en runtime y **contrasta
  `transaction_amount`, `payer_id` y `payer_email` contra lo enviado** antes de
  acreditar. Si tocas el formato de la respuesta, revisa `isPaymentResponse` y
  `matchesRequest` en `snailpayClient.ts`.

## Frontend: convenciones que difieren de los defaults

- **La UI nunca ve códigos HTTP.** `snailpayClient.ts` devuelve la unión
  `PaymentResult` (`approved` / `rejected` / `unavailable` / `timeout` /
  `invalid-response` / `network-error`) y no lanza excepciones. Los formularios
  leen `result.kind`, nunca `response.status`.
- **Solo `kind === "approved"` muta la billetera.** `wallet.store.ts` usa un
  guard síncrono con `get()` para el doble envío (devuelve `in-progress`),
  redondea el dinero a 2 decimales (`addMoney`) y quita espacios/guiones del
  número de tarjeta antes de enviar (`normalizeCardNumber`).
- **La validación del cliente es solo UX.** La autoridad es el backend;
  `topUpForm.validation.ts` debe mantenerse alineada con `snailpay.validation.ts`.
  `mapServerErrors` traduce nombres del servidor (`card_number`) a nombres del
  formulario (`cardNumber`) mediante un `Map` deliberadamente.
- **Auth solo en cliente, una cuenta por navegador.** `authStore` guarda un
  único `user`. Contraseñas con PBKDF2/SHA-256, 600 000 iteraciones, vía Web
  Crypto (`password.ts`).
- **`wallet-storage` no está atada al usuario** y sobrevive al logout. Es una
  limitación conocida y documentada en el propio store; no la "arregles" sin que
  te lo pidan.
- **`hasHydrated` + `onRehydrateStorage` gobiernan las rutas.** Con
  `persist` síncrono el store hidrata al crearse, así que `ProtectedRoute` y
  `PublicRoute` muestran `LoadingScreen` hasta entonces. **Los tests deben poner
  `hasHydrated: true` explícito** o renderizan la pantalla de carga y falla el
  `getByRole`.
- `tsconfig.app.json` tiene `verbatimModuleSyntax`, `erasableSyntaxOnly`,
  `noUnusedLocals` y `noUnusedParameters`: usa `import type` para tipos-only y
  no dejes variables sin usar.

## Tests

Vitest en ambos paquetes. Los tests van junto al código como `*.test.ts`.

- El **backend no tiene `globals: true`**: sus tests importan
  `describe/it/expect` de `vitest` explícitamente. El frontend sí tiene globals
  pero los importa igual; mantén esa convención.
- `snailpay.fixtures.ts` es un **helper compartido, no una suite**. El
  `tsconfig.json` del backend excluye `*.test.ts` y `*.fixtures.ts` del build.
- **`password.test.ts` usa `// @vitest-environment node`** y `auth.store.test.ts`
  mockea `./password`, ambos porque PBKDF2 a 600k iteraciones es lentísimo en
  jsdom. No los quites "porque parecen redundantes".
- `snailpayClient.test.ts` stubea `global.fetch` con `vi.stubGlobal` y lo
  restaura en `afterEach`. El cliente solo lee `status` y `json()` de la respuesta.
- `snailpay.api.test.ts` borra `process.env.SNAILPAY_DOWN` en `afterEach`:
  es variable global del proceso y sin restaurarla las demás pruebas fallan en
  cadena.
- `App.test.tsx` renderiza con `MemoryRouter` y `localStorage.clear()` en
  `beforeEach`.

## Formato

- `frontend/.prettierrc` fija `printWidth: 80`, comillas dobles y
  `trailingComma: "all"`. `npm run format:check` pasa limpio.
- **El backend tiene prettier como devDep pero ninguna config ni script.** Sus 11
  archivos están fuera de los defaults de prettier. Si agregas un `.prettierrc`
  ahí, `npm run format` va a reformatear los 11: sepáralo en un commit
  cosmético.
- Antes de reformatear, `git status` debe estar limpio. `npm run format` toca
  todo `src/` y no avisa qué va a cambiar.

## Idioma y estilo

- Comentarios, textos de interfaz y mensajes de commit en **español**;
  identificadores en inglés.
- Los commits usan prefijos de conventional commits en español:
  `feat(auth):`, `chore:`, `refactor(auth):`.
- `index.html` sigue con los valores default de Vite (`lang="en"`,
  `<title>frontend</title>`) aunque la app es en español. Si lo arreglas, es un
  cambio aparte.