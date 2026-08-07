export function maskGpsIdentifier(value: string | null | undefined, visibleSuffix = 4) {
  if (!value) return "-";
  const suffixLength = Math.max(0, Math.min(visibleSuffix, value.length));
  const suffix = suffixLength === 0 ? "" : value.slice(-suffixLength);
  return `${"•".repeat(Math.max(4, value.length - suffixLength))}${suffix}`;
}
