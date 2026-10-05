import { useState } from "react";
import type { FormEvent, InputHTMLAttributes } from "react";
import { useAuthStore } from "../auth/authStore";
import { useWalletStore } from "./wallet.store";
import { mapServerErrors, parseAmount, validateTopUpForm } from "./topUpForm.validation";
import type { TopUpFormErrors, TopUpFormValues } from "./topUpForm.validation";

interface Feedback {
  tone: "success" | "error";
  text: string;
}

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "onChange"> {
  label: string;
  name: keyof TopUpFormValues;
  value: string;
  error?: string;
  onValueChange: (field: keyof TopUpFormValues, value: string) => void;
}

function TextField({
  label,
  name,
  value,
  error,
  onValueChange,
  ...inputProps
}: TextFieldProps) {
  const id = `topup-${name}`;
  const errorId = `${id}-error`;

  return (
    <div className="topup-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onValueChange(name, event.target.value)}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="topup-field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function TopUpForm() {
  const user = useAuthStore((state) => state.user);
  const topUp = useWalletStore((state) => state.topUp);
  const isTopUpInProgress = useWalletStore((state) => state.isTopUpInProgress);

  // Precarga solo el número de tarjeta guardado. El CVV nunca se rellena solo.
  const [values, setValues] = useState<TopUpFormValues>(() => ({
    cardNumber: useWalletStore.getState().cardNumber,
    expirationDate: "",
    cvv: "",
    cardholderName: "",
    amount: "",
  }));
  const [errors, setErrors] = useState<TopUpFormErrors>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  function handleValueChange(field: keyof TopUpFormValues, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    // Al editar un campo se quita su error, venga del cliente o del servidor.
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // El store también comprueba esto: aquí solo se evita trabajo inútil.
    if (isTopUpInProgress) {
      return;
    }

    setFeedback(null);

    if (!user) {
      setFeedback({
        tone: "error",
        text: "Tu sesión no está activa. Inicia sesión de nuevo.",
      });
      return;
    }

    const normalized: TopUpFormValues = {
      ...values,
      expirationDate: values.expirationDate.trim(),
      cvv: values.cvv.trim(),
      cardholderName: values.cardholderName.trim(),
    };

    const clientErrors = validateTopUpForm(normalized);
    setErrors(clientErrors);

    const amount = parseAmount(normalized.amount);

    if (Object.keys(clientErrors).length > 0 || amount === null) {
      return;
    }

    const result = await topUp({
      card_number: normalized.cardNumber,
      expiration_date: normalized.expirationDate,
      cvv: normalized.cvv,
      cardholder_name: normalized.cardholderName,
      amount,
      payer_id: String(user.id),
      payer_email: user.email,
    });

    if (result.kind === "approved") {
      setFeedback({ tone: "success", text: result.message });
      // Se limpian el CVV y el monto; la tarjeta ya quedó guardada en el store.
      setValues((previous) => ({ ...previous, cvv: "", amount: "" }));
      setErrors({});
      return;
    }

    // Con datos inválidos el servidor indica qué campos fallaron.
    if (result.kind === "rejected") {
      setErrors(mapServerErrors(result.fieldErrors));
    }

    setFeedback({ tone: "error", text: result.message });
  }

  return (
    <form
      className="topup-form"
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      aria-label="Recargar saldo"
    >
      <TextField
        label="Número de tarjeta"
        name="cardNumber"
        value={values.cardNumber}
        error={errors.cardNumber}
        onValueChange={handleValueChange}
        autoComplete="cc-number"
        inputMode="numeric"
      />
      <TextField
        label="Vencimiento"
        name="expirationDate"
        value={values.expirationDate}
        error={errors.expirationDate}
        onValueChange={handleValueChange}
        placeholder="MM/YY"
        autoComplete="cc-exp"
        inputMode="numeric"
        maxLength={5}
      />
      <TextField
        label="CVV"
        name="cvv"
        type="password"
        value={values.cvv}
        error={errors.cvv}
        onValueChange={handleValueChange}
        autoComplete="cc-csc"
        inputMode="numeric"
      />
      <TextField
        label="Nombre del titular"
        name="cardholderName"
        value={values.cardholderName}
        error={errors.cardholderName}
        onValueChange={handleValueChange}
        autoComplete="cc-name"
      />
      <TextField
        label="Monto"
        name="amount"
        value={values.amount}
        error={errors.amount}
        onValueChange={handleValueChange}
        placeholder="150.50"
        inputMode="decimal"
        autoComplete="off"
      />

      <button
        type="submit"
        className="topup-submit-button"
        disabled={isTopUpInProgress}
      >
        {isTopUpInProgress ? "Procesando..." : "Recargar"}
      </button>

      {feedback && (
        <p
          className={`topup-feedback topup-feedback--${feedback.tone}`}
          role={feedback.tone === "success" ? "status" : "alert"}
        >
          {feedback.text}
        </p>
      )}
    </form>
  );
}
