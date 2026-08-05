# Numeric source-lexeme contract

Status: implemented normalization contract

The XML adapter preserves attribute values as strings and performs its existing
XML whitespace normalization before normalizers inspect them. Numeric parsing
does not perform any additional trimming or use general JavaScript string
coercion.

## Integer tokens

A non-empty integer token must match:

```text
-?[0-9]+
```

It must also convert to a JavaScript safe integer. Leading zeros are retained
as an accepted source spelling but do not affect the normalized numeric value.
Examples include `0`, `02`, `473`, `-1`, and `-9999`.

## Finite-number tokens

A non-empty finite-number token must match:

```text
-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)
```

It must convert to a finite JavaScript number. This grammar includes integer
tokens, ordinary complete decimals such as `0.10` and `3.50`, leading-dot
decimals such as `.04`, and the corresponding negative forms required by
signed metadata. It does not accept a trailing decimal point.

## Rejected forms and bounds

Both parsers reject explicit plus signs, exponent notation, hexadecimal/binary
or octal prefixes, trailing dots, numeric separators, locale commas,
non-ASCII digits, `Infinity`, `NaN`, extra whitespace presented directly to
the numeric parser, incomplete tokens, and values outside the supported finite
or safe-integer representation.

Field-specific minimums and maximums remain a separate normalization step.
Missing or empty optional values retain their existing unavailable/default
semantics. A supplied token that fails either lexical, representation, or field
bounds validation emits the existing source-located `invalid_number`
diagnostic and uses that field's documented fallback or `null` value.

## Compatibility evidence

A broad read-only census of numeric-looking attributes across the four declared
canonical sources found 20,710 integer occurrences, 388 ordinary decimal
occurrences, and 69 leading-dot decimal occurrences. It found negative and
leading-zero integers, fractional trailing zeros, and leading-dot decimals; it
found no exponent, radix-prefix, explicit-plus, or trailing-dot form. One raw
attribute contains leading XML whitespace and continues through the adapter's
pre-existing whitespace normalization boundary.

The independently authored adversarial fixture verifies the strict grammar in
actual item normalization. The canonical zero-error generation gate remains
byte-identical, proving every currently normalized official numeric token is
compatible with this contract.
