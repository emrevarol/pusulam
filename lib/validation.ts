// Input validation & sanitization utilities

const VALID_CATEGORIES = [
  "EKONOMI",
  "SIYASET",
  "TEKNOLOJI",
  "GUNDEM",
  "DUNYA",
  "EGITIM",
] as const;

export type ValidCategory = (typeof VALID_CATEGORIES)[number];

export function isValidCategory(cat: string): cat is ValidCategory {
  return VALID_CATEGORIES.includes(cat as ValidCategory);
}

// Strip HTML tags to prevent stored XSS
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

// Email validation (RFC 5322 simplified)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

// Password strength validation
export function validatePassword(password: string): string | null {
  if (typeof password !== "string") return "Geçersiz şifre.";
  if (password.length < 8) return "Şifre en az 8 karakter olmalıdır.";
  if (password.length > 128) return "Şifre en fazla 128 karakter olabilir.";
  if (!/[a-z]/.test(password)) return "Şifre en az bir küçük harf içermelidir.";
  if (!/[A-Z]/.test(password)) return "Şifre en az bir büyük harf içermelidir.";
  if (!/[0-9]/.test(password)) return "Şifre en az bir rakam içermelidir.";
  return null; // valid
}

// String length validation helper
export function validateLength(
  value: string,
  field: string,
  min: number,
  max: number
): string | null {
  if (value.length < min) return `${field} en az ${min} karakter olmalıdır.`;
  if (value.length > max) return `${field} en fazla ${max} karakter olabilir.`;
  return null;
}

// Validate resolution date
export function validateResolutionDate(dateStr: string): string | null {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Geçersiz tarih formatı.";
  if (date <= new Date()) return "Bitiş tarihi gelecekte olmalıdır.";
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 2);
  if (date > maxDate) return "Bitiş tarihi en fazla 2 yıl ilerisi olabilir.";
  return null;
}
