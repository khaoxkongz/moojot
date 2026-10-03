const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when the trimmed, lowercased text can be an account email. */
export function isValidEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  return email.length <= 254 && emailPattern.test(email);
}

export function normalizeEmail(value: string): string {
  if (!isValidEmail(value)) throw new Error("กรุณาใส่อีเมลให้ถูกต้อง");
  return value.trim().toLowerCase();
}
