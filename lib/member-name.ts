export function displayName(name: unknown, account: string) {
  const given = String(name || "").trim();
  if (given) return given;
  const acc = String(account || "").trim();
  if (acc.includes("@")) {
    const local = acc.split("@")[0].replace(/[._+-]+/g, " ").trim();
    if (!local) return acc;
    return local.replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return acc || "Member";
}
