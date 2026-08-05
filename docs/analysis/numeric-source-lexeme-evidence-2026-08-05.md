# Numeric source-lexeme evidence

Date: 2026-08-05

## Scope

The data pipeline now distinguishes the game's measured numeric token shapes
from the much larger set of strings accepted by JavaScript `Number()`. This is
input hardening only: normalized field meanings, fallbacks, diagnostics,
artifact schemas, and rendering are unchanged.

## Read-only canonical measurement

An aggregate scan of numeric-looking attributes in every database declared by
the ignored canonical four-source manifest found:

- 20,710 integer occurrences spanning 473 distinct values;
- 388 conventional decimal occurrences;
- 69 leading-dot decimal occurrences spanning 13 values;
- negative integers and leading-zero integers such as `02`;
- decimal spellings with retained fractional zeros such as `0.10` and `3.50`;
  and
- no exponent, radix-prefix, explicit-plus, trailing-dot, or negative-decimal
  source form.

One numeric-looking raw attribute has leading XML whitespace. The existing XML
adapter already normalizes that whitespace before any field normalizer receives
the token; the new numeric parser performs no further trimming. The broad scan
is a lexical upper bound rather than a claim that every numeric-looking source
attribute is currently modeled.

## Implemented grammar

The shared integer parser accepts an optional ASCII minus followed by one or
more ASCII digits and requires a safely representable integer. The finite-number
parser accepts that integer grammar plus complete digit/fraction and measured
leading-dot decimal forms, then requires a finite conversion. Optional minus
is available consistently for signed mod and future compatible source values.

Both reject JavaScript-only coercion forms: surrounding whitespace presented
directly to the parser, explicit plus, exponent and radix notation, trailing
dots, separators, locale commas, non-ASCII digits, incomplete tokens,
`Infinity`, `NaN`, unsafe integers, and numeric overflow. Field-specific bounds
continue to run after lexical conversion and retain existing `invalid_number`
fallback behavior.

## Verification

Direct unit coverage tests accepted and adversarial forms. A temporary legal
XML fixture then proves real item integer/decimal normalization accepts `02`,
`.5`, and `-2.75`, while `1e2`, `0x10`, `+2`, and `1.` produce four
source-located `invalid_number` diagnostics and safe fallback values.

The data-pipeline suite passes all 69 tests. The full repository gate passes all
193 unit/artifact tests, byte-identical synthetic generation, and the 43-page
synthetic static export. Read-only canonical generation remains byte-identical
with 763 items, 2,767 search documents, 0 errors, 43 warnings, and 71
informational duplicate decisions.

No official input, local installation path, or generated official derivative
is committed, and this measurement does not approve official-derived content
for publication.
