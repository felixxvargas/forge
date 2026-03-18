/**
 * Format large numbers with K and M suffixes
 * Examples:
 * 1234 -> 1.2K
 * 12345 -> 12.3K
 * 1234567 -> 1.2M
 */
export function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return '0';
  
  if (num < 1000) {
    return num.toString();
  }
  
  if (num < 1000000) {
    const formatted = (num / 1000).toFixed(1);
    // Remove trailing .0
    return formatted.endsWith('.0') ? formatted.slice(0, -2) + 'K' : formatted + 'K';
  }
  
  const formatted = (num / 1000000).toFixed(1);
  // Remove trailing .0
  return formatted.endsWith('.0') ? formatted.slice(0, -2) + 'M' : formatted + 'M';
}
