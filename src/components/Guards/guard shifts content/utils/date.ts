// utilidades de fecha reutilizables
export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function isoToLocalDateKey(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoToLocalTime(iso?: string | null) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(iso);
  }
}
