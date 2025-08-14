import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency
 * @param value - The number to format
 * @param currency - The currency code (default: 'USD')
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Calculates the percentage of a value relative to a total
 * @param value - The current value
 * @param total - The total value
 * @returns The percentage as a number between 0 and 100
 */
export function calculatePercentage(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, (value / total) * 100);
}

/**
 * Gets a color based on a percentage value
 * @param percentage - The percentage value
 * @param type - The type of color scale ('success' is inverted, 'danger' is normal)
 * @returns A CSS color class
 */
export function getColorByPercentage(percentage: number, type: 'success' | 'danger' = 'danger'): string {
  if (type === 'success') {
    // For success metrics (higher is better)
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  } else {
    // For danger metrics (lower is better)
    if (percentage <= 50) return 'bg-green-500';
    if (percentage <= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  }
}
