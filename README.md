# Giselle-2401
Aplicación full-stack con React, Express y TypeScript: autenticación, dashboard con gráficas y pasarela de pago simulada.
npm init -y

2. Instala las dependencias:

bash
npm install express cors
npm install -D typescript tsx @types/node @types/express @types/cors
npm i -D vitest supertest @types/supertest

cd frontend
npm create vite@latest . -- --template react-ts
npm i
npm i zustand
npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom

npm i --save-dev @types/jest
npm install --save-dev --save-exact prettier

# SnailPay: backend de pagos simulado

API en Express 5 y TypeScript que simula una pasarela de pagos. Expone un solo endpoint:

```text
POST /snailpay/payments
Content-Type: application/json
```

## Scripts

| Comando         | Qué hace                                             |
| --------------- | ---------------------------------------------------- |
| `npm run dev`   | Arranca el servidor en modo desarrollo (`tsx watch`) |
| `npm run build` | Compila `src/` a `dist/`                             |
| `npm start`     | Ejecuta el build (`node dist/server.js`)             |
| `npm test`      | Corre las pruebas con Vitest                         |

## Petición

| Campo             | Tipo   | Regla                                                       |
| ----------------- | ------ | ----------------------------------------------------------- |
| `card_number`     | texto  | Exactamente 16 dígitos, sin espacios ni guiones             |
| `expiration_date` | texto  | Formato `MM/YY` (solo se valida el formato, no la vigencia) |
| `cvv`             | texto  | Exactamente 3 dígitos                                       |
| `cardholder_name` | texto  | Obligatorio, no vacío                                       |
| `amount`          | número | Mayor que 0, máximo 2 decimales, hasta 1,000,000            |
| `payer_id`        | texto  | Obligatorio, no vacío                                       |
| `payer_email`     | texto  | Debe tener formato de correo válido                         |

**Datos de éxito:** la tarjeta `1234123412341234`, vencimiento `12/26` y CVV `543`. Cualquier otra combinación que pase la validación es rechazada.

## Respuesta

Las respuestas correspondientes a pagos aprobados, rechazados, datos inválidos y servicio no disponible mantienen el mismo contrato principal de 11 campos:

`id`, `status`, `status_detail`, `transaction_amount`, `date_created`, `authorization_code`, `reference`, `payer_id`, `payer_email`, `card_number`, `cvv`

Las respuestas `400` por datos inválidos agregan además un campo `errors` con el mensaje correspondiente a cada campo que falló.

> **Nota:** el contrato de este ejercicio exige devolver `card_number` y `cvv`. En un sistema real nunca se devolverían de esta forma.

### Formato de los campos generados

| Campo                | Formato                                                      | Ejemplo                                     |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| `id`                 | UUID                                                         | `e3f19f8e-c2fe-4014-b515-f9a25347e57e`      |
| `reference`          | `SP-` + UUID                                                 | `SP-d0be42f6-9ff8-43eb-bb7c-4715c30813c8`   |
| `authorization_code` | `AUTH-` + UUID en pagos aprobados; `null` en los demás casos | `AUTH-b481640d-2a75-4e97-9dd6-a01616b95a45` |
| `date_created`       | Fecha ISO 8601                                               | `2026-10-04T21:01:52.007Z`                  |

Los valores generados son dinámicos y cambian en cada petición.

## Tabla de casos

| Caso                         | Cuándo ocurre                                   | HTTP | `status`   | `status_detail`                | `authorization_code` |
| ---------------------------- | ----------------------------------------------- | ---: | ---------- | ------------------------------ | -------------------- |
| Aprobado                     | Datos de éxito                                  |  200 | `approved` | `accredited`                   | `AUTH-...`           |
| Rechazado                    | Datos válidos que no son los de éxito           |  402 | `rejected` | `card_declined`                | `null`               |
| Datos inválidos              | Falla la validación de uno o más campos         |  400 | `rejected` | `invalid_data: campo1, campo2` | `null`               |
| Cuerpo no válido como objeto | El cuerpo es un arreglo, texto, número o `null` |  400 | `rejected` | `invalid_data`                 | `null`               |
| Sin cuerpo                   | POST sin datos                                  |  400 | `rejected` | `invalid_data`                 | `null`               |
| Sistema caído                | `SNAILPAY_DOWN=true`                            |  503 | `error`    | `service_unavailable`          | `null`               |
| JSON mal formado             | El texto enviado no es JSON válido              |  400 | —          | —                              | —                    |

