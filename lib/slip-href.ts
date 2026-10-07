export function slipHref(slipUrl: string) {
  const value = String(slipUrl || "").trim();
  if (!value) return "";
  if (value.startsWith("data:image/") || /^https?:\/\//i.test(value)) return value;
  const match = value.match(/\/api\/slip-photo\/([^/?#]+)/);
  if (match) return `/api/slip-photo?id=${encodeURIComponent(decodeURIComponent(match[1]))}`;
  if (value.startsWith("/api/slip-photo")) return value;
  return value;
}
