const integerLexemePattern = /^-?[0-9]+$/u;
const finiteNumberLexemePattern = /^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/u;

export function parseSourceInteger(value: string): number | null {
  if (!integerLexemePattern.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseSourceNumber(value: string): number | null {
  if (!finiteNumberLexemePattern.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
