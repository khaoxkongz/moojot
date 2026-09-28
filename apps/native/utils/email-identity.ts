const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !emailPattern.test(email)) throw new Error("กรุณาใส่อีเมลให้ถูกต้อง");
  return email;
}
