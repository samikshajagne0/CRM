/**
 * ASTURA CRM — Centralized Formatting Utilities
 * Handles safe data display with graceful fallbacks.
 */

/**
 * Formats a number as currency (INR, USD, GBP)
 */
export const formatCurrency = (amount, currency = 'INR') => {
  const num = Number(amount);
  if (isNaN(num)) return '--';
  
  const validCurrency = currency || 'INR';
  
  const locales = {
    INR: 'en-IN',
    USD: 'en-US',
    GBP: 'en-GB'
  };

  try {
    return new Intl.NumberFormat(locales[validCurrency] || 'en-IN', {
      style: 'currency',
      currency: validCurrency,
      maximumFractionDigits: 0
    }).format(num);
  } catch (e) {
    return `₹${num}`; // Ultimate fallback if currency code is still invalid
  }
};

/**
 * Formats a date string safely
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '--';
  
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

/**
 * Formats a time string safely
 */
export const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

/**
 * Safe string fallback
 */
export const formatLabel = (value) => {
  if (value === null || value === undefined || value === '') return '--';
  return value;
};

/**
 * Formats large numbers into Lakhs (L) or Crores (Cr) for Indian context
 */
export const formatAbbreviated = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return '₹0';
  
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`;
  return `₹${num.toLocaleString('en-IN')}`;
};
