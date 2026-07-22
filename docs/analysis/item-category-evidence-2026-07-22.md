# Item category evidence

Date: 2026-07-22

## Scope

The former item `category` field copied the root XML `type` attribute. In the canonical dataset that produced `unknown` for 506 of 763 active items and exposed numeric weapon class codes for the remaining 257. Those values were not useful detail labels or search facets.

The preserved application instead classifies items from their verified source shape. The rebuild now uses the same evidence boundary without copying its parser: weapon root type codes map to weapon classes; armour subtype and the `Orb`/`Tome` class override map to equipment categories; food recovery attributes distinguish food from booze; and trap, wand, potion, mushroom, gem, toolkit, and alchemical marker shapes map to their corresponding categories. A record with no recognized shape remains `item`. A non-numeric explicit type on an independently authored fixture or future mod remains a normalized fallback category rather than being discarded.

Stable artifact/search keys such as `weapon:sword` and `armour:chest` stay separate from display labels such as `Sword weapon` and `Chest armour`. This keeps shareable filter URLs deterministic while avoiding engine codes in the interface. Category derivation does not claim support for the other attributes inside partially supported weapon, armour, food, trap, wand, or potion declarations.

## Canonical measurement

The ignored `1.1.5 public_beta` artifact contains 31 meaningful categories across all 763 active items. No category is `unknown` or a bare numeric code.

| Family                        | Active items |
| ----------------------------- | -----------: |
| Weapon classes                |          257 |
| Armour slots, orbs, and tomes |          268 |
| Traps                         |           54 |
| Food and booze                |           49 |
| Reagents and toolkits         |           50 |
| Potions                       |           26 |
| Wands                         |           21 |
| Gems                          |           20 |
| Mushrooms                     |           12 |
| Generic items                 |            6 |

Weapon categories cover all nine measured source codes. Armour categories cover the ten measured slots plus the verified orb and tome overrides. The category in every generated item search document matches its normalized item record.

The deterministic canonical import remains at 0 errors, 3,278 warnings, and 71 informational duplicate decisions. Counts are unchanged because category derivation does not suppress the explicit diagnostics for other unmodeled content inside the same item declarations.

## Regression evidence

- The synthetic import checks a sword, chest armour, potion, trap, wand, and custom material fallback.
- Domain tests cover structured and custom display labels.
- Browser coverage selects `Sword weapon` with the keyboard, verifies the shareable `category=weapon%3Asword` URL, and follows the single matching item.
- Two canonical imports are byte-identical, and the full category/search cross-check reports no numeric, unknown, or mismatched categories.
