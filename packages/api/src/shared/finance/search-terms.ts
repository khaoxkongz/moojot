/**
 * How a search term matches an entry's amount, shared by the Ledger's search and the app's highlights so both agree.
 * The amount is written as the app shows it, without the commas: "419", "1250.50" (satang only when there are some).
 * A term of digits, with commas and at most one decimal point, matches when it appears anywhere in that text, so "419"
 * finds 419 and 4,190, and "1,250" finds 1,250.50. It is never an exact-amount match.
 */
export function amountSearchDigits(term: string): string | null {
  const bare = term.trim().replace(/,/g, "");
  return /^\d+(\.\d*)?$/.test(bare) ? bare : null;
}

export function amountSearchText(amountSatang: number): string {
  const whole = Math.floor(amountSatang / 100);
  const satang = amountSatang % 100;
  return satang === 0 ? String(whole) : `${whole}.${String(satang).padStart(2, "0")}`;
}

export function matchesAmountSearch(term: string, amountSatang: number): boolean {
  const digits = amountSearchDigits(term);
  return digits !== null && amountSearchText(amountSatang).includes(digits);
}