El JSON mal formado es una excepción al contrato porque no existe un cuerpo utilizable para construir una respuesta de pago. En este caso se responde:

```json
{
  "error": "El cuerpo de la petición contiene JSON inválido."
}
```

## Orden de evaluación

El controlador procesa cada petición en el siguiente orden:

1. **Sistema caído:** si `SNAILPAY_DOWN=true`, responde `503` sin validar los datos.
2. **Validación:** se comprueba el cuerpo recibido.
3. **Construcción del `PaymentRequest`:** cuando la validación es correcta, se obtiene un objeto tipado como `PaymentRequest`.
4. **Procesamiento:** el servicio determina si el pago es aprobado o rechazado.
5. **Respuesta:** se devuelve `200` para pagos aprobados o `402` para pagos rechazados.

Por lo tanto, cuando el sistema está marcado como caído, incluso una petición con datos inválidos recibe `503`.

### Tipado después de la validación

La función `validatePayment` utiliza un resultado discriminado:

```text
valid: true  → payment: PaymentRequest
valid: false → errors: ValidationErrors
```

Esto permite que el controlador pase a `processPayment` únicamente un `PaymentRequest` que ya fue validado, en lugar de pasar directamente `req.body`, cuyo tipo puede ser `any`.

Durante esta etapa también se normalizan campos de texto mediante `trim()`.

## Manejo de errores

Se utiliza un middleware global `errorHandler` después de las rutas.

El middleware:

* Devuelve `400` para JSON mal formado.
* Conserva otros errores `4xx` generados por Express o el parser del cuerpo.
* Devuelve `500` para errores internos no controlados.
* No expone detalles internos del servidor al cliente.

Los errores de validación normales se manejan directamente desde el controlador y utilizan el contrato de respuesta de SnailPay.

## Activar el error del sistema

La variable `SNAILPAY_DOWN` se consulta en cada petición.

### PowerShell

```powershell
$env:SNAILPAY_DOWN="true"; npm run dev
```

### cmd

```cmd
set SNAILPAY_DOWN=true && npm run dev
```

### bash

```bash
SNAILPAY_DOWN=true npm run dev
```

Para volver a la normalidad, cierra esa terminal o, en PowerShell:

```powershell
Remove-Item Env:SNAILPAY_DOWN
```

Después vuelve a iniciar el servidor.

## Prueba manual con curl en Windows

Se recomienda guardar el cuerpo JSON en un archivo para evitar problemas de comillas:

```powershell
curl.exe -i -X POST http://localhost:3001/snailpay/payments -H "Content-Type: application/json" -d "@exito.json"
```

## Pruebas automáticas

Las pruebas se encuentran junto al código, dentro de `src/snailpay/`:

| Archivo                       | Qué cubre                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `snailpay.validation.test.ts` | Reglas de validación de cada campo                                               |
| `snailpay.service.test.ts`    | Pagos aprobados, rechazados, formato de valores generados y `buildFailedPayment` |
| `snailpay.api.test.ts`        | Endpoint completo con Supertest, incluyendo errores HTTP y `SNAILPAY_DOWN`       |
| `snailpay.fixtures.ts`        | Datos y helpers compartidos para las pruebas; no es una suite de pruebas         |

## Decisiones de diseño relevantes

* **Separación por capas:** rutas, controlador, validación, servicio y manejo global de errores tienen responsabilidades diferentes.
* **Resultado de validación tipado:** evita pasar directamente `req.body` a la lógica de negocio y permite aprovechar el narrowing de TypeScript.
* **`buildFailedPayment`:** centraliza la construcción de respuestas de error para mantener el contrato uniforme.
* **Valores seguros en respuestas incompletas:** `getStringValue` devuelve `""` y `getAmountValue` devuelve `0` cuando un campo no tiene el tipo esperado.
* **`SNAILPAY_DOWN`:** permite simular indisponibilidad del servicio sin modificar el código.
* **`trim()` durante la validación:** normaliza campos de texto antes de enviarlos al servicio.
* **JSON mal formado fuera del contrato:** se maneja mediante `errorHandler` porque no existe un cuerpo válido del cual obtener los campos de la transacción.
* **No se valida la vigencia real de la tarjeta:** se mantiene únicamente la validación de formato `MM/YY` para que las tarjetas de prueba no dependan de la fecha actual.
