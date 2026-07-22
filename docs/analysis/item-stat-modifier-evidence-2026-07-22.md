# Item stat modifier evidence

Date: 2026-07-22
Status: implemented and verified against the ignored canonical dataset

## Scope and behavioral reference

The preserved application calls `Dredmor.Stat.ParseStats` for every item. That helper reads fixed damage from direct `<weapon>` and `<damagebuff>` elements, resistances from `<resistbuff>`, and numeric primary/secondary bonuses from `<primarybuff>` and `<secondarybuff>`. The rebuild now preserves those item-level declarations in a required deterministic `modifiers` array using the shared `damage`, `resistance`, `primary`, and `secondary` shape already used by abilities, buffs, encrustments, and monsters.

Fixed finite values remain source values rather than calculated combat totals. Numeric primary and secondary IDs remain explicit because the canonical build has no approved standalone stat-definition database. Modifier element names are matched case-insensitively, malformed numbers and missing/unknown keys remain diagnostics, and the web artifact boundary rejects incomplete or non-finite records.

The slice deliberately does not interpret damage-factor attributes such as the `*F` family or damage embedded in item `<effect>` declarations. Those need a richer scaling/effect model and remain covered by the existing partially-supported diagnostics. The broader `<weapon>` record also remains partially supported because its class, scaling, and other engine fields are not all represented by this change.

## Canonical aggregate measurement

Read-only import of the canonical base game plus all three expansions produces:

- 763 active items, of which 506 have at least one normalized modifier;
- 1,584 active modifier entries, with at most 12 on one item;
- 480 damage values from 1 through 50;
- 255 resistance values from -8 through 20;
- 122 primary values from -10 through 16; and
- 727 secondary values from -50 through 50.

One active item repeats the same secondary source ID. Both declarations are retained because the source and legacy parser retain both; this slice does not invent sum or last-declaration-wins semantics for item modifiers.

Supporting the four direct modifier-element families removes 599 former `unknown_element` diagnostics across active and overridden records: 290 `<secondarybuff>`, 165 `<resistbuff>`, 117 `<primarybuff>`, and 27 `<damagebuff>`. Fixed weapon damage came from records already diagnosed as partially supported, so normalizing it does not falsely mark the entire `<weapon>` shape complete.

The deterministic canonical import now completes with 0 errors, 3,278 warnings, and 71 informational duplicate decisions. Excluding the 15 separately tracked spell-requirement diagnostics, the measured item/spell compatibility backlog is 3,244 constructs: 911 item and 2,333 spell diagnostics. The 19 dangling references are unchanged.

## Product and search behavior

Item pages show linked synthetic named stats and source-defined direct modifiers as separate groups. Signed values use the same labels as other modifier-bearing entities, and a disclosure explains why numeric primary/secondary IDs are not fabricated into definitions. The explicit empty state covers items with neither shape.

Each modifier also contributes a collision-safe structured item-stat facet and searchable kind/key/value text. This makes official item-stat filtering useful even when the selected dataset contains no standalone stat definitions. The search artifact remains derived entirely from the normalized artifact and is verified by the web consumer.

## Verification

- Focused domain, importer, and web artifact tests pass, including camel-case aliases, fixed weapon damage, malformed numbers, missing/unknown modifier keys, and non-finite consumer data.
- Synthetic desktop/mobile Playwright flows display every modifier kind and keyboard-select a `Crushing damage` search facet.
- All 22 desktop/mobile browser tests pass, including representative axe scans.
- `pnpm check` passes the full format, lint, type, unit/integration, deterministic-generation, and synthetic production-build gate.
- `pnpm build:official` is byte-identical at 5,356,230 artifact bytes and 1,337,402 search bytes and exports all 2,824 official pages.
- Generated official derivatives remain ignored and non-public.
