const CURRENCY_FORMATTER = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

// 100.5 -> "$100.50"
export function formatMoney(amount: number): string {
  return CURRENCY_FORMATTER.format(amount);
}
