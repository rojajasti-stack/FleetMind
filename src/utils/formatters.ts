/**
 * Financial & General Formatters for FleetMind AI
 */

export function formatCurrency(amount: number, symbol: string = '₹'): string {
  if (isNaN(amount) || amount === null || amount === undefined) return `${symbol}0`;
  
  // Format with Indian grouping if symbol is INR / ₹
  if (symbol === '₹' || symbol === 'INR') {
    const isNegative = amount < 0;
    const absVal = Math.abs(amount).toFixed(0);
    const lastThree = absVal.substring(absVal.length - 3);
    const otherNumbers = absVal.substring(0, absVal.length - 3);
    const formatted = otherNumbers !== '' 
      ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree 
      : lastThree;
    return `${isNegative ? '-' : ''}₹${formatted}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount).replace('$', symbol);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatDistance(km: number): string {
  if (isNaN(km)) return '0 km';
  return `${Number(km).toLocaleString()} km`;
}

/**
 * Standard Amortization Formula for EMI calculation:
 * EMI = [P x R x (1+R)^N] / [(1+R)^N - 1]
 * where P = Principal, R = Monthly interest rate (Annual % / 12 / 100), N = Number of months
 */
export function calculateEmi(principal: number, annualInterestRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  
  // 0% interest loan
  if (annualInterestRate <= 0) {
    return Math.round(principal / months);
  }

  const monthlyRate = annualInterestRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, months);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(emi);
}
