# Frontend

SPA de React 19 + TypeScript que se comunica con la API de SnailPay del backend.

> La documentación del proyecto (estructura, instalación, ejecución de ambos paquetes,
> pruebas y contrato de SnailPay) está en el
> [README de la raíz](../README.md). Este archivo solo describe el paquete `frontend/`.

## Scripts

| Comando                | Qué hace                                   |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Servidor de desarrollo de Vite (puerto 5173) |
| `npm run build`        | Typecheck (`tsc -b`) y build de producción  |
| `npm run preview`      | Sirve el build de producción               |
| `npm run lint`         | ESLint                                     |
| `npm test`             | Corre las pruebas con Vitest (138 pruebas) |
| `npm run format`       | Reformatea `src/` con Prettier             |
| `npm run format:check` | Verifica el formato sin escribir           |

Orden de verificación recomendado: `npm run lint`, `npm run build`, `npm test`.

## Proxy hacia el backend

El cliente llama a `POST /api/snailpay/payments`. Vite lo reenvía a
`http://localhost:3001` quitando el prefijo `/api`, así que la ruta que atiende el
backend es `POST /snailpay/payments`. El CORS del backend está fijado a
`http://localhost:5173`, por lo que el frontend debe usar el puerto por defecto de Vite.

Para levantar la aplicación hay que tener el backend corriendo en otra terminal
(`cd backend && npm run dev`).

## Estructura de `src/`

```text
src/
  App.tsx                 Rutas: /login, /register, /dashboard y redirecciones
  shared/
    ProtectedRoute.tsx    Solo con sesión; espera la hidratación del store
    PublicRoute.tsx       Redirige al dashboard si ya hay sesión
    LoadingScreen.tsx
  features/
    auth/                 Formularios, store, validación y hash de contraseñas
    dashboard/            Dashboard con saldo, recarga y gráficas
    graficas/             Gráficas en SVG/CSS y datos simulados de carreras
    wallet/               Cliente de SnailPay, store de saldo y formulario
```

## Pruebas

| Archivo                          | Qué cubre                                                   |
| -------------------------------- | ----------------------------------------------------------- |
| `auth.validation.test.ts`         | Reglas del formulario de registro                           |
| `password.test.ts`               | PBKDF2, salt, verificación y comparación en tiempo constante |
| `auth.store.test.ts`             | Registro, login, logout, persistencia y doble envío         |
| `App.test.tsx`                   | Rutas protegidas y públicas                                 |
| `topUpForm.validation.test.ts`   | Validación del formulario de recarga y traducción de errores |
| `snailpayClient.test.ts`         | Contrato, códigos HTTP, timeout y error de red              |
| `wallet.store.test.ts`           | Saldo, persistencia y bloqueo de doble envío                |
| `raceData.test.ts`               | Coherencia de los datos simulados de las gráficas           |

`password.test.ts` corre en entorno Node y `auth.store.test.ts` simula el módulo de
contraseñas porque PBKDF2 a 600 000 iteraciones es demasiado lento en jsdom.

Para correr una parte concreta:

```bash
npx vitest run src/features/wallet
```

## Convenciones

- Comentarios, textos de interfaz y mensajes de commit en **español**; identificadores
  en inglés.
- La UI nunca ve códigos HTTP: `snailpayClient.ts` devuelve un resultado discriminado
  con seis casos y los formularios leen `result.kind`.
- Solo un resultado `approved` modifica el saldo. El store usa una guarda síncrona para
  evitar el doble envío, redondea el dinero a dos decimales y quita espacios y guiones
  del número de tarjeta antes de enviarlo.
- `import type` para imports de solo tipos, y ninguna variable o parámetro sin usar.
- Antes de reformatear, revisa `git status`: `npm run format` toca todo `src/`.

Las convenciones completas del repositorio están en
[AGENTS.md](../AGENTS.md).