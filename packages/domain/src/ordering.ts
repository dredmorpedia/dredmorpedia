/**
 * Compares strings by their UTF-16 code units.
 *
 * Unlike locale-aware collation, this order is fixed by ECMAScript and does
 * not change with the host's ICU/CLDR data. Use it for generated artifacts
 * and other persisted deterministic output, not for user-facing alphabetical
 * presentation.
 */
export function compareCodeUnits(left: string, right: string): -1 | 0 | 1 {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
