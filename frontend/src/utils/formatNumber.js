// Global numeric formatting: no thousand separators, no trailing zeros,
// dot as decimal separator, up to 3 decimals for non-integers.
export function formatNumber(value, digits = 3) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  // Plain integer or small numbers
  if (Number.isInteger(num)) return String(num);
  const fixed = num.toFixed(digits).replace(/\.?0+$/, "");
  return fixed;
}
