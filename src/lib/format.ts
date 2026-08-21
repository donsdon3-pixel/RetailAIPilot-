/**
 * Centralized Currency Formatting Utility for RetailPilot AI
 * Formats monetary amounts in Indian Rupees (₹ / INR) using the Indian English (en-IN) locale.
 * Desired display format: ₹1,234.56
 */
export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return `${CURRENCY_SYMBOL}0.00`;
  }
  const numericAmount = Number(amount);
  return `${CURRENCY_SYMBOL}${numericAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
