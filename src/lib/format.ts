export function formatINR(value: number, options?: { maximumFractionDigits?: number }) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: options?.maximumFractionDigits === 0 ? 0 : 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatQty(value: number) {
  return `${new Intl.NumberFormat('en-IN').format(Number.isFinite(value) ? value : 0)} pcs`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(Number.isFinite(value) ? value : 0);
}
