export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} K`;
}

export function formatPercent(value: number): string {
  return `%${(value * 100).toFixed(1)}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return "az once";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dk once`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat once`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} gun once`;
  return formatDate(date);
}

export const CATEGORIES: Record<string, { label: string; color: string; emoji: string }> = {
  EKONOMI: { label: "Ekonomi", color: "emerald", emoji: "📊" },
  SIYASET: { label: "Siyaset", color: "blue", emoji: "🏛️" },
  GUNDEM: { label: "Gündem", color: "amber", emoji: "📰" },
  EGITIM: { label: "Egitim", color: "red", emoji: "🎓" },
  TEKNOLOJI: { label: "Teknoloji", color: "purple", emoji: "💻" },
  DUNYA: { label: "Dünya", color: "cyan", emoji: "🌍" },
};
