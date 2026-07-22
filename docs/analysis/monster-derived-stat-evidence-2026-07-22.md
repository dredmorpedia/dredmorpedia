# Monster derived-stat evidence

Date: 2026-07-22

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`, Steam build `22934623`, base game plus all three official expansions

Implementation scope: six primary attributes only

## Decision

The monster page may calculate Burliness, Sagacity, Nimbleness, Caddishness, Stubbornness, and Savvy from the normalized fighter, rogue, and wizard source levels. Effective `primarybuff` modifiers are added by their numeric source ID after monster inheritance is resolved.

Life, Mana, Melee Power, Magic Power, critical chance, Haywire chance, dodge, block, counter, enemy dodge reduction, magic resistance, sneakiness, mundane melee damage, and other combat totals remain unavailable. The available historical sources conflict about offsets, minimums, coefficients, and even which primary attribute feeds some secondary values.

## Evidence used

- The preserved application maps all six primary attributes to the same fighter/rogue/wizard coefficient table in `legacy/js/dredmor-stat.js` and applies those formulas to monster `numFig`, `numRog`, and `numWiz` values in `legacy/js/monster.js`. This is the behavioral reference, not independent proof.
- The Dungeons of Dredmor Wiki [Stats table](https://dungeonsofdredmor.fandom.com/wiki/Stats) independently publishes the same six per-archetype coefficient rows.
- The independently maintained [Dungeons of Dredmor Quirks](https://cliffnordman.com/video_games/dungeons_of_dredmor/index.html) says its data was verified against version `1.1.4` with all three expansions and reports the same six coefficient rows. That is the closest documented runtime verification found to the canonical `1.1.5 public_beta` baseline.
- The Steam modding guide [Enter the Dredmod](https://steamcommunity.com/sharedfiles/filedetails/?id=197131896) documents monster `numFig`, `numRog`, and `numWiz` as fighter, rogue, and wizard levels and documents `primarybuff` as a numeric primary-stat modifier. Read-only inspection of the canonical installed XML confirms comments for the active ID mapping: `0` Burliness, `1` Sagacity, `2` Nimbleness, `3` Caddishness, `4` Stubbornness, and `5` Savvy.

The implemented formulas are therefore:

| Attribute    | Fighter | Rogue | Wizard |
| ------------ | ------: | ----: | -----: |
| Burliness    |       2 |     1 |      1 |
| Sagacity     |       1 |     1 |      2 |
| Nimbleness   |       1 |     2 |      1 |
| Caddishness  |       2 |     2 |      1 |
| Stubbornness |       2 |     1 |      2 |
| Savvy        |       1 |     2 |      2 |

For each row, `base = fighter × Fighter + rogue × Rogue + wizard × Wizard`; `total = base + matching effective primary modifier`.

## Why the scope stops here

The historical developer-hosted [New Dredmor Combat document](https://www.dgbaumgart.com/blog_img/gaslamp/combat%20stat%20calculation.pdf) agrees with the first three primary formulas but conflicts with later observed formulas for Caddishness, Stubbornness, and Savvy. It also disagrees with later references about generated Life, Mana, critical, and Haywire values. Other later references disagree among themselves about Life/Mana offsets and block/counter minimums. That document is useful evidence of formula evolution, but it is not safe as the sole source for current calculations.

The later `1.1.4` verification plus the independent Wiki table and current source-field semantics are sufficient for the primary coefficient table. They are not sufficient to choose among the disputed secondary rules. A later slice should use direct observation from the canonical build or another version-specific authoritative source before implementing those values.

Applying the scoped calculation to the ignored canonical artifact covers all 183 monsters. Eight monsters have 12 effective primary modifiers. Resulting totals range from 0–154 Burliness, 0–190 Sagacity, 0–140 Nimbleness, 0–173 Caddishness, 0–223 Stubbornness, and 0–209 Savvy. These aggregate measurements contain no names, source text, or local paths and do not authorize publication of the artifact.

## Verification contract

- Domain tests cover every coefficient and show that only matching primary modifiers affect totals.
- The synthetic child monster verifies a non-zero primary bonus in the browser: fighter `2` produces Nimbleness `2`, then source bonus `+1` produces `3`.
- The monster page labels these values as verified primary attributes and continues to state that disputed secondary totals are unavailable.
- No official XML, generated official artifact, absolute installation path, or downloaded research file is tracked.
