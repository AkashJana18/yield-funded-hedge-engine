export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCurrencyPrecise(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatSignedCurrency(value: number): string {
  const formatted = formatCurrencyPrecise(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatSignedPercent(value: number): string {
  const formatted = formatPercent(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}
