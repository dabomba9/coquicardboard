// Minimal RFC-4180-ish CSV builder for client-side exports (collection, etc.).

/** Quote a single field when it contains a comma, quote, or newline; double internal quotes. */
function escapeField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV string from a header row + data rows. Rows use CRLF line endings. */
export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeField).join(","));
  return lines.join("\r\n");
}
